import { allocateMemorySpike, clearMemorySpike, scheduleCrash, stopCpuSpike, triggerCpuSpike } from "./chaos.js";
import { broadcastClusterAttack, broadcastClusterStop, stopClusterAttack } from "./cluster.js";
import { setMtdPrefix } from "./mtd.js";
import { spawn } from "child_process";
import path from "path";
import { cfg } from "./config.js";
import { logger } from "./logger.js";

const MAX_PROCESS_TIMEOUT_MS = 60_000; // 1 minute cap for external tools
const MAX_OUTPUT_BUFFER = 10_000; // 10KB cap for log collection

function isSafeTarget(url: string) {
    if (cfg.demoMode) return true;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        // Block localhost and RFC 1918 private ranges unless in demo mode
        if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
        if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(host)) return false;
        return true;
    } catch {
        return false;
    }
}

export const TOOL_ACTIONS = [
    "chaos.cpu",
    "chaos.memory",
    "cluster.attack",
    "mtd.rotate",
    "delay",
    "chaos.crash",
    "k6.run",
    "nuclei.run",
] as const;
export type ToolAction = typeof TOOL_ACTIONS[number];

export interface ToolStep {
    id: string;
    action: ToolAction;
    params: Record<string, unknown>;
    delayMs?: number;
}

interface ToolExecutionOptions {
    shouldCancel?: () => boolean;
}

export interface ToolExecutionResult {
    ok: boolean;
    action: ToolAction;
    message: string;
    startedAt: string;
    endedAt: string;
    error?: string;
}

const DEFAULT_CLUSTER_TARGET = "http://127.0.0.1:8090/echo";

function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function cancellableSleep(ms: number, shouldCancel?: () => boolean) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < ms) {
        if (shouldCancel?.()) {
            throw new Error("Execution cancelled");
        }
        const remaining = ms - (Date.now() - startedAt);
        await sleep(Math.min(remaining, 100));
    }
}

function toPositiveInt(input: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function parseTargetUrl(value: unknown) {
    if (typeof value !== "string" || !value) return DEFAULT_CLUSTER_TARGET;
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error("cluster.attack target must be a valid URL");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("cluster.attack target must use http/https");
    }
    return parsed.toString();
}

export function sanitizeToolParams(action: ToolAction, rawParams: Record<string, unknown>) {
    switch (action) {
        case "chaos.cpu":
            return { duration: toPositiveInt(rawParams.duration, 5000, 250, 120000) };
        case "chaos.memory": {
            const memoryAction = rawParams.action === "clear" ? "clear" : "allocate";
            if (memoryAction === "clear") {
                return { action: "clear" as const };
            }
            return {
                action: "allocate" as const,
                amount: toPositiveInt(rawParams.amount, 100, 1, 4096),
            };
        }
        case "cluster.attack":
            return {
                target: parseTargetUrl(rawParams.target),
                rate: toPositiveInt(rawParams.rate, 100, 1, 2000),
            };
        case "mtd.rotate":
            return {
                prefix: typeof rawParams.prefix === "string" && rawParams.prefix.trim()
                    ? rawParams.prefix.slice(0, 48)
                    : Math.random().toString(36).slice(2, 8),
            };
        case "chaos.crash":
            return { delayMs: toPositiveInt(rawParams.delayMs, 1000, 100, 30000) };
        case "delay":
            return { duration: toPositiveInt(rawParams.duration, 1000, 10, 120000) };
        case "k6.run": {
            const script = String(rawParams.script || "baseline.js");
            const target = String(rawParams.target || "");
            const duration = String(rawParams.duration || "10s");
            
            if (script.includes("..") || script.includes("/") || script.includes("\\")) {
                throw new Error("Invalid script name: path traversal not allowed");
            }
            if (!/^\d{1,3}[smh]$/.test(duration)) {
                throw new Error("Invalid duration format (e.g. 30s, 1m)");
            }
            if (!isSafeTarget(target)) {
                throw new Error("Target URL restricted (internal/private IP)");
            }

            return {
                script,
                vus: toPositiveInt(rawParams.vus, 10, 1, 100),
                duration,
                target: parseTargetUrl(target),
            };
        }
        case "nuclei.run": {
            const template = String(rawParams.template || "ai-prompt-injection.yaml");
            const target = String(rawParams.target || "");

            if (template.includes("..") || template.includes("/") || template.includes("\\")) {
                throw new Error("Invalid template name: path traversal not allowed");
            }
            if (!isSafeTarget(target)) {
                throw new Error("Target URL restricted (internal/private IP)");
            }

            return {
                template,
                target: parseTargetUrl(target),
            };
        }
        default:
            throw new Error(`Unsupported action: ${action}`);
    }
}

