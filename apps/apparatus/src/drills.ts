import os from "os";
import { Request, Response } from "express";
import { request } from "undici";
import { executeToolStep, stopAllActiveExperiments, ToolAction } from "./tool-executor.js";
import { logger } from "./logger.js";
import { sseBroadcaster } from "./sse-broadcast.js";
import { isClusterAttackActive } from "./cluster.js";
import { getGhostStatus, startGhostTraffic, stopGhostTraffic } from "./ghosting.js";

export type DrillDifficulty = "junior" | "senior" | "principal";
export type DrillStatus = "pending" | "arming" | "active" | "stabilizing" | "won" | "failed" | "cancelled";

interface DrillToolStressor {
    id: string;
    kind: "tool";
    step: {
        id: string;
        action: ToolAction;
        params: Record<string, unknown>;
        delayMs?: number;
    };
}

interface DrillGhostStartStressor {
    id: string;
    kind: "ghost.start";
    target?: string;
    delayMs?: number;
}

interface DrillGhostStopStressor {
    id: string;
    kind: "ghost.stop";
}

interface DrillSeedSqliStressor {
    id: string;
    kind: "seed.sqli";
    targetBase?: string;
    delayMs?: number;
    durationSec?: number;
    payloads?: string[];
}

export type DrillStressor =
    | DrillToolStressor
    | DrillGhostStartStressor
    | DrillGhostStopStressor
    | DrillSeedSqliStressor;

interface NumericCondition {
    op: "<" | ">" | "<=" | ">=";
    value: number;
    sustainSec: number;
}

interface BooleanCondition {
    op: "==";
    value: boolean;
    sustainSec: number;
}

export type DrillCondition =
    | ({ kind: "cpu_percent" } & NumericCondition)
    | ({ kind: "error_rate" } & NumericCondition)
    | ({ kind: "blocked_sqli_ratio" } & NumericCondition)
    | ({ kind: "detected_marked" } & BooleanCondition)
    | ({ kind: "cluster_attack_active" } & BooleanCondition)
    | ({ kind: "ghost_traffic_active" } & BooleanCondition);

export interface DrillHint {
    atSec: number;
    title: string;
    body: string;
}

export interface DrillDefinition {
    id: string;
    name: string;
    description: string;
    difficulty: DrillDifficulty;
    tags: Array<"reliability" | "traffic" | "appsec">;
    briefing: string;
    stressors: DrillStressor[];
    winConditions: DrillCondition[];
    failConditions?: DrillCondition[];
    hintLadder: DrillHint[];
    maxDurationSec: number;
    createdAt: string;
}

type DrillTimelineEventType = "system" | "metric" | "hint" | "user_action" | "status_change";

export interface DrillTimelineEvent {
    at: string;
    type: DrillTimelineEventType;
    message: string;
    data?: Record<string, unknown>;
}

export interface DrillSnapshot {
    cpuPercent: number;
    errorRate: number;
    blockedSqliRatio: number;
    detectedMarked: boolean;
    clusterAttackActive: boolean;
    ghostTrafficActive: boolean;
}

export interface DrillScore {
    total: number;
    ttdSec: number;
    ttmSec: number;
    ttrSec: number;
    penalties: Array<{ code: string; points: number; reason: string }>;
    bonuses: Array<{ code: string; points: number; reason: string }>;
}

export interface DrillRun {
    runId: string;
    drillId: string;
    drillName: string;
    status: DrillStatus;
    startedAt: string;
    finishedAt?: string;
    detectedAt?: string;
    mitigatedAt?: string;
    failureReason?: string;
    timeline: DrillTimelineEvent[];
    lastSnapshot?: DrillSnapshot;
    score?: DrillScore;
}

interface DrillRunContext {
    interval?: NodeJS.Timeout;
    timeout?: NodeJS.Timeout;
    winSinceMs?: number;
    lastMetricSampleAtMs: number;
    emittedHints: Set<number>;
    terminal: boolean;
    sqliAttempted: number;
    sqliBlocked: number;
    sqliSeedInterval?: NodeJS.Timeout;
    sqliSeedStopTimeout?: NodeJS.Timeout;
}

interface RequestSample {
    ts: number;
    status: number;
}

