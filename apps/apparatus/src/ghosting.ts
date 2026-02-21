import { NextFunction, Request, Response } from "express";
import net from "net";
import { request } from "undici";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

let ghostInterval: NodeJS.Timeout | null = null;

const USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1"
];

const PATHS = [
    "/echo",
    "/healthz",
    "/docs",
    "/",
    "/history"
];

const RESERVED_GHOST_PREFIXES = [
    "/ghosts",
    "/healthz",
    "/health",
    "/metrics",
    "/sse",
    "/docs",
    "/_sensor",
    "/cluster",
    "/auth",
    "/.well-known",
    "/debug",
    "/redteam",
    "/sentinel",
    "/proxy",
    "/mtd",
    "/scenarios",
    "/drills",
    "/api/redteam",
    "/api/simulator",
    "/victim",
    "/tarpit",
    "/deception",
    "/capture.pcap",
    "/replay",
    "/kv",
    "/script",
    "/dashboard",
    "/graphql",
    "/sink",
    "/generate",
    "/dlp",
    "/drain",
    "/upload",
    "/download",
    "/history",
    "/ratelimit",
    "/chaos",
    "/malicious",
    "/dns",
    "/ping",
    "/hooks",
    "/echo",
    "/ws",
];
const GHOST_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const MAX_INFLIGHT_GHOST_REQUESTS = 200;
const MAX_VIRTUAL_GHOSTS = 500;
const configuredGhostPorts = (process.env.GHOST_ALLOWED_PORTS || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 65535);
const ALLOWED_GHOST_TARGET_PORTS = new Set<number>([
    cfg.portHttp1,
    cfg.portHttp2,
    cfg.portHttp1 + 1, // h2c sidecar port used by Apparatus when HTTP/2 cleartext is enabled
    ...configuredGhostPorts,
]);

interface GhostStartOptions {
    target?: string;
    delay?: number;
}

type GhostMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface GhostLatencyFixed {
    mode: "fixed";
    ms: number;
}

interface GhostLatencyJitter {
    mode: "jitter";
    minMs: number;
    maxMs: number;
}

type GhostLatency = GhostLatencyFixed | GhostLatencyJitter;

interface GhostBehavior {
    latency: GhostLatency;
    errorRate: number;
}

export interface GhostDefinition {
    id: string;
    route: string;
    method: GhostMethod;
    responseBody: unknown;
    behavior: GhostBehavior;
    requestCount: number;
    createdAt: string;
    lastHitAt?: string;
}

interface GhostCreatePayload {
    route?: unknown;
    method?: unknown;
    responseBody?: unknown;
    behavior?: {
        latency?: unknown;
        latencyMs?: unknown;
        jitterMs?: { min?: unknown; max?: unknown };
        errorRate?: unknown;
    };
}

const virtualGhosts = new Map<string, GhostDefinition>();
let inflightGhostRequests = 0;

function normalizeRoutePath(route: string) {
    const trimmed = route.trim();
    if (!trimmed) {
        throw new Error("Route is required");
    }
    if (!trimmed.startsWith("/")) {
        throw new Error("Route must start with /");
    }
    if (trimmed.includes("://")) {
        throw new Error("Route must be a path, not a full URL");
    }

    const pathOnly = trimmed.split("?")[0] || "/";
    const normalized = pathOnly.length > 1 && pathOnly.endsWith("/")
        ? pathOnly.slice(0, -1)
        : pathOnly;

    if (RESERVED_GHOST_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
        throw new Error("Route is reserved for ghost management APIs");
    }

    return normalized;
}

function normalizeGhostMethod(method: unknown): GhostMethod {
    if (typeof method !== "string") {
        throw new Error("Method is required");
    }

    const normalized = method.toUpperCase();
    if (!GHOST_METHODS.has(normalized)) {
        throw new Error(`Unsupported method: ${method}`);
    }

    return normalized as GhostMethod;
}

