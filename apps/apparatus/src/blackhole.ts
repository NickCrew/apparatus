import { NextFunction, Request, Response } from "express";
import { logger } from "./logger.js";
import { broadcastRequest } from "./sse-broadcast.js";
import { isValidIpLiteral, normalizeIp } from "./utils/ip.js";

const MANAGEMENT_ALLOWLIST_PREFIXES = ["/blackhole", "/tarpit", "/api/attackers"];

export const blackholedIps = new Set<string>();
const blackholeTimes = new Map<string, number>();

export function resetBlackholeState(): void {
    blackholedIps.clear();
    blackholeTimes.clear();
}

function isManagementRequest(path: string): boolean {
    return MANAGEMENT_ALLOWLIST_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function blackholeListHandler(_req: Request, res: Response) {
    const now = Date.now();
    const blocked = Array.from(blackholedIps).map((ip) => {
        const blockedAt = blackholeTimes.get(ip) ?? now;
        return {
            ip,
            blockedAt,
            duration: Math.floor((now - blockedAt) / 1000),
        };
    });

    res.json({
        count: blocked.length,
        blocked,
    });
}

export function blackholeAddHandler(req: Request, res: Response) {
    const ip = normalizeIp(req.body?.ip);
    if (!ip || ip === "unknown" || !isValidIpLiteral(ip)) {
        return res.status(400).json({ error: "Invalid ip" });
    }

    if (!blackholedIps.has(ip)) {
        blackholedIps.add(ip);
        blackholeTimes.set(ip, Date.now());
        logger.warn({ ip }, "Blackhole: IP blocked globally");
    }

    return res.json({ status: "blocked", ip, count: blackholedIps.size });
}

export function blackholeReleaseHandler(req: Request, res: Response) {
    const rawIp = req.body?.ip;
    if (
        rawIp === undefined
        || rawIp === null
        || (typeof rawIp === "string" && (!rawIp.trim() || rawIp.trim().toLowerCase() === "unknown"))
    ) {
        const count = blackholedIps.size;
        blackholedIps.clear();
        blackholeTimes.clear();
        logger.info({ count }, "Blackhole: all IPs released");
        return res.json({ status: "cleared", count });
    }

    if (typeof rawIp !== "string") {
        return res.status(400).json({ error: "Invalid ip" });
    }

    const ip = normalizeIp(rawIp);
    if (ip === "unknown" || !isValidIpLiteral(ip)) {
        return res.status(400).json({ error: "Invalid ip" });
    }

    if (!blackholedIps.has(ip)) {
        return res.status(404).json({ error: "IP not blackholed" });
    }

    blackholedIps.delete(ip);
    blackholeTimes.delete(ip);
    logger.info({ ip }, "Blackhole: IP released");
    return res.json({ status: "released", ip, count: blackholedIps.size });
}

export function blackholeMiddleware(req: Request, res: Response, next: NextFunction) {
    const ip = normalizeIp(req.ip || req.socket.remoteAddress);
    const isBlocked = blackholedIps.has(ip);
    const isUnknown = ip === "unknown";

    if ((isBlocked || isUnknown) && !isManagementRequest(req.path)) {
        logger.warn({ ip, method: req.method, path: req.path }, "Blackhole: request denied");

        const now = new Date().toISOString();
        try {
            broadcastRequest({
                method: req.method,
                path: req.path,
                status: 403,
                ip,
                timestamp: now,
                latencyMs: 0,
                blockedBy: "blackhole",
            });
        } catch (error) {
            logger.warn({ err: error, ip, method: req.method, path: req.path }, "Blackhole: SSE broadcast failed");
        }

        return res.status(403).json({
            error: "Request blocked by global blackhole",
            ip,
        });
    }

    return next();
}
