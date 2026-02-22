import { Request, Response } from "express";
import { request } from "undici";
import { chat } from "./client.js";
import { cfg } from "../config.js";
import {
    addObjectiveProgressSignal,
    addAction,
    addFinding,
    addThought,
    createSession,
    getSessionContext,
    getLatestSession,
    getSession,
    listReports,
    resetRedTeamStoreForTests,
    RuntimeSnapshot,
    setSessionState,
    upsertSessionAsset,
    upsertSessionObservation,
    upsertSessionRelation,
    updateSession,
} from "./report-store.js";
import { executeToolStep, resetToolExecutorForTests, stopAllActiveExperiments, ToolAction, ToolExecutionResult } from "../tool-executor.js";
import { logger } from "../logger.js";

const ALL_TOOLS: ToolAction[] = ["cluster.attack", "chaos.cpu", "chaos.memory", "mtd.rotate", "delay", "chaos.crash"];
const DEFAULT_ALLOWED_TOOLS: ToolAction[] = ["cluster.attack", "chaos.cpu", "chaos.memory", "mtd.rotate", "delay"];
const BLOCKED_ATTACK_PREFIXES = ["/api/redteam", "/api/simulator", "/api/attackers", "/cluster", "/chaos", "/scenarios", "/proxy", "/tarpit", "/blackhole", "/deception"];

interface Decision {
    thought: string;
    reason: string;
    tool: ToolAction | "none";
    params: Record<string, unknown>;
    rawModelOutput: string;
}

interface SessionControl {
    sessionId: string;
    stopRequested: boolean;
    killRequested: boolean;
    baseUrl: string;
    objective: string;
    intervalMs: number;
    maxIterations: number;
    allowedTools: ToolAction[];
}

interface VerificationSummary {
    broken: boolean;
    crashDetected: boolean;
    newServerErrors: number;
    notes: string;
}

interface PlannerMemorySummary {
    totals: {
        assets: number;
        observations: number;
        relations: number;
    };
    recentAssets: Array<{
        type: string;
        value: string;
        source: string;
        confidence: number;
    }>;
    recentObservations: Array<{
        kind: string;
        source: string;
        summary: string;
    }>;
    recentRelations: Array<{
        type: string;
        from: string;
        to: string;
    }>;
    objectiveProgress: {
        preconditionsMet: string[];
        openedPaths: string[];
        breakSignals: string[];
    };
}

const MEMORY_PROMPT_LIMITS = {
    assets: 8,
    observations: 8,
    relations: 8,
    progressSignals: 8,
    textLength: 160,
} as const;

let activeControl: SessionControl | null = null;
let startingSession = false;

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(num)));
}

function normalizeBaseUrl(value: unknown, fallback: string) {
    const fallbackUrl = new URL(fallback);
    const normalizedFallback = `${fallbackUrl.protocol}//${fallbackUrl.host}`;

    if (typeof value !== "string" || !value.trim()) return fallback;
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;
        // Guardrail: autopilot may only target the same origin as the current server.
        if (parsed.origin !== fallbackUrl.origin) return normalizedFallback;
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return normalizedFallback;
    }
}

function getServerOrigin(req: Request) {
    const protocol = req.protocol === "https" ? "https" : "http";
    const port = req.socket.localPort || cfg.portHttp1;
    return `${protocol}://127.0.0.1:${port}`;
}

function extractJsonObject(text: string) {
    const trimmed = text.trim();
    if (trimmed.startsWith("{")) return trimmed;

    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch && fencedMatch[1]) return fencedMatch[1].trim();

    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    return objectMatch ? objectMatch[0] : "";
}

function buildUrl(baseUrl: string, path: string) {
    return new URL(path, `${baseUrl}/`).toString();
}

function parsePrometheusMetrics(raw: string) {
    let requestCount = 0;
    let errorCount = 0;
    let latencySum = 0;
    let latencyCount = 0;

    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        if (trimmed.startsWith("echo_http_requests_total")) {
            const value = Number(trimmed.split(" ").pop() || 0);
            if (Number.isFinite(value)) requestCount += value;

            const statusMatch = trimmed.match(/status_code="(\d{3})"/);
            if (statusMatch && statusMatch[1]?.startsWith("5") && Number.isFinite(value)) {
                errorCount += value;
            }
        }

        if (trimmed.startsWith("echo_http_request_duration_seconds_sum")) {
            const value = Number(trimmed.split(" ").pop() || 0);
            if (Number.isFinite(value)) latencySum += value;
        }

        if (trimmed.startsWith("echo_http_request_duration_seconds_count")) {
            const value = Number(trimmed.split(" ").pop() || 0);
            if (Number.isFinite(value)) latencyCount += value;
        }
    }

    return {
        requestCount,
        errorCount,
        avgLatencyMs: latencyCount > 0 ? (latencySum / latencyCount) * 1000 : 0,
    };
}