function clampInteger(value: unknown, min: number, max: number, field: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid ${field}`);
    }
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function parseGhostBehavior(raw: GhostCreatePayload["behavior"]): GhostBehavior {
    const errorRateRaw = raw?.errorRate ?? 0;
    const errorRate = Number.isFinite(Number(errorRateRaw))
        ? Math.max(0, Math.min(100, Number(errorRateRaw)))
        : 0;

    const latencyRaw = raw?.latency;
    if (latencyRaw && typeof latencyRaw === "object") {
        const latency = latencyRaw as Record<string, unknown>;
        if (latency.mode === "jitter") {
            const minMs = clampInteger(latency.minMs, 0, 30000, "latency.minMs");
            const maxMs = clampInteger(latency.maxMs, 0, 30000, "latency.maxMs");
            if (maxMs < minMs) {
                throw new Error("latency.maxMs must be >= latency.minMs");
            }
            return {
                errorRate,
                latency: {
                    mode: "jitter",
                    minMs,
                    maxMs,
                },
            };
        }

        const ms = clampInteger(latency.ms, 0, 30000, "latency.ms");
        return {
            errorRate,
            latency: {
                mode: "fixed",
                ms,
            },
        };
    }

    if (raw?.jitterMs) {
        const minMs = clampInteger(raw.jitterMs.min, 0, 30000, "jitterMs.min");
        const maxMs = clampInteger(raw.jitterMs.max, 0, 30000, "jitterMs.max");
        if (maxMs < minMs) {
            throw new Error("jitterMs.max must be >= jitterMs.min");
        }
        return {
            errorRate,
            latency: {
                mode: "jitter",
                minMs,
                maxMs,
            },
        };
    }

    const fixedMs = raw?.latencyMs === undefined
        ? 0
        : clampInteger(raw.latencyMs, 0, 30000, "latencyMs");

    return {
        errorRate,
        latency: {
            mode: "fixed",
            ms: fixedMs,
        },
    };
}

function findGhostByRequest(method: string, route: string) {
    for (const ghost of virtualGhosts.values()) {
        if (ghost.method === method && ghost.route === route) {
            return ghost;
        }
    }
    return null;
}

function computeGhostLatencyMs(latency: GhostLatency) {
    if (latency.mode === "fixed") {
        return latency.ms;
    }
    const span = latency.maxMs - latency.minMs;
    if (span <= 0) {
        return latency.minMs;
    }
    return latency.minMs + Math.floor(Math.random() * (span + 1));
}

function isIpv4MappedLoopback(host: string) {
    if (!host.startsWith("::ffff:")) {
        return false;
    }

    const mapped = host.slice("::ffff:".length);
    if (mapped.startsWith("127.")) {
        return true;
    }

    const hexParts = mapped.split(":");
    if (hexParts.length !== 2 || hexParts.some((part) => !/^[0-9a-f]{1,4}$/i.test(part))) {
        return false;
    }

    const upper = Number.parseInt(hexParts[0] || "0", 16);
    const firstOctet = (upper >> 8) & 0xff;
    return firstOctet === 127;
}

function validateGhostTarget(target: string) {
    let parsed: URL;
    try {
        parsed = new URL(target);
    } catch {
        throw new Error("Invalid target URL");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Ghost target must use http/https");
    }

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const ipVersion = net.isIP(host);
    const isLoopbackIpv4 = ipVersion === 4 && host.startsWith("127.");
    const isLoopbackIpv6 = ipVersion === 6 && (host === "::1" || host === "0:0:0:0:0:0:0:1" || isIpv4MappedLoopback(host));
    const isLocalHost = isLoopbackIpv4 || isLoopbackIpv6;

    if (!isLocalHost) {
        throw new Error("Ghost target must use a loopback IP literal");
    }

    const explicitPort = parsed.port ? Number(parsed.port) : undefined;
    const inferredPort = explicitPort ?? (parsed.protocol === "https:" ? 443 : 80);
    if (!ALLOWED_GHOST_TARGET_PORTS.has(inferredPort)) {
        throw new Error("Ghost target port is not allowed");
    }

    return parsed.toString();
}

export function getGhostStatus() {
    return ghostInterval ? "running" : "stopped";
}

export function stopGhostTraffic() {
    if (ghostInterval) {
        clearInterval(ghostInterval);
        ghostInterval = null;
    }
    return { status: "stopped" as const };
}

export function startGhostTraffic(options: GhostStartOptions = {}) {
    if (ghostInterval) return { status: "already_running" as const };

    const targetBase = options.target
        ? validateGhostTarget(options.target)
        : `http://127.0.0.1:${cfg.portHttp1}`;
    const parsedDelay = Number(options.delay);
    const delay = Number.isFinite(parsedDelay) ? Math.max(25, Math.min(5000, Math.trunc(parsedDelay))) : 1000;

    logger.info({ target: targetBase, delay }, "Starting Ghost Traffic");

    ghostInterval = setInterval(async () => {
        const path = PATHS[Math.floor(Math.random() * PATHS.length)];
        const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

        try {
            const requestOptions = {
                headers: { "User-Agent": ua },
                maxRedirections: 0,
            } as any;
            await request(`${targetBase}${path}`, requestOptions);
        } catch (_e) {
            // Ignore errors, ghosts don't care
        }
    }, delay);

    return { status: "started" as const, target: targetBase };
}