const MAX_RUNS = 500;
const MAX_TIMELINE_EVENTS = 300;
const REQUEST_WINDOW_MS = 30000;
const MAX_REQUEST_SAMPLES = 5000;
const METRIC_TIMELINE_INTERVAL_MS = 5000;
const TERMINAL_STATUSES = new Set<DrillStatus>(["won", "failed", "cancelled"]);

const DEFAULT_SQLI_PAYLOADS = [
    "admin' OR '1'='1",
    "' OR 1=1",
    "admin') OR ('1'='1",
    "1' OR '1'='1",
];

const drillDefinitions = new Map<string, DrillDefinition>();
const drillRuns = new Map<string, DrillRun>();
const latestRunByDrill = new Map<string, string>();
const drillRunContexts = new Map<string, DrillRunContext>();
const requestSamples: RequestSample[] = [];

let requestListenerAttached = false;

const BUILTIN_DRILLS: DrillDefinition[] = [
    {
        id: "drill-cpu-leak-jr",
        name: "CPU Leak Containment",
        description: "Stabilize an overloaded node and confirm service health recovers.",
        difficulty: "junior",
        tags: ["reliability"],
        briefing: "Operators report latency spikes and unstable host performance. Contain and stabilize the environment.",
        stressors: [
            {
                id: "stressor-memory",
                kind: "tool",
                step: {
                    id: "memory-allocate",
                    action: "chaos.memory",
                    params: { action: "allocate", amount: 256 },
                },
            },
            {
                id: "stressor-cpu",
                kind: "tool",
                step: {
                    id: "cpu-spike",
                    action: "chaos.cpu",
                    params: { duration: 3000 },
                },
            },
        ],
        winConditions: [
            { kind: "cpu_percent", op: "<=", value: 100, sustainSec: 2 },
            { kind: "error_rate", op: "<=", value: 0.25, sustainSec: 2 },
            { kind: "detected_marked", op: "==", value: true, sustainSec: 2 },
        ],
        hintLadder: [
            { atSec: 20, title: "Hint 1", body: "Check system pressure and recent traffic behavior before applying mitigation." },
            { atSec: 45, title: "Hint 2", body: "Mark detection once you identify likely root cause to proceed with validation." },
        ],
        maxDurationSec: 180,
        createdAt: new Date().toISOString(),
    },
    {
        id: "drill-ddos-sr",
        name: "Volumetric Traffic Spike",
        description: "Investigate sustained request surge and recover service stability.",
        difficulty: "senior",
        tags: ["traffic"],
        briefing: "Edge traffic volume has surged unexpectedly. Identify whether this is malicious and restore stable response behavior.",
        stressors: [
            {
                id: "stressor-ghost-start",
                kind: "ghost.start",
                delayMs: 80,
            },
        ],
        winConditions: [
            { kind: "ghost_traffic_active", op: "==", value: false, sustainSec: 5 },
            { kind: "error_rate", op: "<=", value: 0.35, sustainSec: 5 },
            { kind: "detected_marked", op: "==", value: true, sustainSec: 5 },
        ],
        failConditions: [
            { kind: "error_rate", op: ">=", value: 0.95, sustainSec: 0 },
        ],
        hintLadder: [
            { atSec: 30, title: "Hint 1", body: "Traffic-focused drills often need both triage and containment actions." },
            { atSec: 70, title: "Hint 2", body: "Use defense and traffic modules together to verify pressure actually drops." },
            { atSec: 110, title: "Hint 3", body: "A stable win requires sustained recovery, not one-time improvement." },
        ],
        maxDurationSec: 300,
        createdAt: new Date().toISOString(),
    },
    {
        id: "drill-sqli-principal",
        name: "SQLi Exfil Attempt",
        description: "Detect probing and improve block effectiveness under active injection traffic.",
        difficulty: "principal",
        tags: ["appsec"],
        briefing: "Suspicious query payloads suggest SQLi reconnaissance. Correlate evidence and raise block efficacy.",
        stressors: [
            {
                id: "stressor-seed-sqli",
                kind: "seed.sqli",
                delayMs: 220,
                durationSec: 180,
            },
            {
                id: "stressor-noise",
                kind: "ghost.start",
                delayMs: 180,
            },
        ],
        winConditions: [
            { kind: "blocked_sqli_ratio", op: ">=", value: 0.75, sustainSec: 8 },
            { kind: "detected_marked", op: "==", value: true, sustainSec: 8 },
        ],
        failConditions: [
            { kind: "error_rate", op: ">=", value: 0.98, sustainSec: 0 },
        ],
        hintLadder: [
            { atSec: 35, title: "Hint 1", body: "Start by confirming signals across both deception and traffic views." },
            { atSec: 75, title: "Hint 2", body: "Improve block precision; over-broad filters can disrupt normal operations." },
            { atSec: 130, title: "Hint 3", body: "Track effective block ratio over time before declaring incident stable." },
        ],
        maxDurationSec: 420,
        createdAt: new Date().toISOString(),
    },
];

