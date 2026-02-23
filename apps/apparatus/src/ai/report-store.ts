import { ToolAction } from "../tool-executor.js";
import { DEFAULT_AUTOPILOT_PERSONA_ID } from "./personas.js";
import type { AutopilotPersonaId } from "./personas.js";

export type AutopilotSessionState = "idle" | "running" | "stopping" | "stopped" | "completed" | "failed";
export type SessionAssetType = "endpoint" | "credential" | "token" | "service" | "host" | "vuln" | "path" | "indicator";
export type SessionObservationKind = "tool-output" | "verification" | "objective-progress" | "system";
export type SessionRelationType = "discovered_by" | "targets" | "confirms" | "escalates_to" | "related_to";
export type ObjectiveProgressSignalType = "preconditionsMet" | "openedPaths" | "breakSignals";

export const SESSION_CONTEXT_LIMITS = {
    assets: 128,
    observations: 256,
    relations: 256,
    objectiveSignals: 64,
} as const;

export interface SessionContextAsset {
    id: string;
    type: SessionAssetType;
    value: string;
    source: string;
    confidence: number;
    firstSeenAt: string;
    lastSeenAt: string;
    occurrences: number;
    metadata?: Record<string, unknown>;
}

export interface SessionContextObservation {
    id: string;
    kind: SessionObservationKind;
    source: string;
    summary: string;
    fingerprint: string;
    firstSeenAt: string;
    lastSeenAt: string;
    occurrences: number;
    details?: Record<string, unknown>;
}

export interface SessionContextRelation {
    id: string;
    type: SessionRelationType;
    fromAssetId: string;
    toAssetId: string;
    source: string;
    confidence: number;
    firstSeenAt: string;
    lastSeenAt: string;
    occurrences: number;
    metadata?: Record<string, unknown>;
}

export interface SessionObjectiveProgress {
    preconditionsMet: string[];
    openedPaths: string[];
    breakSignals: string[];
    lastUpdatedAt?: string;
}

export interface SessionContext {
    assets: SessionContextAsset[];
    observations: SessionContextObservation[];
    relations: SessionContextRelation[];
    objectiveProgress: SessionObjectiveProgress;
}

export interface SessionContextAssetInput {
    type: SessionAssetType;
    value: string;
    source: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
    at?: string;
}

export interface SessionContextObservationInput {
    kind: SessionObservationKind;
    source: string;
    summary: string;
    details?: Record<string, unknown>;
    at?: string;
}

export interface SessionContextRelationInput {
    type: SessionRelationType;
    fromAssetId: string;
    toAssetId: string;
    source: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
    at?: string;
}

export interface RuntimeSnapshot {
    capturedAt: string;
    rps: number;
    requestCount: number;
    errorCount: number;
    errorRate: number;
    avgLatencyMs: number;
    cpuPercent: number;
    memPercent: number;
    healthy: boolean;
}

export interface DecisionRecord {
    tool: ToolAction | "none";
    reason: string;
    params: Record<string, unknown>;
    rawModelOutput?: string;
    maneuver?: {
        triggerSignal: string;
        countermeasure: ToolAction | "none";
        rationale: string;
    };
}

export interface VerificationRecord {
    broken: boolean;
    crashDetected: boolean;
    newServerErrors: number;
    notes: string;
}

export interface ThoughtEntry {
    id: string;
    at: string;
    phase: "analyze" | "decide" | "act" | "verify" | "report" | "system";
    message: string;
}

export interface ActionEntry {
    id: string;
    at: string;
    tool: ToolAction;
    params: Record<string, unknown>;
    ok: boolean;
    message: string;
    maneuver?: {
        triggerSignal: string;
        countermeasure: ToolAction | "none";
        rationale: string;
    };
}

export interface RedTeamFinding {
    id: string;
    sessionId: string;
    iteration: number;
    objective: string;
    before: RuntimeSnapshot;
    after: RuntimeSnapshot;
    decision: DecisionRecord;
    verification: VerificationRecord;
    createdAt: string;
}

export interface RedTeamSessionSummary {
    completedAt: string;
    totalIterations: number;
    breakingPointRps?: number;
    failureReason?: string;
}

export interface RedTeamSession {
    id: string;
    objective: string;
    targetBaseUrl: string;
    state: AutopilotSessionState;
    createdAt: string;
    startedAt?: string;
    endedAt?: string;
    iteration: number;
    maxIterations: number;
    persona: AutopilotPersonaId;
    allowedTools: ToolAction[];
    thoughts: ThoughtEntry[];
    actions: ActionEntry[];
    findings: RedTeamFinding[];
    sessionContext: SessionContext;
    summary?: RedTeamSessionSummary;
    error?: string;
}