function listGhosts() {
    return Array.from(virtualGhosts.values());
}

export function createVirtualGhost(payload: GhostCreatePayload) {
    if (virtualGhosts.size >= MAX_VIRTUAL_GHOSTS) {
        throw new Error("Maximum number of virtual ghosts reached");
    }

    if (typeof payload.route !== "string") {
        throw new Error("route is required");
    }

    const route = normalizeRoutePath(payload.route);
    const method = normalizeGhostMethod(payload.method ?? "GET");

    const duplicate = findGhostByRequest(method, route);
    if (duplicate) {
        throw new Error("A ghost with this method and route already exists");
    }

    const behavior = parseGhostBehavior(payload.behavior);
    const ghost: GhostDefinition = {
        id: `ghost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        route,
        method,
        responseBody: payload.responseBody ?? {},
        behavior,
        requestCount: 0,
        createdAt: new Date().toISOString(),
    };

    virtualGhosts.set(ghost.id, ghost);
    logger.info({ ghostId: ghost.id, method: ghost.method, route: ghost.route }, "Created virtual ghost");
    return ghost;
}

export function deleteVirtualGhost(id: string) {
    return virtualGhosts.delete(id);
}

export function resetGhostStateForTests() {
    virtualGhosts.clear();
    stopGhostTraffic();
    inflightGhostRequests = 0;
}

export async function ghostMockMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        if (req.path === "/ghosts" || req.path.startsWith("/ghosts/")) {
            return next();
        }

        const method = req.method.toUpperCase();
        const route = req.path.length > 1 && req.path.endsWith("/")
            ? req.path.slice(0, -1)
            : req.path;

        const ghost = findGhostByRequest(method, route);
        if (!ghost) {
            return next();
        }

        if (inflightGhostRequests >= MAX_INFLIGHT_GHOST_REQUESTS) {
            return res.status(503).json({
                error: "Too many concurrent ghost requests",
                limit: MAX_INFLIGHT_GHOST_REQUESTS,
            });
        }

        inflightGhostRequests += 1;
        try {
            ghost.requestCount += 1;
            ghost.lastHitAt = new Date().toISOString();

            const latencyMs = computeGhostLatencyMs(ghost.behavior.latency);
            if (latencyMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, latencyMs));
            }

            if (Math.random() * 100 < ghost.behavior.errorRate) {
                return res.status(500).json({
                    error: "Ghost injected failure",
                    ghostId: ghost.id,
                    route: ghost.route,
                    method: ghost.method,
                });
            }

            res.setHeader("x-ghost-id", ghost.id);
            return res.status(200).json(ghost.responseBody);
        } finally {
            inflightGhostRequests = Math.max(0, inflightGhostRequests - 1);
        }
    } catch (error) {
        return next(error);
    }
}

export function ghostHandler(req: Request, res: Response) {
    const action = req.query.action as string | undefined;

    if (action === "start") {
        logger.warn("Deprecated ghost control via GET /ghosts?action=start. Use POST /ghosts/start instead.");
        try {
            const result = startGhostTraffic({
                target: req.query.target as string | undefined,
                delay: req.query.delay ? Number(req.query.delay) : undefined,
            });
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error?.message || "Invalid ghost start options" });
        }
    }

    if (action === "stop") {
        logger.warn("Deprecated ghost control via GET /ghosts?action=stop. Use POST /ghosts/stop instead.");
        return res.json(stopGhostTraffic());
    }

    if (action === "status") {
        return res.json({ status: getGhostStatus() });
    }

    return res.json({
        status: getGhostStatus(),
        ghosts: listGhosts(),
    });
}

export function ghostCreateHandler(req: Request, res: Response) {
    try {
        const created = createVirtualGhost(req.body as GhostCreatePayload);
        return res.status(201).json(created);
    } catch (error: any) {
        return res.status(400).json({ error: error?.message || "Invalid ghost payload" });
    }
}

export function ghostDeleteHandler(req: Request, res: Response) {
    const id = req.params.id;
    if (!id) {
        return res.status(400).json({ error: "Ghost id is required" });
    }

    const deleted = deleteVirtualGhost(id);
    if (!deleted) {
        return res.status(404).json({ error: "Ghost not found" });
    }

    return res.json({ status: "deleted", id });
}

export function ghostStartHandler(req: Request, res: Response) {
    try {
        const result = startGhostTraffic({
            target: req.body?.target,
            delay: req.body?.delay,
        });
        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error?.message || "Invalid ghost start options" });
    }
}

export function ghostStopHandler(_req: Request, res: Response) {
    return res.json(stopGhostTraffic());
}
