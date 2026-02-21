import dgram from "dgram";
import { createHmac, timingSafeEqual } from "crypto";
import net from "net";
import { logger } from "./logger.js";
import { request } from "undici";
import { Request, Response } from "express";
import os from "os";
import { cfg } from "./config.js";

const DEFAULT_GOSSIP_PORT = 7946;
const CLUSTER_COMMAND_TTL_MS = 30_000;
const MAX_RECENT_SIGNATURES = 2048;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const CLUSTER_SHARED_SECRET = process.env.CLUSTER_SHARED_SECRET || "";
const CLUSTER_ATTACK_ALLOWLIST = (process.env.CLUSTER_ATTACK_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
let gossipPort = DEFAULT_GOSSIP_PORT;
const members = new Map<string, number>(); // IP -> LastSeen Timestamp
const recentSignatures = new Map<string, number>();
const commandMetrics = {
    received: 0,
    authorized: 0,
    rejected: 0,
};
const myIp = getLocalIp();

function canonicalizeForSignature(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(canonicalizeForSignature);
    }

    if (value && typeof value === "object") {
        const sortedEntries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, nested]) => [key, canonicalizeForSignature(nested)]);
        return Object.fromEntries(sortedEntries);
    }

    return value;
}

function serializeForSignature(payload: Record<string, unknown>) {
    return JSON.stringify(canonicalizeForSignature(payload));
}

export function createClusterCommandSignature(secret: string, payload: Record<string, unknown>) {
    return createHmac("sha256", secret)
        .update(serializeForSignature(payload))
        .digest("hex");
}

function isLoopbackAddress(value: string) {
    const normalized = value.trim().toLowerCase();
    if (LOOPBACK_HOSTS.has(normalized)) {
        return true;
    }

    if (normalized.startsWith("::ffff:")) {
        const ipv4Mapped = normalized.slice("::ffff:".length);
        return ipv4Mapped.startsWith("127.");
    }

    const ipVersion = net.isIP(normalized);
    if (ipVersion === 4) {
        return normalized.startsWith("127.");
    }
    return false;
}

function isPrivateIpv4(host: string) {
    const octets = host.split(".").map((part) => Number(part));
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        return false;
    }

    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    return false;
}

function hostMatchesAllowlist(host: string) {
    if (CLUSTER_ATTACK_ALLOWLIST.length === 0) return false;
    return CLUSTER_ATTACK_ALLOWLIST.some((entry) => {
        if (entry.startsWith(".")) {
            return host.endsWith(entry);
        }
        return host === entry;
    });
}

function isAllowedClusterTargetHost(host: string) {
    const normalizedHost = host.toLowerCase();
    if (hostMatchesAllowlist(normalizedHost)) {
        return true;
    }

    if (normalizedHost === "localhost") {
        return true;
    }

    const ipVersion = net.isIP(normalizedHost);
    if (ipVersion === 4) {
        return isPrivateIpv4(normalizedHost);
    }
    if (ipVersion === 6) {
        return normalizedHost === "::1" || normalizedHost.startsWith("fc") || normalizedHost.startsWith("fd");
    }

    return false;
}

function getLocalIp() {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name] || []) {
            if (!iface.internal && iface.family === "IPv4") {
                return iface.address;
            }
        }
    }
    return "127.0.0.1";
}

interface ClusterCommandPayload extends Record<string, unknown> {
    signature?: string;
    ts?: number;
}

class AttackCommandValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AttackCommandValidationError";
    }
}