async function getHealthStatus(baseUrl: string) {
    try {
        const { statusCode } = await request(buildUrl(baseUrl, "/healthz"), {
            method: "GET",
            headersTimeout: 2500,
            bodyTimeout: 2500,
        });
        return statusCode === 200;
    } catch {
        return false;
    }
}

async function captureRuntimeSnapshot(baseUrl: string, previous?: RuntimeSnapshot): Promise<RuntimeSnapshot> {
    const metricsResponse = await request(buildUrl(baseUrl, "/metrics"), {
        method: "GET",
        headersTimeout: 2500,
        bodyTimeout: 2500,
    });
    const metricsRaw = await metricsResponse.body.text();
    if (metricsResponse.statusCode !== 200) {
        throw new Error(`Metrics endpoint returned ${metricsResponse.statusCode}`);
    }

    const sysInfoResponse = await request(buildUrl(baseUrl, "/sysinfo"), {
        method: "GET",
        headersTimeout: 2500,
        bodyTimeout: 2500,
    });
    const sysInfoRaw = await sysInfoResponse.body.text();
    if (sysInfoResponse.statusCode !== 200) {
        throw new Error(`Sysinfo endpoint returned ${sysInfoResponse.statusCode}`);
    }

    const healthy = await getHealthStatus(baseUrl);

    let sysInfo: {
        cpus?: number;
        loadavg?: number[];
        memory?: { total?: number; free?: number };
    };
    try {
        sysInfo = JSON.parse(sysInfoRaw) as {
            cpus?: number;
            loadavg?: number[];
            memory?: { total?: number; free?: number };
        };
    } catch {
        throw new Error("Sysinfo endpoint returned invalid JSON");
    }

    const parsedMetrics = parsePrometheusMetrics(metricsRaw);

    const now = Date.now();
    const previousAt = previous ? Date.parse(previous.capturedAt) : 0;
    const elapsedSeconds = previousAt > 0 ? Math.max(0.001, (now - previousAt) / 1000) : 0;
    const requestDelta = previous ? Math.max(0, parsedMetrics.requestCount - previous.requestCount) : 0;

    const totalMemory = Number(sysInfo.memory?.total || 0);
    const freeMemory = Number(sysInfo.memory?.free || 0);
    const cpuCount = Math.max(1, Number(sysInfo.cpus || 1));
    const loadAverage = Array.isArray(sysInfo.loadavg) ? Number(sysInfo.loadavg[0] || 0) : 0;

    const cpuPercent = Math.max(0, Math.min(100, (loadAverage / cpuCount) * 100));
    const memPercent = totalMemory > 0
        ? Math.max(0, Math.min(100, ((totalMemory - freeMemory) / totalMemory) * 100))
        : 0;

    return {
        capturedAt: new Date(now).toISOString(),
        rps: elapsedSeconds > 0 ? requestDelta / elapsedSeconds : 0,
        requestCount: parsedMetrics.requestCount,
        errorCount: parsedMetrics.errorCount,
        errorRate: parsedMetrics.requestCount > 0 ? parsedMetrics.errorCount / parsedMetrics.requestCount : 0,
        avgLatencyMs: parsedMetrics.avgLatencyMs,
        cpuPercent,
        memPercent,
        healthy,
    };
}

function pickTargetPath(objective: string) {
    const pathMatch = objective.match(/\/[a-zA-Z0-9/_-]*/);
    if (pathMatch && pathMatch[0] && isSafeAttackPath(pathMatch[0])) return pathMatch[0];
    return "/echo";
}

function isSafeAttackPath(pathname: string) {
    if (!pathname.startsWith("/")) return false;
    return !BLOCKED_ATTACK_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function parseTargetPath(value: unknown) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const parsed = new URL(value);
        if (!isSafeAttackPath(parsed.pathname)) return null;
        return parsed.pathname;
    } catch {
        return null;
    }
}

