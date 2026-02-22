import { Request, Response } from "express";

type AttackerGeoCategory = "internal" | "known_bot" | "unknown_external";
type AttackerTimelineKind = "request" | "deception" | "tarpit";
type AttackerKillChainStage = "recon" | "probe" | "exploitation" | "containment";

interface ScoreWeights {
    request: number;
    blocked: number;
    deception: number;
    tarpitTrap: number;
}

interface RequestSignal {
    ip?: string;
    method?: string;
    path?: string;
    status?: number;
    timestamp?: string;
    latencyMs?: number;
}

interface DeceptionSignal {
    ip?: string;
    type?: string;
    route?: string;
    details?: unknown;
    timestamp?: string;
}

interface TarpitSignal {
    ip?: string;
    action: "trapped" | "released";
    timestamp?: string;
}

interface AttackerCounters {
    requests: number;
    blocked: number;
    deception: number;
    tarpitTrapped: number;
    tarpitReleased: number;
}

interface AttackerTimelineEvent {
    kind: AttackerTimelineKind;
    stage: AttackerKillChainStage;
    timestamp: string;
    scoreDelta: number;
    detail: Record<string, unknown>;
}

export interface AttackerProfile {
    ip: string;
    geoCategory: AttackerGeoCategory;
    firstSeen: string;
    lastSeen: string;
    riskScore: number;
    counters: AttackerCounters;
    protocols: Record<string, number>;
    timeline: AttackerTimelineEvent[];
}

interface ListOptions {
    q?: string;
    minRisk?: number;
    category?: AttackerGeoCategory;
    limit?: number;
}

const MAX_TIMELINE_ITEMS = 200;
const DEFAULT_LIST_LIMIT = 100;
const MIN_LIST_LIMIT = 1;
const MAX_LIST_LIMIT = 500;

const KNOWN_BOT_PREFIXES = ["66.249.", "157.55.", "40.77.", "52.167.", "35.191."];

const DEFAULT_WEIGHTS: ScoreWeights = {
    request: 1,
    blocked: 10,
    deception: 50,
    tarpitTrap: 50,
};

let scoreWeights: ScoreWeights = { ...DEFAULT_WEIGHTS };
const profileMap = new Map<string, AttackerProfile>();

function normalizeIp(ip?: string): string | null {
    if (!ip) return null;
    const trimmed = ip.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("::ffff:")) {
        return trimmed.slice("::ffff:".length);
    }
    return trimmed;
}

function toIsoTimestamp(input?: string): string {
    if (!input) return new Date().toISOString();
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
}

function classifyGeoCategory(ip: string): AttackerGeoCategory {
    const normalized = normalizeIp(ip) || ip;
    if (
        normalized === "127.0.0.1" ||
        normalized === "::1" ||
        normalized.startsWith("10.") ||
        normalized.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    ) {
        return "internal";
    }

    if (KNOWN_BOT_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
        return "known_bot";
    }

    return "unknown_external";
}

function deriveProtocol(path: string): string {
    if (!path.startsWith("/")) return "unknown";
    if (path.startsWith("/hooks")) return "webhook";
    if (path.startsWith("/ws")) return "websocket";
    if (path.startsWith("/api/redteam")) return "redteam";
    if (path.startsWith("/api/simulator")) return "simulator";
    if (path.startsWith("/api")) return "api";
    if (path.startsWith("/console")) return "console";
    if (path.startsWith("/admin") || path.startsWith("/phpmyadmin")) return "admin";
    return "http";
}

function isBlockedStatus(status?: number): boolean {
    if (typeof status !== "number") return false;
    return status === 403 || status === 406 || status === 429;
}

function ensureProfile(ip: string, timestamp: string): AttackerProfile {
    const existing = profileMap.get(ip);
    if (existing) {
        existing.lastSeen = timestamp;
        return existing;
    }

    const profile: AttackerProfile = {
        ip,
        geoCategory: classifyGeoCategory(ip),
        firstSeen: timestamp,
        lastSeen: timestamp,
        riskScore: 0,
        counters: {
            requests: 0,
            blocked: 0,
            deception: 0,
            tarpitTrapped: 0,
            tarpitReleased: 0,
        },
        protocols: {},
        timeline: [],
    };

    profileMap.set(ip, profile);
    return profile;
}

function pushTimeline(profile: AttackerProfile, event: AttackerTimelineEvent): void {
    profile.timeline.unshift(event);
    if (profile.timeline.length > MAX_TIMELINE_ITEMS) {
        profile.timeline.length = MAX_TIMELINE_ITEMS;
    }
}

function applyScore(profile: AttackerProfile, delta: number): void {
    profile.riskScore = Math.max(0, profile.riskScore + delta);
}

function cloneProfile(profile: AttackerProfile): AttackerProfile {
    return {
        ...profile,
        counters: { ...profile.counters },
        protocols: { ...profile.protocols },
        timeline: profile.timeline.map((item) => ({ ...item, detail: { ...item.detail } })),
    };
}

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

export function resetAttackerTracker(): void {
    profileMap.clear();
    scoreWeights = { ...DEFAULT_WEIGHTS };
}

export function setAttackerTrackerWeights(partial: Partial<ScoreWeights>): void {
    scoreWeights = {
        ...scoreWeights,
        ...partial,
    };
}

