import { useCallback, useEffect, useRef, useState } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export type AutopilotPhase = 'analyze' | 'decide' | 'act' | 'verify' | 'report' | 'system';
export type AutopilotState = 'idle' | 'running' | 'stopping' | 'stopped' | 'completed' | 'failed';

export interface ThoughtEntry {
  id: string;
  at: string;
  phase: AutopilotPhase;
  message: string;
}

export interface ActionEntry {
  id: string;
  at: string;
  tool: string;
  params: Record<string, unknown>;
  ok: boolean;
  message: string;
  maneuver?: {
    triggerSignal: string;
    countermeasure: string;
    rationale: string;
  };
}

export interface RuntimeSnapshot {
  capturedAt: string;
  rps: number;
  errorRate: number;
  avgLatencyMs: number;
  cpuPercent: number;
  memPercent: number;
  healthy: boolean;
}

export interface VerificationRecord {
  broken: boolean;
  crashDetected: boolean;
  newServerErrors: number;
  notes: string;
}

export interface FindingRecord {
  id: string;
  sessionId: string;
  iteration: number;
  objective: string;
  before: RuntimeSnapshot;
  after: RuntimeSnapshot;
  verification: VerificationRecord;
  createdAt: string;
}

export interface SessionSummary {
  completedAt: string;
  totalIterations: number;
  breakingPointRps?: number;
  failureReason?: string;
}

export interface SessionContextAsset {
  id: string;
  type: string;
  value: string;
  source: string;
  confidence: number;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrences: number;
}

export interface SessionContextRelation {
  id: string;
  type: string;
  fromAssetId: string;
  toAssetId: string;
  source: string;
  confidence: number;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrences: number;
}

export interface SessionObjectiveProgress {
  preconditionsMet: string[];
  openedPaths: string[];
  breakSignals: string[];
  lastUpdatedAt?: string;
}

export interface SessionContext {
  assets: SessionContextAsset[];
  observations: Array<{
    id: string;
    kind: string;
    source: string;
    summary: string;
    firstSeenAt: string;
    lastSeenAt: string;
    occurrences: number;
  }>;
  relations: SessionContextRelation[];
  objectiveProgress: SessionObjectiveProgress;
}

export interface AutopilotSession {
  id: string;
  objective: string;
  persona?: string;
  state: AutopilotState;
  iteration: number;
  maxIterations: number;
  allowedTools: string[];
  thoughts: ThoughtEntry[];
  actions: ActionEntry[];
  findings: FindingRecord[];
  sessionContext?: SessionContext;
  summary?: SessionSummary;
  error?: string;
}

interface StatusResponse {
  active: boolean;
  session: AutopilotSession | null;
  latestReport: FindingRecord | null;
}

interface StartPayload {
  objective: string;
  maxIterations?: number;
  intervalMs?: number;
  persona?: string;
  scope: {
    allowedTools: string[];
    forbidCrash: boolean;
  };
}

export interface AutopilotPersonaOption {
  id: string;
  label: string;
  description: string;
  tags: string[];
}

export interface AutopilotConfig {
  availableTools: string[];
  defaultAllowedTools: string[];
  personas: AutopilotPersonaOption[];
  defaultPersona: string;
  safetyDefaults: {
    forbidCrash: boolean;
  };
}

export function useAutopilot() {
  const { baseUrl } = useApparatus();
  const [session, setSession] = useState<AutopilotSession | null>(null);
  const [latestReport, setLatestReport] = useState<FindingRecord | null>(null);
  const [active, setActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AutopilotConfig | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!baseUrl) return;

    const url = new URL('/api/redteam/autopilot/status', baseUrl);
    if (sessionIdRef.current) {
      url.searchParams.set('sessionId', sessionIdRef.current);
    }

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Status failed (${res.status})`);

      const data = (await res.json()) as StatusResponse;
      setSession(data.session);
      setLatestReport(data.latestReport);
      setActive(Boolean(data.active));
      if (data.session?.id) {
        sessionIdRef.current = data.session.id;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [baseUrl]);

  const fetchConfig = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/api/redteam/autopilot/config`);
      if (!res.ok) throw new Error(`Config failed (${res.status})`);
      const data = (await res.json()) as AutopilotConfig;
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [baseUrl]);

  const start = useCallback(async (payload: StartPayload) => {
    if (!baseUrl) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${baseUrl}/api/redteam/autopilot/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Start failed (${res.status})`);
      }

      const data = await res.json() as { sessionId: string; session: AutopilotSession };
      sessionIdRef.current = data.sessionId;
      setSession(data.session);
      setActive(true);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, fetchStatus]);

  const stop = useCallback(async () => {
    if (!baseUrl) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${baseUrl}/api/redteam/autopilot/stop`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Stop failed (${res.status})`);
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, fetchStatus]);

  const kill = useCallback(async () => {
    if (!baseUrl) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${baseUrl}/api/redteam/autopilot/kill`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Kill failed (${res.status})`);
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, fetchStatus]);

  useEffect(() => {
    void fetchStatus();
    void fetchConfig();
    if (!baseUrl) return;

    const interval = setInterval(() => {
      void fetchStatus();
    }, 1500);

    return () => clearInterval(interval);
  }, [baseUrl, fetchConfig, fetchStatus]);

  return {
    session,
    latestReport,
    active,
    isLoading,
    error,
    config,
    fetchStatus,
    fetchConfig,
    start,
    stop,
    kill,
  };
}