const sessions = new Map<string, RedTeamSession>();
const reports: RedTeamFinding[] = [];
const MAX_SESSIONS = 100;
const MAX_REPORTS = 3000;

function normalizeWhitespace(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

export function normalizeSessionContextValue(value: string) {
    return normalizeWhitespace(value).toLowerCase();
}

function normalizeSource(value: string) {
    const normalized = normalizeWhitespace(value);
    return normalized || "unknown";
}

function clampConfidence(value: number | undefined) {
    if (!Number.isFinite(value)) return 0.5;
    return Math.max(0, Math.min(1, value as number));
}

function pruneFromHead<T>(items: T[], maxSize: number) {
    if (items.length <= maxSize) return;
    items.splice(0, items.length - maxSize);
}

function hashText(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function nowIso() {
    return new Date().toISOString();
}

function toIso(value?: string) {
    if (!value) return nowIso();
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : nowIso();
}

export function createEmptySessionContext(): SessionContext {
    return {
        assets: [],
        observations: [],
        relations: [],
        objectiveProgress: {
            preconditionsMet: [],
            openedPaths: [],
            breakSignals: [],
        },
    };
}

export function buildSessionAssetId(type: SessionAssetType, value: string) {
    return `asset:${type}:${normalizeSessionContextValue(value)}`;
}

export function buildSessionRelationId(type: SessionRelationType, fromAssetId: string, toAssetId: string) {
    const left = normalizeSessionContextValue(fromAssetId);
    const right = normalizeSessionContextValue(toAssetId);
    return `rel:${type}:${left}:${right}`;
}

export function buildSessionObservationFingerprint(kind: SessionObservationKind, source: string, summary: string) {
    return `${kind}|${normalizeSessionContextValue(source)}|${normalizeSessionContextValue(summary)}`;
}

function getSessionOrNull(sessionId: string) {
    return sessions.get(sessionId) || null;
}

function evictOldestSessionIfNeeded() {
    if (sessions.size < MAX_SESSIONS) return;
    const firstKey = sessions.keys().next().value;
    if (firstKey) sessions.delete(firstKey);
}

export function createSession(data: {
    objective: string;
    targetBaseUrl: string;
    maxIterations: number;
    allowedTools: ToolAction[];
    persona?: AutopilotPersonaId;
}) {
    evictOldestSessionIfNeeded();
    const id = `rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: RedTeamSession = {
        id,
        objective: data.objective,
        targetBaseUrl: data.targetBaseUrl,
        state: "idle",
        createdAt: new Date().toISOString(),
        iteration: 0,
        maxIterations: data.maxIterations,
        persona: data.persona || DEFAULT_AUTOPILOT_PERSONA_ID,
        allowedTools: data.allowedTools,
        thoughts: [],
        actions: [],
        findings: [],
        sessionContext: createEmptySessionContext(),
    };
    sessions.set(id, session);
    return session;
}

export function getSession(sessionId: string) {
    return sessions.get(sessionId) || null;
}

export function listReports(sessionId?: string) {
    if (!sessionId) return [...reports];
    return reports.filter((report) => report.sessionId === sessionId);
}

export function getSessionContext(sessionId: string) {
    const session = getSessionOrNull(sessionId);
    return session ? session.sessionContext : null;
}

export function upsertSessionAsset(sessionId: string, input: SessionContextAssetInput) {
    const session = getSessionOrNull(sessionId);
    if (!session) return null;

    const normalizedValue = normalizeSessionContextValue(input.value);
    if (!normalizedValue) return null;

    const timestamp = toIso(input.at);
    const source = normalizeSource(input.source);
    const id = buildSessionAssetId(input.type, normalizedValue);
    const confidence = clampConfidence(input.confidence);
    const existing = session.sessionContext.assets.find((item) => item.id === id);

    if (existing) {
        existing.lastSeenAt = timestamp;
        existing.source = source;
        existing.occurrences += 1;
        existing.confidence = Math.max(existing.confidence, confidence);
        if (input.metadata) {
            existing.metadata = { ...(existing.metadata || {}), ...input.metadata };
        }
        return existing;
    }

    const asset: SessionContextAsset = {
        id,
        type: input.type,
        value: normalizedValue,
        source,
        confidence,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        occurrences: 1,
        metadata: input.metadata,
    };
    session.sessionContext.assets.push(asset);
    pruneFromHead(session.sessionContext.assets, SESSION_CONTEXT_LIMITS.assets);
    return asset;
}

export function upsertSessionRelation(sessionId: string, input: SessionContextRelationInput) {
    const session = getSessionOrNull(sessionId);
    if (!session) return null;

    const fromAssetId = normalizeSessionContextValue(input.fromAssetId);
    const toAssetId = normalizeSessionContextValue(input.toAssetId);
    if (!fromAssetId || !toAssetId) return null;

    const timestamp = toIso(input.at);
    const source = normalizeSource(input.source);
    const id = buildSessionRelationId(input.type, fromAssetId, toAssetId);
    const confidence = clampConfidence(input.confidence);
    const existing = session.sessionContext.relations.find((item) => item.id === id);

    if (existing) {
        existing.lastSeenAt = timestamp;
        existing.source = source;
        existing.occurrences += 1;
        existing.confidence = Math.max(existing.confidence, confidence);
        if (input.metadata) {
            existing.metadata = { ...(existing.metadata || {}), ...input.metadata };
        }
        return existing;
    }

    const relation: SessionContextRelation = {
        id,
        type: input.type,
        fromAssetId,
        toAssetId,
        source,
        confidence,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        occurrences: 1,
        metadata: input.metadata,
    };
    session.sessionContext.relations.push(relation);
    pruneFromHead(session.sessionContext.relations, SESSION_CONTEXT_LIMITS.relations);
    return relation;
}

export function upsertSessionObservation(sessionId: string, input: SessionContextObservationInput) {
    const session = getSessionOrNull(sessionId);
    if (!session) return null;

    const summary = normalizeWhitespace(input.summary);
    if (!summary) return null;

    const timestamp = toIso(input.at);
    const source = normalizeSource(input.source);
    const fingerprint = buildSessionObservationFingerprint(input.kind, source, summary);
    const existing = session.sessionContext.observations.find((item) => item.fingerprint === fingerprint);

    if (existing) {
        existing.lastSeenAt = timestamp;
        existing.source = source;
        existing.occurrences += 1;
        if (input.details) {
            existing.details = { ...(existing.details || {}), ...input.details };
        }
        return existing;
    }

    const observation: SessionContextObservation = {
        id: `obs:${hashText(fingerprint)}`,
        kind: input.kind,
        source,
        summary,
        fingerprint,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        occurrences: 1,
        details: input.details,
    };
    session.sessionContext.observations.push(observation);
    pruneFromHead(session.sessionContext.observations, SESSION_CONTEXT_LIMITS.observations);
    return observation;
}

export function addObjectiveProgressSignal(sessionId: string, signalType: ObjectiveProgressSignalType, signal: string) {
    const session = getSessionOrNull(sessionId);
    if (!session) return null;

    const value = normalizeWhitespace(signal);
    if (!value) return session.sessionContext.objectiveProgress;

    const bucket = session.sessionContext.objectiveProgress[signalType];
    if (!bucket.includes(value)) {
        bucket.push(value);
        pruneFromHead(bucket, SESSION_CONTEXT_LIMITS.objectiveSignals);
    }
    session.sessionContext.objectiveProgress.lastUpdatedAt = nowIso();
    return session.sessionContext.objectiveProgress;
}

export function addThought(sessionId: string, phase: ThoughtEntry["phase"], message: string) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    const thought: ThoughtEntry = {
        id: `th-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        phase,
        message
    };

    session.thoughts.push(thought);
    if (session.thoughts.length > 300) {
        session.thoughts.splice(0, session.thoughts.length - 300);
    }
    return thought;
}

export function addAction(sessionId: string, action: Omit<ActionEntry, "id" | "at">) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    const entry: ActionEntry = {
        id: `ac-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        ...action
    };

    session.actions.push(entry);
    if (session.actions.length > 300) {
        session.actions.splice(0, session.actions.length - 300);
    }
    return entry;
}

export function addFinding(sessionId: string, finding: Omit<RedTeamFinding, "id" | "sessionId" | "createdAt">) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    const report: RedTeamFinding = {
        id: `rp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sessionId,
        createdAt: new Date().toISOString(),
        ...finding
    };

    session.findings.push(report);
    reports.push(report);
    if (reports.length > MAX_REPORTS) {
        reports.splice(0, reports.length - MAX_REPORTS);
    }
    return report;
}

export function updateSession(sessionId: string, partial: Partial<RedTeamSession>) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    Object.assign(session, partial);
    return session;
}

export function setSessionState(sessionId: string, state: AutopilotSessionState, extras: Partial<RedTeamSession> = {}) {
    return updateSession(sessionId, { ...extras, state });
}

export function getLatestSession() {
    const values = Array.from(sessions.values());
    if (!values.length) return null;
    return values.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}

export function resetRedTeamStoreForTests() {
    sessions.clear();
    reports.length = 0;
}