function truncateText(value: string, maxLength: number) {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 3)}...`;
}

function lastItems<T>(items: T[], max: number) {
    if (items.length <= max) return [...items];
    return items.slice(items.length - max);
}

function buildPlannerMemorySummary(sessionId: string): PlannerMemorySummary | null {
    const context = getSessionContext(sessionId);
    if (!context) return null;

    return {
        totals: {
            assets: context.assets.length,
            observations: context.observations.length,
            relations: context.relations.length,
        },
        recentAssets: lastItems(context.assets, MEMORY_PROMPT_LIMITS.assets).map((asset) => ({
            type: asset.type,
            value: truncateText(asset.value, MEMORY_PROMPT_LIMITS.textLength),
            source: asset.source,
            confidence: Number(asset.confidence.toFixed(2)),
        })),
        recentObservations: lastItems(context.observations, MEMORY_PROMPT_LIMITS.observations).map((item) => ({
            kind: item.kind,
            source: item.source,
            summary: truncateText(item.summary, MEMORY_PROMPT_LIMITS.textLength),
        })),
        recentRelations: lastItems(context.relations, MEMORY_PROMPT_LIMITS.relations).map((relation) => ({
            type: relation.type,
            from: truncateText(relation.fromAssetId, MEMORY_PROMPT_LIMITS.textLength),
            to: truncateText(relation.toAssetId, MEMORY_PROMPT_LIMITS.textLength),
        })),
        objectiveProgress: {
            preconditionsMet: lastItems(context.objectiveProgress.preconditionsMet, MEMORY_PROMPT_LIMITS.progressSignals),
            openedPaths: lastItems(context.objectiveProgress.openedPaths, MEMORY_PROMPT_LIMITS.progressSignals),
            breakSignals: lastItems(context.objectiveProgress.breakSignals, MEMORY_PROMPT_LIMITS.progressSignals),
        },
    };
}

function composePlannerPayload(control: SessionControl, snapshot: RuntimeSnapshot, iteration: number, memory: PlannerMemorySummary | null) {
    return {
        objective: control.objective,
        iteration,
        telemetry: snapshot,
        guardrails: {
            allowedTools: control.allowedTools,
            forbidCrashByDefault: !control.allowedTools.includes("chaos.crash"),
        },
        memory,
    };
}

function shouldPauseForBreakSignals(memory: PlannerMemorySummary | null) {
    return (memory?.objectiveProgress.breakSignals.length || 0) > 0;
}

function safeCaptureMemory(sessionId: string, phase: "act" | "verify", callback: () => void) {
    try {
        callback();
    } catch (error: any) {
        logger.warn({ sessionId, phase, error: error?.message || "unknown error" }, "Autopilot memory capture failed");
    }
}

function captureActionMemory(args: {
    sessionId: string;
    iteration: number;
    objective: string;
    decision: Decision;
    execution?: ToolExecutionResult;
}) {
    const objectivePath = pickTargetPath(args.objective);
    const objectiveAsset = upsertSessionAsset(args.sessionId, {
        type: "endpoint",
        value: objectivePath,
        source: "objective",
        confidence: 0.7,
        metadata: { iteration: args.iteration },
    });
    addObjectiveProgressSignal(args.sessionId, "openedPaths", objectivePath);

    if (args.decision.tool === "none") {
        upsertSessionObservation(args.sessionId, {
            kind: "system",
            source: "planner",
            summary: `Iteration ${args.iteration}: no tool selected`,
            details: {
                iteration: args.iteration,
                reason: args.decision.reason,
            },
        });
        return;
    }

    const summary = args.execution
        ? (args.execution.ok ? args.execution.message : `Tool failed: ${args.execution.message}`)
        : `Tool selected: ${args.decision.tool}`;

    upsertSessionObservation(args.sessionId, {
        kind: "tool-output",
        source: args.decision.tool,
        summary,
        details: {
            iteration: args.iteration,
            ok: args.execution?.ok ?? true,
            reason: args.decision.reason,
            params: args.decision.params,
            error: args.execution?.error,
        },
    });

    if (args.decision.tool === "cluster.attack") {
        const targetPath = parseTargetPath(args.decision.params.target);
        if (targetPath) {
            const targetAsset = upsertSessionAsset(args.sessionId, {
                type: "endpoint",
                value: targetPath,
                source: "cluster.attack",
                confidence: 0.8,
                metadata: {
                    iteration: args.iteration,
                    target: args.decision.params.target,
                },
            });
            if (objectiveAsset?.id && targetAsset?.id) {
                upsertSessionRelation(args.sessionId, {
                    type: "targets",
                    fromAssetId: objectiveAsset.id,
                    toAssetId: targetAsset.id,
                    source: "cluster.attack",
                    confidence: 0.7,
                    metadata: { iteration: args.iteration },
                });
            }
        }
    }

    if (args.execution && !args.execution.ok) {
        addObjectiveProgressSignal(args.sessionId, "breakSignals", `tool-failure:${args.decision.tool}`);
        upsertSessionAsset(args.sessionId, {
            type: "indicator",
            value: `tool-failure:${args.decision.tool}`,
            source: args.decision.tool,
            confidence: 0.8,
            metadata: {
                iteration: args.iteration,
                message: args.execution.message,
            },
        });
    }
}

function captureVerificationMemory(args: {
    sessionId: string;
    iteration: number;
    objective: string;
    verification: VerificationSummary;
    after: RuntimeSnapshot;
}) {
    const objectivePath = pickTargetPath(args.objective);
    const objectiveAsset = upsertSessionAsset(args.sessionId, {
        type: "endpoint",
        value: objectivePath,
        source: "objective",
        confidence: 0.7,
        metadata: { iteration: args.iteration },
    });

    upsertSessionObservation(args.sessionId, {
        kind: "verification",
        source: "verification",
        summary: args.verification.notes,
        details: {
            iteration: args.iteration,
            broken: args.verification.broken,
            crashDetected: args.verification.crashDetected,
            newServerErrors: args.verification.newServerErrors,
            telemetry: {
                rps: args.after.rps,
                errorRate: args.after.errorRate,
                avgLatencyMs: args.after.avgLatencyMs,
            },
        },
    });

    if (args.verification.crashDetected) {
        const crashAsset = upsertSessionAsset(args.sessionId, {
            type: "indicator",
            value: "service-health-check-failed",
            source: "verification",
            confidence: 0.95,
            metadata: { iteration: args.iteration },
        });
        addObjectiveProgressSignal(args.sessionId, "breakSignals", "service-health-check-failed");
        if (objectiveAsset?.id && crashAsset?.id) {
            upsertSessionRelation(args.sessionId, {
                type: "confirms",
                fromAssetId: objectiveAsset.id,
                toAssetId: crashAsset.id,
                source: "verification",
                confidence: 0.9,
                metadata: { iteration: args.iteration },
            });
        }
    }

    if (args.verification.newServerErrors > 0) {
        const errorAsset = upsertSessionAsset(args.sessionId, {
            type: "vuln",
            value: `new-5xx-errors:${args.verification.newServerErrors}`,
            source: "verification",
            confidence: 0.85,
            metadata: {
                iteration: args.iteration,
                newServerErrors: args.verification.newServerErrors,
            },
        });
        addObjectiveProgressSignal(args.sessionId, "breakSignals", `new-5xx-errors:${args.verification.newServerErrors}`);
        if (objectiveAsset?.id && errorAsset?.id) {
            upsertSessionRelation(args.sessionId, {
                type: "escalates_to",
                fromAssetId: objectiveAsset.id,
                toAssetId: errorAsset.id,
                source: "verification",
                confidence: 0.85,
                metadata: { iteration: args.iteration },
            });
        }
    }

    if (args.verification.broken) {
        addObjectiveProgressSignal(args.sessionId, "breakSignals", args.verification.notes);
    } else {
        addObjectiveProgressSignal(args.sessionId, "preconditionsMet", "no-break-detected");
    }
}

function fallbackDecision(snapshot: RuntimeSnapshot, control: SessionControl, iteration: number): Decision {
    const attackTarget = buildUrl(control.baseUrl, pickTargetPath(control.objective));

    if (!snapshot.healthy || snapshot.errorRate > 0.05) {
        return {
            thought: "System health is degraded or errors are rising. Stabilize briefly before the next move.",
            reason: "Safety pause after instability",
            tool: control.allowedTools.includes("delay") ? "delay" : "none",
            params: { duration: 1200 },
            rawModelOutput: "fallback:degraded",
        };
    }

    if (snapshot.avgLatencyMs < 400 && control.allowedTools.includes("cluster.attack")) {
        return {
            thought: "Latency is still low. Increase pressure with a larger request flood.",
            reason: "Escalate traffic until latency or errors rise",
            tool: "cluster.attack",
            params: {
                target: attackTarget,
                rate: Math.min(1200, 150 + iteration * 120),
            },
            rawModelOutput: "fallback:cluster_attack",
        };
    }

    if (snapshot.cpuPercent < 85 && control.allowedTools.includes("chaos.cpu")) {
        return {
            thought: "CPU headroom remains. Inject a focused CPU spike.",
            reason: "Probe compute resilience",
            tool: "chaos.cpu",
            params: { duration: 4000 },
            rawModelOutput: "fallback:cpu",
        };
    }

    if (snapshot.memPercent < 85 && control.allowedTools.includes("chaos.memory")) {
        return {
            thought: "Memory usage is still moderate. Allocate additional memory pressure.",
            reason: "Probe memory resilience",
            tool: "chaos.memory",
            params: { action: "allocate", amount: 128 },
            rawModelOutput: "fallback:memory",
        };
    }

    return {
        thought: "No strong escalation signal available. Waiting for more telemetry.",
        reason: "No-op wait",
        tool: control.allowedTools.includes("delay") ? "delay" : "none",
        params: { duration: 1000 },
        rawModelOutput: "fallback:delay",
    };
}

function sanitizeDecision(candidate: Decision, control: SessionControl): Decision {
    let nextTool: Decision["tool"] = candidate.tool;

    if (nextTool !== "none" && !control.allowedTools.includes(nextTool)) {
        nextTool = control.allowedTools.includes("delay") ? "delay" : control.allowedTools[0] || "none";
    }

    const nextParams = { ...candidate.params };

    if (nextTool === "cluster.attack") {
        const fallbackTarget = buildUrl(control.baseUrl, pickTargetPath(control.objective));
        let target = fallbackTarget;
        if (typeof nextParams.target === "string") {
            try {
                const parsedTarget = new URL(nextParams.target);
                const parsedBase = new URL(control.baseUrl);
                if (parsedTarget.origin === parsedBase.origin && isSafeAttackPath(parsedTarget.pathname)) {
                    target = parsedTarget.toString();
                }
            } catch {
                target = fallbackTarget;
            }
        }
        const rate = clampNumber(nextParams.rate, 150, 1, 2000);
        return { ...candidate, tool: nextTool, params: { target, rate } };
    }

    if (nextTool === "chaos.cpu") {
        const duration = clampNumber(nextParams.duration, 5000, 250, 120000);
        return { ...candidate, tool: nextTool, params: { duration } };
    }

    if (nextTool === "chaos.memory") {
        const action = nextParams.action === "clear" ? "clear" : "allocate";
        const amount = clampNumber(nextParams.amount, 128, 1, 8192);
        return { ...candidate, tool: nextTool, params: { action, amount } };
    }

    if (nextTool === "mtd.rotate") {
        const prefix = typeof nextParams.prefix === "string" ? nextParams.prefix : `rt${Date.now().toString(36).slice(-4)}`;
        return { ...candidate, tool: nextTool, params: { prefix } };
    }

    if (nextTool === "delay") {
        const duration = clampNumber(nextParams.duration, 1000, 10, 120000);
        return { ...candidate, tool: nextTool, params: { duration } };
    }

    if (nextTool === "chaos.crash") {
        const delayMs = clampNumber(nextParams.delayMs, 1000, 100, 30000);
        return { ...candidate, tool: nextTool, params: { delayMs } };
    }

    return { ...candidate, tool: "none", params: {} };
}

async function decideNextAction(
    control: SessionControl,
    snapshot: RuntimeSnapshot,
    iteration: number,
    memory: PlannerMemorySummary | null
): Promise<Decision> {
    const fallback = fallbackDecision(snapshot, control, iteration);

    if (shouldPauseForBreakSignals(memory)) {
        return sanitizeDecision({
            thought: "Prior break signals were already detected. Pause briefly before further escalation.",
            reason: "Session memory indicates break conditions",
            tool: control.allowedTools.includes("delay") ? "delay" : "none",
            params: { duration: 750 },
            rawModelOutput: "memory:break-signals",
        }, control);
    }

    const systemPrompt = [
        "You are an autonomous reliability red-team strategist.",
        "Choose one tool action based on telemetry and objective.",
        "Output only strict JSON with keys: thought, reason, tool, params.",
        `Allowed tools: ${control.allowedTools.join(", ")}`,
        "tool must be one of allowed tools or 'none'.",
    ].join(" ");

    const userPrompt = JSON.stringify(composePlannerPayload(control, snapshot, iteration, memory));

    try {
        const response = await chat(`autopilot-${control.sessionId}`, systemPrompt, userPrompt);
        const jsonText = extractJsonObject(response);
        if (!jsonText) {
            return fallback;
        }

        const parsed = JSON.parse(jsonText) as {
            thought?: string;
            reason?: string;
            tool?: string;
            params?: Record<string, unknown>;
        };

        const candidate: Decision = {
            thought: typeof parsed.thought === "string" ? parsed.thought : fallback.thought,
            reason: typeof parsed.reason === "string" ? parsed.reason : fallback.reason,
            tool: (typeof parsed.tool === "string" ? parsed.tool : fallback.tool) as Decision["tool"],
            params: typeof parsed.params === "object" && parsed.params !== null ? parsed.params : fallback.params,
            rawModelOutput: response,
        };

        return sanitizeDecision(candidate, control);
    } catch {
        return fallback;
    }
}

function summarizeVerification(base: {
    before: RuntimeSnapshot;
    after: RuntimeSnapshot;
    healthAfter: boolean;
}): VerificationSummary {
    const newErrors = Math.max(0, base.after.errorCount - base.before.errorCount);
    const crashDetected = !base.healthAfter;
    const broken = crashDetected || newErrors > 0;

    const notes = crashDetected
        ? "Service health check failed after action."
        : newErrors > 0
            ? `Observed ${newErrors} new 5xx errors after action.`
            : "No crash or new 5xx errors observed.";

    return {
        broken,
        crashDetected,
        newServerErrors: newErrors,
        notes,
    };
}

function parseAllowedTools(input: unknown, forbidCrash = true): ToolAction[] {
    const candidate = Array.isArray(input)
        ? input.filter((tool): tool is ToolAction => typeof tool === "string" && ALL_TOOLS.includes(tool as ToolAction))
        : [...DEFAULT_ALLOWED_TOOLS];

    const deduped = Array.from(new Set(candidate));
    const filtered = forbidCrash ? deduped.filter((tool) => tool !== "chaos.crash") : deduped;
    if (filtered.length > 0) return filtered;
    return ["delay"];
}

async function runMission(control: SessionControl) {
    setSessionState(control.sessionId, "running", {
        startedAt: new Date().toISOString(),
        iteration: 0,
    });

    addThought(control.sessionId, "system", `Objective locked: ${control.objective}`);
    addThought(control.sessionId, "system", `Tool scope: ${control.allowedTools.join(", ")}`);

    let previousSnapshot: RuntimeSnapshot | undefined;

    try {
        for (let iteration = 1; iteration <= control.maxIterations; iteration++) {
            if (control.stopRequested || control.killRequested) break;

            updateSession(control.sessionId, { iteration });

            addThought(control.sessionId, "analyze", "Scanning /metrics and /sysinfo for current pressure and stability.");
            const before = await captureRuntimeSnapshot(control.baseUrl, previousSnapshot);
            previousSnapshot = before;

            if (control.stopRequested || control.killRequested) break;

            addThought(
                control.sessionId,
                "decide",
                `Telemetry: ${before.rps.toFixed(1)} RPS, ${before.avgLatencyMs.toFixed(1)}ms latency, ${(before.errorRate * 100).toFixed(2)}% errors.`
            );
            const memorySummary = buildPlannerMemorySummary(control.sessionId);
            const decision = await decideNextAction(control, before, iteration, memorySummary);
            addThought(control.sessionId, "decide", decision.thought);

            if (control.stopRequested || control.killRequested) break;

            let execution: ToolExecutionResult | undefined;
            if (decision.tool !== "none") {
                addThought(control.sessionId, "act", `Executing ${decision.tool}.`);
                execution = await executeToolStep({
                    id: `rt-${control.sessionId}-${iteration}`,
                    action: decision.tool,
                    params: decision.params,
                }, {
                    shouldCancel: () => control.stopRequested || control.killRequested,
                });

                addAction(control.sessionId, {
                    tool: decision.tool,
                    params: decision.params,
                    ok: execution.ok,
                    message: execution.message,
                });

                if (!execution.ok) {
                    addThought(control.sessionId, "act", `Tool failed: ${execution.message}`);
                }
            } else {
                addThought(control.sessionId, "act", "Skipping tool execution for this iteration.");
            }

            safeCaptureMemory(control.sessionId, "act", () => {
                captureActionMemory({
                    sessionId: control.sessionId,
                    iteration,
                    objective: control.objective,
                    decision,
                    execution,
                });
            });

            if (control.stopRequested || control.killRequested) break;

            addThought(control.sessionId, "verify", "Checking for crash and 5xx error movement after action.");
            const after = await captureRuntimeSnapshot(control.baseUrl, before);
            previousSnapshot = after;
            const healthAfter = await getHealthStatus(control.baseUrl);
            const verification = summarizeVerification({ before, after, healthAfter });

            addFinding(control.sessionId, {
                iteration,
                objective: control.objective,
                before,
                after,
                decision: {
                    tool: decision.tool,
                    params: decision.params,
                    reason: decision.reason,
                    rawModelOutput: decision.rawModelOutput,
                },
                verification,
            });

            addThought(control.sessionId, "report", verification.notes);
            safeCaptureMemory(control.sessionId, "verify", () => {
                captureVerificationMemory({
                    sessionId: control.sessionId,
                    iteration,
                    objective: control.objective,
                    verification,
                    after,
                });
            });

            if (verification.broken) {
                setSessionState(control.sessionId, "completed", {
                    endedAt: new Date().toISOString(),
                    summary: {
                        completedAt: new Date().toISOString(),
                        totalIterations: iteration,
                        breakingPointRps: after.rps,
                        failureReason: verification.notes,
                    }
                });
                addThought(control.sessionId, "system", "Breaking point found. Mission complete.");
                return;
            }

            if (iteration < control.maxIterations && control.intervalMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, control.intervalMs));
            }
        }

        if (control.killRequested) {
            setSessionState(control.sessionId, "stopped", {
                endedAt: new Date().toISOString(),
                summary: {
                    completedAt: new Date().toISOString(),
                    totalIterations: getSession(control.sessionId)?.iteration || 0,
                    failureReason: "Kill switch activated",
                }
            });
            addThought(control.sessionId, "system", "Kill switch engaged. Mission halted.");
            return;
        }

        if (control.stopRequested) {
            setSessionState(control.sessionId, "stopped", {
                endedAt: new Date().toISOString(),
                summary: {
                    completedAt: new Date().toISOString(),
                    totalIterations: getSession(control.sessionId)?.iteration || 0,
                    failureReason: "Stopped by operator",
                }
            });
            addThought(control.sessionId, "system", "Operator stop received. Mission halted.");
            return;
        }

        const session = getSession(control.sessionId);
        setSessionState(control.sessionId, "completed", {
            endedAt: new Date().toISOString(),
            summary: {
                completedAt: new Date().toISOString(),
                totalIterations: session?.iteration || control.maxIterations,
                failureReason: "No system break detected before max iterations",
            }
        });
        addThought(control.sessionId, "system", "Mission ended at max iterations without a break.");
    } catch (error: any) {
        logger.error({ error: error?.message, sessionId: control.sessionId }, "Autopilot mission failed");
        setSessionState(control.sessionId, "failed", {
            endedAt: new Date().toISOString(),
            error: error?.message || "Mission failed unexpectedly",
        });
        addThought(control.sessionId, "system", `Mission failed: ${error?.message || "unknown error"}`);
    } finally {
        if (activeControl?.sessionId === control.sessionId) {
            activeControl = null;
        }
    }
}

function buildStartResponse(sessionId: string) {
    const session = getSession(sessionId);
    const reports = listReports(sessionId);
    return {
        active: session?.state === "running" || session?.state === "stopping",
        session,
        latestReport: reports[reports.length - 1] || null,
    };
}

export async function autopilotStartHandler(req: Request, res: Response) {
    if (activeControl || startingSession) {
        return res.status(409).json({ error: "Autopilot already running", sessionId: activeControl?.sessionId });
    }

    const objective = typeof req.body?.objective === "string" ? req.body.objective.trim() : "";
    if (!objective) {
        return res.status(400).json({ error: "Missing objective" });
    }

    startingSession = true;
    try {
        const defaultBaseUrl = getServerOrigin(req);
        const targetBaseUrl = defaultBaseUrl;
        const maxIterations = clampNumber(req.body?.maxIterations, 12, 1, 30);
        const intervalMs = clampNumber(req.body?.intervalMs, 1500, 0, 30000);
        const forbidCrash = req.body?.scope?.forbidCrash !== false;
        const allowedTools = parseAllowedTools(req.body?.scope?.allowedTools, forbidCrash);

        const session = createSession({
            objective,
            targetBaseUrl,
            maxIterations,
            allowedTools,
        });

        activeControl = {
            sessionId: session.id,
            stopRequested: false,
            killRequested: false,
            baseUrl: targetBaseUrl,
            objective,
            intervalMs,
            maxIterations,
            allowedTools,
        };

        void runMission(activeControl);

        return res.json({
            success: true,
            sessionId: session.id,
            session,
        });
    } finally {
        startingSession = false;
    }
}

export async function autopilotStopHandler(_req: Request, res: Response) {
    if (!activeControl) {
        const latest = getLatestSession();
        if (latest) {
            return res.status(409).json({ error: `No active autopilot session (latest is ${latest.state})`, sessionId: latest.id });
        }
        return res.status(404).json({ error: "No active autopilot session" });
    }

    activeControl.stopRequested = true;
    setSessionState(activeControl.sessionId, "stopping");
    addThought(activeControl.sessionId, "system", "Stop requested. Finishing current cycle.");

    return res.json({ success: true, sessionId: activeControl.sessionId });
}

export async function autopilotKillHandler(_req: Request, res: Response) {
    const killResult = await stopAllActiveExperiments();

    if (activeControl) {
        activeControl.killRequested = true;
        activeControl.stopRequested = true;
        setSessionState(activeControl.sessionId, "stopping");
        addThought(activeControl.sessionId, "system", "Kill switch engaged. Cancelling active chaos and attacks.");
    }

    return res.json({ success: true, killResult });
}

export function autopilotStatusHandler(req: Request, res: Response) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : activeControl?.sessionId;

    if (sessionId) {
        return res.json(buildStartResponse(sessionId));
    }

    const latest = getLatestSession();
    if (!latest) {
        return res.json({ active: false, session: null, latestReport: null });
    }

    const reports = listReports(latest.id);
    return res.json({
        active: activeControl?.sessionId === latest.id,
        session: latest,
        latestReport: reports[reports.length - 1] || null,
    });
}

export function autopilotReportsHandler(req: Request, res: Response) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
    res.json({ reports: listReports(sessionId) });
}

export function autopilotConfigHandler(_req: Request, res: Response) {
    res.json({
        availableTools: ALL_TOOLS,
        defaultAllowedTools: DEFAULT_ALLOWED_TOOLS,
        safetyDefaults: {
            forbidCrash: true,
        }
    });
}

export function resetAutopilotStateForTests() {
    startingSession = false;
    activeControl = null;
    resetToolExecutorForTests();
    resetRedTeamStoreForTests();
}

export function sanitizeDecisionForTests(candidate: {
    thought: string;
    reason: string;
    tool: ToolAction | "none";
    params: Record<string, unknown>;
}, context: {
    allowedTools: ToolAction[];
    baseUrl: string;
    objective: string;
}) {
    return sanitizeDecision({
        ...candidate,
        rawModelOutput: "test",
    }, {
        sessionId: "test-session",
        stopRequested: false,
        killRequested: false,
        intervalMs: 0,
        maxIterations: 1,
        ...context,
    });
}

export function captureActionMemoryForTests(input: {
    sessionId: string;
    iteration: number;
    objective: string;
    decision: {
        thought: string;
        reason: string;
        tool: ToolAction | "none";
        params: Record<string, unknown>;
    };
    execution?: {
        ok: boolean;
        action: ToolAction;
        message: string;
        startedAt: string;
        endedAt: string;
        error?: string;
    };
}) {
    captureActionMemory({
        sessionId: input.sessionId,
        iteration: input.iteration,
        objective: input.objective,
        decision: {
            ...input.decision,
            rawModelOutput: "test",
        },
        execution: input.execution,
    });
}

export function captureVerificationMemoryForTests(input: {
    sessionId: string;
    iteration: number;
    objective: string;
    verification: {
        broken: boolean;
        crashDetected: boolean;
        newServerErrors: number;
        notes: string;
    };
    after: RuntimeSnapshot;
}) {
    captureVerificationMemory(input);
}

export function buildPlannerMemorySummaryForTests(sessionId: string) {
    return buildPlannerMemorySummary(sessionId);
}

export function composePlannerPayloadForTests(input: {
    control: {
        sessionId: string;
        stopRequested: boolean;
        killRequested: boolean;
        baseUrl: string;
        objective: string;
        intervalMs: number;
        maxIterations: number;
        allowedTools: ToolAction[];
    };
    snapshot: RuntimeSnapshot;
    iteration: number;
    memory: PlannerMemorySummary | null;
}) {
    return composePlannerPayload(input.control, input.snapshot, input.iteration, input.memory);
}

export function shouldPauseForBreakSignalsForTests(memory: ReturnType<typeof buildPlannerMemorySummary>) {
    return shouldPauseForBreakSignals(memory);
}