function initDrills() {
    if (drillDefinitions.size > 0) return;
    for (const drill of BUILTIN_DRILLS) {
        drillDefinitions.set(drill.id, drill);
    }
}

function attachRequestListener() {
    if (requestListenerAttached) return;
    requestListenerAttached = true;

    sseBroadcaster.on("request", (event: unknown) => {
        const status = extractStatusCode(event);
        if (status === null) return;

        requestSamples.push({ ts: Date.now(), status });
        if (requestSamples.length > MAX_REQUEST_SAMPLES) {
            requestSamples.splice(0, requestSamples.length - MAX_REQUEST_SAMPLES);
        }
    });
}

function extractStatusCode(event: unknown): number | null {
    if (!event || typeof event !== "object") return null;

    const maybeEvent = event as { data?: unknown; status?: unknown };
    if (typeof maybeEvent.status === "number") {
        return maybeEvent.status;
    }

    if (!maybeEvent.data || typeof maybeEvent.data !== "object") return null;
    const nested = maybeEvent.data as { status?: unknown };
    return typeof nested.status === "number" ? nested.status : null;
}

function appendTimeline(run: DrillRun, type: DrillTimelineEventType, message: string, data?: Record<string, unknown>) {
    run.timeline.push({
        at: new Date().toISOString(),
        type,
        message,
        data,
    });

    if (run.timeline.length > MAX_TIMELINE_EVENTS) {
        run.timeline.splice(0, run.timeline.length - MAX_TIMELINE_EVENTS);
    }
}

function elapsedSec(run: DrillRun, nowMs = Date.now()) {
    const startedAtMs = Date.parse(run.startedAt);
    return Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
}

function compareNumber(actual: number, op: NumericCondition["op"], expected: number) {
    switch (op) {
        case "<":
            return actual < expected;
        case ">":
            return actual > expected;
        case "<=":
            return actual <= expected;
        case ">=":
            return actual >= expected;
        default:
            return false;
    }
}

function compareBoolean(actual: boolean, op: BooleanCondition["op"], expected: boolean) {
    if (op === "==") {
        return actual === expected;
    }
    return false;
}

function pruneRequestSamples(nowMs: number) {
    const floor = nowMs - REQUEST_WINDOW_MS;
    while (requestSamples.length > 0 && requestSamples[0].ts < floor) {
        requestSamples.shift();
    }
}

function collectSnapshot(run: DrillRun, context: DrillRunContext): DrillSnapshot {
    const cpus = Math.max(1, os.cpus().length);
    const loadAverage = os.loadavg()[0] || 0;
    const cpuPercent = Math.max(0, Math.min(100, (loadAverage / cpus) * 100));

    const nowMs = Date.now();
    pruneRequestSamples(nowMs);

    const total = requestSamples.length;
    const errors = requestSamples.filter((sample) => sample.status >= 500).length;
    const errorRate = total === 0 ? 0 : errors / total;

    const blockedSqliRatio = context.sqliAttempted === 0
        ? 0
        : context.sqliBlocked / context.sqliAttempted;

    return {
        cpuPercent,
        errorRate,
        blockedSqliRatio,
        detectedMarked: Boolean(run.detectedAt),
        clusterAttackActive: isClusterAttackActive(),
        ghostTrafficActive: getGhostStatus() === "running",
    };
}