function isAuthorizedClusterCommand(data: ClusterCommandPayload, sourceIp: string) {
    if (!CLUSTER_SHARED_SECRET) {
        const isLoopbackBind = isLoopbackAddress(cfg.host);
        if (!isLoopbackBind) {
            commandMetrics.rejected += 1;
            return false;
        }

        const acceptedUnsignedSource = isLoopbackAddress(sourceIp);
        if (acceptedUnsignedSource) {
            commandMetrics.authorized += 1;
            logger.warn({ sourceIp }, "Cluster: Accepting unsigned command because CLUSTER_SHARED_SECRET is unset");
        } else {
            commandMetrics.rejected += 1;
        }
        return acceptedUnsignedSource;
    }

    if (typeof data?.signature !== "string") {
        commandMetrics.rejected += 1;
        return false;
    }

    const { signature, ...unsignedPayload } = data;
    if (!/^[0-9a-fA-F]+$/.test(signature) || signature.length % 2 !== 0) {
        commandMetrics.rejected += 1;
        return false;
    }
    const timestamp = unsignedPayload.ts;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
        commandMetrics.rejected += 1;
        return false;
    }
    if (Math.abs(Date.now() - timestamp) > CLUSTER_COMMAND_TTL_MS) {
        commandMetrics.rejected += 1;
        return false;
    }

    const expected = createHmac("sha256", CLUSTER_SHARED_SECRET)
        .update(serializeForSignature(unsignedPayload))
        .digest();
    const provided = Buffer.from(signature, "hex");

    if (provided.length !== expected.length) {
        commandMetrics.rejected += 1;
        return false;
    }
    if (!timingSafeEqual(provided, expected)) {
        commandMetrics.rejected += 1;
        return false;
    }

    const signatureKey = signature.toLowerCase();
    const now = Date.now();
    for (const [existingSignature, seenAt] of recentSignatures) {
        if (now - seenAt > CLUSTER_COMMAND_TTL_MS) {
            recentSignatures.delete(existingSignature);
        }
    }
    if (recentSignatures.has(signatureKey)) {
        commandMetrics.rejected += 1;
        return false;
    }
    recentSignatures.set(signatureKey, now);
    if (recentSignatures.size > MAX_RECENT_SIGNATURES) {
        const oldest = recentSignatures.keys().next().value;
        if (oldest) {
            recentSignatures.delete(oldest);
        }
    }

    commandMetrics.authorized += 1;
    return true;
}

export function startClusterNode(options: { port?: number; host?: string } = {}) {
    const host = options.host;
    gossipPort = options.port ?? gossipPort;
    const socket = dgram.createSocket("udp4");

    if (!CLUSTER_SHARED_SECRET) {
        if (isLoopbackAddress(cfg.host)) {
            logger.warn("Cluster shared secret is unset. Remote cluster commands are denied by default.");
        } else {
            logger.error({ host: cfg.host }, "Cluster shared secret is unset while bound non-loopback; unsigned remote commands will be rejected.");
        }
    }
    
    // Listen for beacons
    socket.on("message", (msg, rinfo) => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.type === "BEACON" && data.ip !== myIp) {
                if (!members.has(data.ip)) {
                    logger.info({ newMember: data.ip }, "Cluster: New Node Discovered");
                }
                members.set(data.ip, Date.now());
            }
            if (data.type === "ATTACK") {
                commandMetrics.received += 1;
                if (!isAuthorizedClusterCommand(data, rinfo.address)) {
                    logger.warn({ ip: rinfo.address }, "Cluster: Ignoring unauthorized ATTACK command");
                    return;
                }
                try {
                    const valid = validateAttackCommand(String(data.target), Number(data.rate));
                    executeAttack(valid.target, valid.rate);
                } catch (error: any) {
                    logger.warn(
                        { ip: rinfo.address, target: data?.target, error: error?.message || String(error) },
                        "Cluster: Rejecting invalid ATTACK command"
                    );
                }
            }
            if (data.type === "STOP_ATTACK") {
                commandMetrics.received += 1;
                if (!isAuthorizedClusterCommand(data, rinfo.address)) {
                    logger.warn({ ip: rinfo.address }, "Cluster: Ignoring unauthorized STOP_ATTACK command");
                    return;
                }
                stopClusterAttack();
            }
        } catch (error: any) {
            logger.debug({ ip: rinfo.address, error: error?.message || String(error) }, "Cluster: Ignoring invalid gossip payload");
        }
    });

    socket.bind(gossipPort, host, () => {
        socket.setBroadcast(true);
    });

    const beaconInterval = setInterval(() => {
        const beacon = JSON.stringify({ type: "BEACON", ip: myIp });
        socket.send(beacon, gossipPort, "255.255.255.255");
        
        const now = Date.now();
        for (const [ip, lastSeen] of members) {
            if (now - lastSeen > 15000) members.delete(ip);
        }
    }, 5000);
    
    logger.info({ port: gossipPort, ip: myIp }, "Cluster Gossip Started");

    return {
        socket,
        port: () => gossipPort,
        stop: () => {
            clearInterval(beaconInterval);
            stopClusterAttack();
            socket.close();
        }
    };
}

let attackInterval: NodeJS.Timeout | null = null;
let attackStopTimeout: NodeJS.Timeout | null = null;

export function isClusterAttackActive() {
    return Boolean(attackInterval);
}

function executeAttack(target: string, rate: number) {
    if (attackInterval) clearInterval(attackInterval);
    if (attackStopTimeout) clearTimeout(attackStopTimeout);
    logger.warn({ target, rate }, "Cluster: Starting Distributed Attack");
    
    const delay = 1000 / rate;
    attackInterval = setInterval(() => {
        request(target).catch(() => {}); // Fire and forget
    }, delay);

    // Stop after 30s
    attackStopTimeout = setTimeout(() => {
        stopClusterAttack();
        logger.info("Cluster: Attack Finished");
    }, 30000);
}

