import { ToolAction } from "../tool-executor.js";

export type AutopilotSessionState = "idle" | "running" | "stopping" | "stopped" | "completed" | "failed";

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
    allowedTools: ToolAction[];
    thoughts: ThoughtEntry[];
    actions: ActionEntry[];
    findings: RedTeamFinding[];
    summary?: RedTeamSessionSummary;
    error?: string;
}

const sessions = new Map<string, RedTeamSession>();
const reports: RedTeamFinding[] = [];
const MAX_SESSIONS = 100;
const MAX_REPORTS = 3000;

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
        allowedTools: data.allowedTools,
        thoughts: [],
        actions: [],
        findings: []
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