function evaluateCondition(condition: DrillCondition, snapshot: DrillSnapshot) {
    switch (condition.kind) {
        case "cpu_percent":
            return compareNumber(snapshot.cpuPercent, condition.op, condition.value);
        case "error_rate":
            return compareNumber(snapshot.errorRate, condition.op, condition.value);
        case "blocked_sqli_ratio":
            return compareNumber(snapshot.blockedSqliRatio, condition.op, condition.value);
        case "detected_marked":
            return compareBoolean(snapshot.detectedMarked, condition.op, condition.value);
        case "cluster_attack_active":
            return compareBoolean(snapshot.clusterAttackActive, condition.op, condition.value);
        case "ghost_traffic_active":
            return compareBoolean(snapshot.ghostTrafficActive, condition.op, condition.value);
        default:
            return false;
    }
}

function requiredSustainMs(conditions: DrillCondition[]) {
    const maxSustainSec = conditions.reduce((max, condition) => Math.max(max, condition.sustainSec), 0);
    return maxSustainSec * 1000;
}

function getRunIdFromRequest(req: Request, drillId: string) {
    if (typeof req.query.runId === "string") {
        return req.query.runId;
    }

    const body = req.body as { runId?: unknown } | undefined;
    if (body && typeof body.runId === "string") {
        return body.runId;
    }

    return latestRunByDrill.get(drillId);
}

function getRunForDrill(drillId: string, runId: string | undefined) {
    if (!runId) {
        return { error: "No run found for this drill" } as const;
    }

    const run = drillRuns.get(runId);
    if (!run || run.drillId !== drillId) {
        return { error: "Run not found" } as const;
    }

    return { run } as const;
}

function updateRunStatus(run: DrillRun, status: DrillStatus, message: string) {
    if (run.status === status) return;
    run.status = status;
    appendTimeline(run, "status_change", message, { status });
}

function stopSqliSeeder(context: DrillRunContext) {
    if (context.sqliSeedInterval) {
        clearInterval(context.sqliSeedInterval);
        context.sqliSeedInterval = undefined;
    }

    if (context.sqliSeedStopTimeout) {
        clearTimeout(context.sqliSeedStopTimeout);
        context.sqliSeedStopTimeout = undefined;
    }
}

function startSqliSeeder(context: DrillRunContext, options: DrillSeedSqliStressor) {
    stopSqliSeeder(context);

    const targetBase = options.targetBase || `http://127.0.0.1:${process.env.PORT || 8080}`;
    const delayMs = Math.max(50, Math.min(5000, Math.trunc(options.delayMs ?? 250)));
    const durationSec = Math.max(5, Math.min(1800, Math.trunc(options.durationSec ?? 120)));
    const payloads = Array.isArray(options.payloads) && options.payloads.length > 0
        ? options.payloads
        : DEFAULT_SQLI_PAYLOADS;

    let payloadIndex = 0;

    context.sqliSeedInterval = setInterval(() => {
        const payload = payloads[payloadIndex % payloads.length] || "' OR 1=1";
        payloadIndex += 1;

        void (async () => {
            context.sqliAttempted += 1;
            try {
                const url = `${targetBase}/echo?q=${encodeURIComponent(payload)}`;
                const response = await request(url, {
                    method: "GET",
                    headers: {
                        "User-Agent": "BreachProtocolSeeder/1.0",
                    },
                });

                if (response.statusCode === 403 || response.statusCode === 406) {
                    context.sqliBlocked += 1;
                }

                void response.body.dump();
            } catch {
                // Treat request failure as attempted but not blocked.
            }
        })();
    }, delayMs);

    context.sqliSeedStopTimeout = setTimeout(() => {
        stopSqliSeeder(context);
    }, durationSec * 1000);
}