export function stopClusterAttack() {
    const hadAttack = Boolean(attackInterval);
    if (attackInterval) {
        clearInterval(attackInterval);
        attackInterval = null;
    }
    if (attackStopTimeout) {
        clearTimeout(attackStopTimeout);
        attackStopTimeout = null;
    }
    return hadAttack;
}

async function broadcastClusterCommand(command: Record<string, unknown>) {
    await new Promise<void>((resolve, reject) => {
        const socket = dgram.createSocket("udp4");
        let closed = false;
        let settled = false;
        let timeoutTimer: NodeJS.Timeout | undefined;

        const safeClose = () => {
            if (!closed) {
                closed = true;
                socket.close();
            }
        };

        const complete = (error?: Error | null) => {
            if (settled) return;
            settled = true;
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
            }
            safeClose();
            if (error) {
                reject(error);
                return;
            }
            resolve();
        };

        timeoutTimer = setTimeout(() => {
            complete(new Error("Cluster broadcast timed out"));
        }, 5000);

        socket.once("error", (error) => {
            complete(error);
        });

        socket.bind(() => {
            socket.setBroadcast(true);
            const basePayload: Record<string, unknown> = {
                ...command,
                ts: Date.now(),
            };
            const payload = JSON.stringify(CLUSTER_SHARED_SECRET
                ? {
                    ...basePayload,
                    signature: createClusterCommandSignature(CLUSTER_SHARED_SECRET, basePayload),
                }
                : basePayload
            );
            socket.send(payload, gossipPort, "255.255.255.255", (error) => {
                if (error) {
                    complete(error);
                    return;
                }
                complete();
            });
        });
    });
}

export function validateAttackCommand(target: string, rate: number) {
    if (!target) throw new AttackCommandValidationError("Missing target");
    if (!Number.isFinite(rate) || rate <= 0) throw new AttackCommandValidationError("Invalid rate");

    let parsed: URL;
    try {
        parsed = new URL(target);
    } catch {
        throw new AttackCommandValidationError("Invalid target URL");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new AttackCommandValidationError("Target URL must be http/https");
    }

    if (!isAllowedClusterTargetHost(parsed.hostname)) {
        throw new AttackCommandValidationError("Target host is not allowed for cluster attack");
    }

    return {
        target: parsed.toString(),
        rate: Math.min(2000, Math.max(1, Math.trunc(rate))),
    };
}

export async function broadcastClusterAttack(target: string, rate: number) {
    const valid = validateAttackCommand(target, rate);
    await broadcastClusterCommand({ type: "ATTACK", target: valid.target, rate: valid.rate });
    return { message: "Attack command broadcasted to cluster", nodes: members.size + 1 };
}

export async function broadcastClusterStop() {
    await broadcastClusterCommand({ type: "STOP_ATTACK" });
    stopClusterAttack();
    return { message: "Stop command broadcasted to cluster", nodes: members.size + 1 };
}

// Handler to trigger the cluster attack
export async function clusterAttackHandler(req: Request, res: Response) {
    // Security boundary note: app.ts mounts this endpoint behind securityGate.
    const { target, rate } = req.body;
    if (!target) return res.status(400).json({ error: "Missing target" });
    if (rate === undefined || rate === null) return res.status(400).json({ error: "Missing rate" });

    try {
        const result = await broadcastClusterAttack(String(target), Number(rate));
        res.json(result);
    } catch (error: any) {
        if (error instanceof AttackCommandValidationError) {
            return res.status(400).json({ error: error?.message || "Invalid attack command" });
        }

        logger.error({ error: error?.message || String(error) }, "Cluster attack broadcast failed");
        return res.status(500).json({ error: error?.message || "Failed to broadcast cluster attack command" });
    }
}

export async function clusterAttackStopHandler(_req: Request, res: Response) {
    // Security boundary note: app.ts mounts this endpoint behind securityGate.
    try {
        const result = await broadcastClusterStop();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error?.message || "Failed to broadcast cluster stop command" });
    }
}

export function getClusterMembers() {
    const list = Array.from(members.entries()).map(([ip, lastSeen]) => ({
        ip,
        role: "peer",
        status: "active",
        lastSeen
    }));
    
    // Add self
    list.unshift({
        ip: myIp,
        role: "self",
        status: "active",
        lastSeen: Date.now()
    });
    
    return list;
}

export function getClusterCommandMetrics() {
    return { ...commandMetrics };
}