export async function executeToolStep(step: ToolStep, options?: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const startedAt = new Date().toISOString();

    try {
        let message = "";
        const sanitizedParams = sanitizeToolParams(step.action, step.params || {});
        if (options?.shouldCancel?.()) {
            throw new Error("Execution cancelled");
        }

        switch (step.action) {
            case "chaos.cpu": {
                const duration = sanitizedParams.duration as number;
                if (!triggerCpuSpike(duration)) {
                    throw new Error("CPU spike already running");
                }
                message = `Spiking CPU for ${duration}ms`;
                break;
            }

            case "chaos.memory": {
                if (sanitizedParams.action === "clear") {
                    message = clearMemorySpike();
                } else {
                    const amount = sanitizedParams.amount as number;
                    message = allocateMemorySpike(amount);
                }
                break;
            }

            case "cluster.attack": {
                const target = sanitizedParams.target as string;
                const rate = sanitizedParams.rate as number;
                const result = await broadcastClusterAttack(target, rate);
                message = `${result.message} (${result.nodes} nodes)`;
                break;
            }

            case "mtd.rotate": {
                const prefix = sanitizedParams.prefix as string;
                setMtdPrefix(prefix);
                message = `MTD prefix rotated to ${prefix}`;
                break;
            }

            case "chaos.crash": {
                const delay = sanitizedParams.delayMs as number;
                scheduleCrash(delay);
                message = `Crash scheduled in ${delay}ms`;
                break;
            }

            case "delay": {
                const duration = sanitizedParams.duration as number;
                await cancellableSleep(duration, options?.shouldCancel);
                message = `Delayed for ${duration}ms`;
                break;
            }

            case "k6.run": {
                if (!cfg.k6ScenariosPath) throw new Error("K6 Scenarios path not configured");
                
                const scriptPath = path.resolve(cfg.k6ScenariosPath, sanitizedParams.script as string);
                if (!scriptPath.startsWith(path.resolve(cfg.k6ScenariosPath))) {
                    throw new Error("Path traversal blocked");
                }

                const args = ["run", scriptPath, "--vus", String(sanitizedParams.vus), "--duration", sanitizedParams.duration as string, "-e", `BASE=${sanitizedParams.target}`];
                
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), MAX_PROCESS_TIMEOUT_MS);
                
                const k6 = spawn("k6", args, { signal: controller.signal });
                let output = "";
                
                k6.stdout.on("data", (data) => {
                    if (output.length < MAX_OUTPUT_BUFFER) output += data.toString();
                });
                
                k6.stderr.on("data", (data) => {
                    if (output.length < MAX_OUTPUT_BUFFER) output += data.toString();
                });

                const exitCode = await new Promise<number | string>((resolve, reject) => {
                    k6.on("close", resolve);
                    k6.on("error", (err) => {
                        if (err.name === "AbortError") resolve("timeout");
                        else reject(err);
                    });
                });

                clearTimeout(timeout);

                if (exitCode === "timeout") {
                    throw new Error(`k6 timed out after ${MAX_PROCESS_TIMEOUT_MS}ms`);
                }
                if (exitCode !== 0) {
                    throw new Error(`k6 failed with exit code ${exitCode}: ${output.slice(-200)}`);
                }
                message = `k6 finished successfully. Output: ${output.slice(-100)}`;
                break;
            }

            case "nuclei.run": {
                if (!cfg.nucleiTemplatesPath) throw new Error("Nuclei Templates path not configured");

                const templatePath = path.resolve(cfg.nucleiTemplatesPath, sanitizedParams.template as string);
                if (!templatePath.startsWith(path.resolve(cfg.nucleiTemplatesPath))) {
                    throw new Error("Path traversal blocked");
                }

                const args = ["-t", templatePath, "-u", sanitizedParams.target as string, "-nc"];
                
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), MAX_PROCESS_TIMEOUT_MS);

                const nuclei = spawn("nuclei", args, { signal: controller.signal });
                let output = "";
                
                nuclei.stdout.on("data", (data) => {
                    if (output.length < MAX_OUTPUT_BUFFER) output += data.toString();
                });
                
                nuclei.stderr.on("data", (data) => {
                    if (output.length < MAX_OUTPUT_BUFFER) output += data.toString();
                });

                const exitCode = await new Promise<number | string>((resolve, reject) => {
                    nuclei.on("close", resolve);
                    nuclei.on("error", (err) => {
                        if (err.name === "AbortError") resolve("timeout");
                        else reject(err);
                    });
                });

                clearTimeout(timeout);

                if (exitCode === "timeout") {
                    throw new Error(`nuclei timed out after ${MAX_PROCESS_TIMEOUT_MS}ms`);
                }
                if (exitCode !== 0) {
                    throw new Error(`nuclei failed with exit code ${exitCode}: ${output.slice(-200)}`);
                }
                message = `nuclei finished successfully. Findings: ${output.length > 0 ? "Detected" : "None"}`;
                break;
            }

            default:
                throw new Error(`Unsupported action: ${String(step.action)}`);
        }

        if (step.delayMs && step.delayMs > 0) {
            await cancellableSleep(step.delayMs, options?.shouldCancel);
        }

        return {
            ok: true,
            action: step.action,
            message,
            startedAt,
            endedAt: new Date().toISOString()
        };
    } catch (error: any) {
        return {
            ok: false,
            action: step.action,
            message: error?.message || "Tool execution failed",
            startedAt,
            endedAt: new Date().toISOString(),
            error: error?.message || "Unknown error"
        };
    }
}

export async function stopAllActiveExperiments() {
    const cpuStopped = stopCpuSpike();
    const memoryCleared = clearMemorySpike();
    let clusterMessage = "Cluster stop not requested";
    try {
        const clusterResult = await broadcastClusterStop();
        clusterMessage = clusterResult.message;
    } catch (error: any) {
        clusterMessage = `Cluster stop failed: ${error?.message || "unknown error"}`;
    }

    return {
        cpuStopped,
        memoryCleared,
        cluster: clusterMessage,
    };
}

export function resetToolExecutorForTests() {
    stopCpuSpike();
    clearMemorySpike();
    stopClusterAttack();
}