async function executeStressor(stressor: DrillStressor, run: DrillRun, context: DrillRunContext) {
    switch (stressor.kind) {
        case "tool": {
            const result = await executeToolStep(stressor.step);
            if (!result.ok) {
                throw new Error(result.error || result.message || "Failed to execute stressor");
            }

            appendTimeline(run, "system", `Stressor executed: ${stressor.step.action}`, {
                stressorId: stressor.id,
                message: result.message,
            });
            return;
        }

        case "ghost.start": {
            const result = startGhostTraffic({
                target: stressor.target,
                delay: stressor.delayMs,
            });
            appendTimeline(run, "system", "Ghost traffic started", {
                stressorId: stressor.id,
                status: result.status,
                target: "target" in result ? result.target : undefined,
            });
            return;
        }

        case "ghost.stop": {
            const result = stopGhostTraffic();
            appendTimeline(run, "system", "Ghost traffic stopped", {
                stressorId: stressor.id,
                status: result.status,
            });
            return;
        }

        case "seed.sqli": {
            startSqliSeeder(context, stressor);
            appendTimeline(run, "system", "SQLi seeder started", {
                stressorId: stressor.id,
                targetBase: stressor.targetBase,
                delayMs: stressor.delayMs,
                durationSec: stressor.durationSec,
            });
            return;
        }

        default:
            throw new Error(`Unsupported stressor kind: ${String((stressor as { kind?: unknown }).kind)}`);
    }
}

function calculateScore(run: DrillRun, status: DrillStatus): DrillScore {
    const startedAtMs = Date.parse(run.startedAt);
    const finishedAtMs = run.finishedAt ? Date.parse(run.finishedAt) : Date.now();

    const ttdSec = run.detectedAt
        ? Math.max(0, Math.round((Date.parse(run.detectedAt) - startedAtMs) / 1000))
        : Math.max(0, Math.round((finishedAtMs - startedAtMs) / 1000));

    const mitigationAnchorMs = run.detectedAt ? Date.parse(run.detectedAt) : startedAtMs;
    const mitigatedAtMs = run.mitigatedAt ? Date.parse(run.mitigatedAt) : finishedAtMs;
    const ttmSec = Math.max(0, Math.round((mitigatedAtMs - mitigationAnchorMs) / 1000));
    const ttrSec = Math.max(0, Math.round((finishedAtMs - startedAtMs) / 1000));

    const penalties: DrillScore["penalties"] = [];
    const bonuses: DrillScore["bonuses"] = [];

    penalties.push({ code: "ttd", points: ttdSec, reason: "Time to detection penalty" });
    penalties.push({ code: "ttm", points: Math.round(ttmSec * 0.5), reason: "Time to mitigation penalty" });
    penalties.push({ code: "ttr", points: Math.round(ttrSec * 0.25), reason: "Time to resolution penalty" });

    if (status === "failed") {
        penalties.push({ code: "failed", points: 100, reason: "Drill failed" });
    }

    if (status === "won") {
        bonuses.push({ code: "won", points: 50, reason: "Successful incident resolution" });
    }

    const totalPenalty = penalties.reduce((acc, penalty) => acc + penalty.points, 0);
    const totalBonus = bonuses.reduce((acc, bonus) => acc + bonus.points, 0);
    const rawTotal = 1000 - totalPenalty + totalBonus;

    return {
        total: Math.max(0, Math.min(1200, Math.round(rawTotal))),
        ttdSec,
        ttmSec,
        ttrSec,
        penalties,
        bonuses,
    };
}

async function finalizeRun(runId: string, status: DrillStatus, reason?: string) {
    const run = drillRuns.get(runId);
    const context = drillRunContexts.get(runId);
    if (!run || !context || context.terminal) return;

    context.terminal = true;

    if (context.interval) {
        clearInterval(context.interval);
        context.interval = undefined;
    }

    if (context.timeout) {
        clearTimeout(context.timeout);
        context.timeout = undefined;
    }

    stopSqliSeeder(context);

    updateRunStatus(run, status, `Run entered terminal state: ${status}`);

    if (reason) {
        run.failureReason = reason;
        appendTimeline(run, "system", reason);
    }

    run.finishedAt = new Date().toISOString();

    const cleanupSummary: Record<string, unknown> = {};

    try {
        const stopGhostResult = stopGhostTraffic();
        cleanupSummary.ghostTraffic = stopGhostResult.status;
    } catch (error: any) {
        cleanupSummary.ghostTraffic = `error:${error?.message || String(error)}`;
    }

    try {
        const cleanup = await stopAllActiveExperiments();
        cleanupSummary.cpuStopped = cleanup.cpuStopped;
        cleanupSummary.memoryCleared = cleanup.memoryCleared;
        cleanupSummary.cluster = cleanup.cluster;
    } catch (error: any) {
        logger.error({ runId, error: error?.message || String(error) }, "Drill cleanup failed");
        cleanupSummary.experimentsError = error?.message || String(error);
    }

    appendTimeline(run, "system", "Executed terminal cleanup", cleanupSummary);

    run.score = calculateScore(run, status);
    logger.info({ runId, drillId: run.drillId, status }, "Drill run finalized");
}