export function recordRequestSignal(signal: RequestSignal): void {
    const ip = normalizeIp(signal.ip);
    if (!ip) return;

    const timestamp = toIsoTimestamp(signal.timestamp);
    const profile = ensureProfile(ip, timestamp);
    const path = typeof signal.path === "string" ? signal.path : "/";
    const method = typeof signal.method === "string" ? signal.method : "GET";
    const status = typeof signal.status === "number" ? signal.status : 200;
    const blocked = isBlockedStatus(status);

    let scoreDelta = scoreWeights.request;
    if (blocked) {
        scoreDelta += scoreWeights.blocked;
        profile.counters.blocked += 1;
    }

    profile.counters.requests += 1;
    profile.protocols[deriveProtocol(path)] = (profile.protocols[deriveProtocol(path)] || 0) + 1;
    applyScore(profile, scoreDelta);

    pushTimeline(profile, {
        kind: "request",
        stage: blocked ? "probe" : "recon",
        timestamp,
        scoreDelta,
        detail: {
            method,
            path,
            status,
            latencyMs: typeof signal.latencyMs === "number" ? signal.latencyMs : undefined,
        },
    });
}

export function recordDeceptionSignal(signal: DeceptionSignal): void {
    const ip = normalizeIp(signal.ip);
    if (!ip) return;

    const timestamp = toIsoTimestamp(signal.timestamp);
    const profile = ensureProfile(ip, timestamp);
    const scoreDelta = scoreWeights.deception;
    profile.counters.deception += 1;
    profile.protocols.deception = (profile.protocols.deception || 0) + 1;
    applyScore(profile, scoreDelta);

    const stage: AttackerKillChainStage =
        signal.type === "shell_command" ? "exploitation" : "probe";

    pushTimeline(profile, {
        kind: "deception",
        stage,
        timestamp,
        scoreDelta,
        detail: {
            type: signal.type || "unknown",
            route: signal.route || "unknown",
            details: signal.details ?? null,
        },
    });
}

export function recordTarpitSignal(signal: TarpitSignal): void {
    const ip = normalizeIp(signal.ip);
    if (!ip) return;

    const timestamp = toIsoTimestamp(signal.timestamp);
    const profile = ensureProfile(ip, timestamp);
    const scoreDelta = signal.action === "trapped" ? scoreWeights.tarpitTrap : 0;
    profile.protocols.tarpit = (profile.protocols.tarpit || 0) + 1;

    if (signal.action === "trapped") {
        profile.counters.tarpitTrapped += 1;
    } else {
        profile.counters.tarpitReleased += 1;
    }

    applyScore(profile, scoreDelta);

    pushTimeline(profile, {
        kind: "tarpit",
        stage: signal.action === "trapped" ? "containment" : "recon",
        timestamp,
        scoreDelta,
        detail: { action: signal.action },
    });
}

export function listAttackerProfiles(options: ListOptions = {}): AttackerProfile[] {
    const q = options.q?.toLowerCase().trim();
    const minRisk = typeof options.minRisk === "number" ? options.minRisk : undefined;
    const limit = Math.max(
        MIN_LIST_LIMIT,
        Math.min(MAX_LIST_LIMIT, options.limit ?? DEFAULT_LIST_LIMIT)
    );

    const results = Array.from(profileMap.values()).filter((profile) => {
        if (q && !profile.ip.toLowerCase().includes(q)) return false;
        if (typeof minRisk === "number" && profile.riskScore < minRisk) return false;
        if (options.category && profile.geoCategory !== options.category) return false;
        return true;
    });

    results.sort((a, b) => {
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
        return Date.parse(b.lastSeen) - Date.parse(a.lastSeen);
    });

    return results.slice(0, limit).map(cloneProfile);
}

export function getAttackerProfile(ip: string): AttackerProfile | null {
    const normalized = normalizeIp(ip);
    if (!normalized) return null;
    const profile = profileMap.get(normalized);
    return profile ? cloneProfile(profile) : null;
}

export function attackerRegistryHandler(req: Request, res: Response): void {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const minRiskRaw = toFiniteNumber(req.query.minRisk);
    const category =
        req.query.category === "internal" ||
        req.query.category === "known_bot" ||
        req.query.category === "unknown_external"
            ? req.query.category
            : undefined;
    const limitRaw = toFiniteNumber(req.query.limit);
    const limit = limitRaw == null ? undefined : Math.trunc(limitRaw);

    const profiles = listAttackerProfiles({
        q,
        minRisk: minRiskRaw == null ? undefined : minRiskRaw,
        category,
        limit,
    });

    res.json({
        count: profiles.length,
        tracked: profileMap.size,
        profiles,
    });
}

export function attackerProfileHandler(req: Request, res: Response): void {
    const encodedIp = typeof req.params.ip === "string" ? req.params.ip : "";
    let ip: string;
    try {
        ip = decodeURIComponent(encodedIp);
    } catch {
        res.status(400).json({ error: "Invalid IP encoding" });
        return;
    }

    const profile = getAttackerProfile(ip);
    if (!profile) {
        res.status(404).json({ error: "Attacker profile not found" });
        return;
    }

    res.json(profile);
}
