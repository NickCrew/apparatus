import { allocateMemorySpike, clearMemorySpike, scheduleCrash, stopCpuSpike, triggerCpuSpike } from "./chaos.js";
import { broadcastClusterAttack, broadcastClusterStop, stopClusterAttack } from "./cluster.js";
import { setMtdPrefix } from "./mtd.js";

export const TOOL_ACTIONS = ["chaos.cpu", "chaos.memory", "cluster.attack", "mtd.rotate", "delay", "chaos.crash"] as const;
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