async function evaluateRun(drill: DrillDefinition, runId: string) {
    const run = drillRuns.get(runId);
    const context = drillRunContexts.get(runId);
    if (!run || !context || context.terminal) return;

    const nowMs = Date.now();
    const snapshot = collectSnapshot(run, context);
    run.lastSnapshot = snapshot;

    const elapsed = elapsedSec(run, nowMs);
    for (let idx = 0; idx < drill.hintLadder.length; idx++) {
        const hint = drill.hintLadder[idx];
        if (hint && elapsed >= hint.atSec && !context.emittedHints.has(idx)) {
            context.emittedHints.add(idx);
            appendTimeline(run, "hint", `${hint.title}: ${hint.body}`);
        }
    }

    if (nowMs - context.lastMetricSampleAtMs >= METRIC_TIMELINE_INTERVAL_MS) {
        context.lastMetricSampleAtMs = nowMs;
        appendTimeline(run, "metric", "Metric snapshot", {
            cpuPercent: Number(snapshot.cpuPercent.toFixed(2)),
            errorRate: Number(snapshot.errorRate.toFixed(4)),
            blockedSqliRatio: Number(snapshot.blockedSqliRatio.toFixed(4)),
            detectedMarked: snapshot.detectedMarked,
            clusterAttackActive: snapshot.clusterAttackActive,
            ghostTrafficActive: snapshot.ghostTrafficActive,
            sqliAttempted: context.sqliAttempted,
            sqliBlocked: context.sqliBlocked,
        });
    }

    if (drill.failConditions && drill.failConditions.some((condition) => evaluateCondition(condition, snapshot))) {
        await finalizeRun(runId, "failed", "Fail condition triggered");
        return;
    }

    const winSatisfied = drill.winConditions.every((condition) => evaluateCondition(condition, snapshot));
    if (winSatisfied) {
        if (!context.winSinceMs) {
            context.winSinceMs = nowMs;
            if (!run.mitigatedAt) {
                run.mitigatedAt = new Date().toISOString();
            }
            updateRunStatus(run, "stabilizing", "Win conditions reached, validating stability window");
        }

        const sustainMs = requiredSustainMs(drill.winConditions);
        if (nowMs - context.winSinceMs >= sustainMs) {
            await finalizeRun(runId, "won");
        }
        return;
    }

    if (context.winSinceMs) {
        context.winSinceMs = undefined;
        updateRunStatus(run, "active", "Conditions regressed; returning to active incident state");
    }
}

async function runDrill(drill: DrillDefinition, runId: string) {
    const run = drillRuns.get(runId);
    const context = drillRunContexts.get(runId);
    if (!run || !context || context.terminal) return;

    try {
        updateRunStatus(run, "arming", "Applying initial stressors");
        for (const stressor of drill.stressors) {
            if (context.terminal) return;
            await executeStressor(stressor, run, context);
        }

        updateRunStatus(run, "active", "Drill is active");

        context.timeout = setTimeout(() => {
            void finalizeRun(runId, "failed", "Drill timed out before resolution");
        }, drill.maxDurationSec * 1000);

        context.interval = setInterval(() => {
            void evaluateRun(drill, runId);
        }, 1000);
    } catch (error: any) {
        logger.error({ runId, drillId: drill.id, error: error?.message || String(error) }, "Failed to start drill run");
        await finalizeRun(runId, "failed", error?.message || "Failed to execute stressors");
    }
}

