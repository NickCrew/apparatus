import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";
import { broadcastTarpit } from "./sse-broadcast.js";
import { isValidIpLiteral, normalizeIp } from "./utils/ip.js";

const TRAP_PATHS = ["/wp-admin", "/.env", "/.git", "/admin.php"];
export const blockedIps = new Set<string>();

// Track when IPs were trapped for time-in-tarpit calculation
const trapTimes: Map<string, number> = new Map();

export function tarpitListHandler(_req: Request, res: Response) {
    const now = Date.now();
    const trapped = Array.from(blockedIps).map(ip => ({
        ip,
        trappedAt: trapTimes.get(ip) || now,
        duration: Math.floor((now - (trapTimes.get(ip) || now)) / 1000)
    }));
    res.json({
        count: trapped.length,
        trapPaths: TRAP_PATHS,
        trapped
    });
}

export function tarpitReleaseHandler(req: Request, res: Response) {
    const ip = normalizeIp(req.body?.ip);
    if (ip && ip !== "unknown" && blockedIps.has(ip)) {
        blockedIps.delete(ip);
        trapTimes.delete(ip);
        logger.info({ ip }, "Tarpit: IP released");
        broadcastTarpit('released', ip);
        res.json({ status: "released", ip });
    } else if (ip && ip !== "unknown") {
        res.status(404).json({ error: "IP not in tarpit" });
    } else {
        // Clear all - broadcast for each
        const ips = Array.from(blockedIps);
        const count = blockedIps.size;
        blockedIps.clear();
        trapTimes.clear();
        ips.forEach(ip => broadcastTarpit('released', ip));
        logger.info({ count }, "Tarpit: All IPs released");
        res.json({ status: "cleared", count });
    }
}

export function tarpitTrapHandler(req: Request, res: Response) {
    const ip = normalizeIp(req.body?.ip);
    if (!ip || ip === "unknown" || !isValidIpLiteral(ip)) {
        return res.status(400).json({ error: "Invalid ip" });
    }

    if (!blockedIps.has(ip)) {
        blockedIps.add(ip);
        trapTimes.set(ip, Date.now());
        logger.warn({ ip }, "Tarpit: IP trapped via control API");
        broadcastTarpit("trapped", ip);
    }

    return res.json({ status: "trapped", ip, count: blockedIps.size });
}

export function tarpitMiddleware(req: Request, res: Response, next: NextFunction) {
    const ip = normalizeIp(req.ip || req.socket.remoteAddress);

    // If IP is already flagged, Tarpit them
    if (blockedIps.has(ip)) {
        return enterTarpit(res);
    }

    // Check if they hit a Trap Route
    if (TRAP_PATHS.some(path => req.path.startsWith(path))) {
        if (!ip || ip === "unknown") {
            logger.warn({ path: req.path }, "Honeypot Triggered with unknown IP; entering one-shot tarpit.");
            return enterTarpit(res);
        }

        logger.warn({ ip, path: req.path }, "Honeypot Triggered! Activating Tarpit.");
        blockedIps.add(ip);
        trapTimes.set(ip, Date.now());
        broadcastTarpit('trapped', ip);
        return enterTarpit(res);
    }

    next();
}

function enterTarpit(res: Response) {
    // Send 200 OK headers to keep them happy
    res.writeHead(200, {
        "Content-Type": "text/html",
        "Transfer-Encoding": "chunked"
    });

    // Send 1 byte every 10 seconds
    const interval = setInterval(() => {
        if (!res.writableEnded) {
            res.write(" "); 
        } else {
            clearInterval(interval);
        }
    }, 10000);

    // Stop on disconnect or finish
    res.on("close", () => clearInterval(interval));
    res.on("finish", () => clearInterval(interval));
}