function createRun(drill: DrillDefinition) {
    const runId = `drill-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const run: DrillRun = {
        runId,
        drillId: drill.id,
        drillName: drill.name,
        status: "pending",
        startedAt: new Date().toISOString(),
        timeline: [],
    };

    appendTimeline(run, "system", "Drill run created");

    drillRuns.set(runId, run);
    latestRunByDrill.set(drill.id, runId);

    if (drillRuns.size > MAX_RUNS) {
        const firstRunId = drillRuns.keys().next().value;
        if (firstRunId) {
            const staleContext = drillRunContexts.get(firstRunId);
            if (staleContext) {
                stopSqliSeeder(staleContext);
            }
            drillRuns.delete(firstRunId);
            drillRunContexts.delete(firstRunId);
        }
    }

    drillRunContexts.set(runId, {
        emittedHints: new Set<number>(),
        terminal: false,
        lastMetricSampleAtMs: Date.now(),
        sqliAttempted: 0,
        sqliBlocked: 0,
    });

    return run;
}

export function drillListHandler(_req: Request, res: Response) {
    initDrills();
    attachRequestListener();
    res.json(Array.from(drillDefinitions.values()));
}

export function drillRunHandler(req: Request, res: Response) {
    initDrills();
    attachRequestListener();

    const drillId = req.params.id;
    const drill = drillDefinitions.get(drillId);

    if (!drill) {
        return res.status(404).json({ error: "Drill not found" });
    }

    const run = createRun(drill);

    res.status(202).json({
        status: "started",
        runId: run.runId,
        drillId: drill.id,
        message: `Drill started: ${drill.name}`,
    });

    setImmediate(() => {
        void runDrill(drill, run.runId);
    });
}

export function drillStatusHandler(req: Request, res: Response) {
    initDrills();

    const drillId = req.params.id;
    if (!drillDefinitions.has(drillId)) {
        return res.status(404).json({ error: "Drill not found" });
    }

    const runId = getRunIdFromRequest(req, drillId);
    const lookup = getRunForDrill(drillId, runId);
    if ("error" in lookup) {
        return res.status(404).json({ error: lookup.error });
    }

    const run = lookup.run;
    return res.json({
        ...run,
        elapsedSec: elapsedSec(run),
    });
}

export function drillMarkDetectedHandler(req: Request, res: Response) {
    initDrills();

    const drillId = req.params.id;
    if (!drillDefinitions.has(drillId)) {
        return res.status(404).json({ error: "Drill not found" });
    }

    const runId = getRunIdFromRequest(req, drillId);
    const lookup = getRunForDrill(drillId, runId);
    if ("error" in lookup) {
        return res.status(404).json({ error: lookup.error });
    }

    const run = lookup.run;
    if (TERMINAL_STATUSES.has(run.status)) {
        return res.status(409).json({ error: "Run is already in terminal state", status: run.status });
    }

    if (!run.detectedAt) {
        run.detectedAt = new Date().toISOString();
        appendTimeline(run, "user_action", "Operator marked incident as detected");
    }

    return res.json({
        status: "ok",
        run,
    });
}

export async function drillCancelHandler(req: Request, res: Response) {
    initDrills();

    const drillId = req.params.id;
    if (!drillDefinitions.has(drillId)) {
        return res.status(404).json({ error: "Drill not found" });
    }

    const runId = getRunIdFromRequest(req, drillId);
    const lookup = getRunForDrill(drillId, runId);
    if ("error" in lookup) {
        return res.status(404).json({ error: lookup.error });
    }

    const run = lookup.run;
    if (TERMINAL_STATUSES.has(run.status)) {
        return res.json({ status: "ok", run });
    }

    await finalizeRun(run.runId, "cancelled", "Cancelled by operator");
    return res.json({ status: "ok", run });
}

export function drillDebriefHandler(req: Request, res: Response) {
    initDrills();

    const drillId = req.params.id;
    if (!drillDefinitions.has(drillId)) {
        return res.status(404).json({ error: "Drill not found" });
    }

    const runId = getRunIdFromRequest(req, drillId);
    const lookup = getRunForDrill(drillId, runId);
    if ("error" in lookup) {
        return res.status(404).json({ error: lookup.error });
    }

    const run = lookup.run;
    if (!TERMINAL_STATUSES.has(run.status)) {
        return res.status(409).json({ error: "Run has not reached a terminal state yet", status: run.status });
    }

    if (!run.score) {
        run.score = calculateScore(run, run.status);
    }

    return res.json({
        runId: run.runId,
        drillId: run.drillId,
        status: run.status,
        score: run.score,
        detectedAt: run.detectedAt,
        mitigatedAt: run.mitigatedAt,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        timeline: run.timeline,
    });
}
