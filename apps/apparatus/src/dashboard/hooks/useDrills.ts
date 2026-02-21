import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export type DrillDifficulty = 'junior' | 'senior' | 'principal';
export type DrillStatus = 'pending' | 'arming' | 'active' | 'stabilizing' | 'won' | 'failed' | 'cancelled';

export interface DrillDefinition {
  id: string;
  name: string;
  description: string;
  difficulty: DrillDifficulty;
  tags: Array<'reliability' | 'traffic' | 'appsec'>;
  briefing: string;
  maxDurationSec: number;
}

export interface DrillTimelineEvent {
  at: string;
  type: 'system' | 'metric' | 'hint' | 'user_action' | 'status_change';
  message: string;
  data?: Record<string, unknown>;
}

export interface DrillRun {
  runId: string;
  drillId: string;
  drillName: string;
  status: DrillStatus;
  startedAt: string;
  finishedAt?: string;
  detectedAt?: string;
  mitigatedAt?: string;
  failureReason?: string;
  elapsedSec: number;
  timeline: DrillTimelineEvent[];
  lastSnapshot?: {
    cpuPercent: number;
    errorRate: number;
    blockedSqliRatio: number;
    detectedMarked: boolean;
    clusterAttackActive: boolean;
    ghostTrafficActive: boolean;
  };
}

export interface DrillScore {
  total: number;
  ttdSec: number;
  ttmSec: number;
  ttrSec: number;
  penalties: Array<{ code: string; points: number; reason: string }>;
  bonuses: Array<{ code: string; points: number; reason: string }>;
}

export interface DrillDebrief {
  runId: string;
  drillId: string;
  status: DrillStatus;
  score: DrillScore;
  detectedAt?: string;
  mitigatedAt?: string;
  startedAt: string;
  finishedAt?: string;
  timeline: DrillTimelineEvent[];
}

export function useDrills() {
  const { baseUrl } = useApparatus();
  const [drills, setDrills] = useState<DrillDefinition[]>([]);
  const [activeRun, setActiveRun] = useState<DrillRun | null>(null);
  const [debrief, setDebrief] = useState<DrillDebrief | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchDrills = useCallback(async () => {
    if (!baseUrl) return;

    try {
      const res = await fetch(`${baseUrl}/drills`);
      if (!res.ok) {
        throw new Error(`Failed to fetch drills: ${res.status}`);
      }
      const data = (await res.json()) as DrillDefinition[];
      setDrills(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  }, [baseUrl]);

  const fetchStatus = useCallback(async (drillId: string, runId: string) => {
    if (!baseUrl) return null;

    const res = await fetch(`${baseUrl}/drills/${encodeURIComponent(drillId)}/status?runId=${encodeURIComponent(runId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch drill status: ${res.status}`);
    }

    const data = (await res.json()) as DrillRun;
    setActiveRun(data);
    return data;
  }, [baseUrl]);

  const fetchDebrief = useCallback(async (drillId: string, runId: string) => {
    if (!baseUrl) return null;

    const res = await fetch(`${baseUrl}/drills/${encodeURIComponent(drillId)}/debrief?runId=${encodeURIComponent(runId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch debrief: ${res.status}`);
    }

    const data = (await res.json()) as DrillDebrief;
    setDebrief(data);
    return data;
  }, [baseUrl]);

  const startPolling = useCallback((drillId: string, runId: string) => {
    clearPoll();

    pollTimerRef.current = setInterval(async () => {
      try {
        const run = await fetchStatus(drillId, runId);
        if (!run) return;

        if (run.status === 'won' || run.status === 'failed' || run.status === 'cancelled') {
          clearPoll();
          await fetchDebrief(drillId, runId);
        }
      } catch (e) {
        clearPoll();
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      }
    }, 1000);
  }, [clearPoll, fetchDebrief, fetchStatus]);

  const startDrill = useCallback(async (drillId: string) => {
    if (!baseUrl) return;

    setError(null);
    setDebrief(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${baseUrl}/drills/${encodeURIComponent(drillId)}/run`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Failed to start drill: ${res.status}`);
      }

      const body = (await res.json()) as { runId: string };
      const run = await fetchStatus(drillId, body.runId);
      if (run) {
        startPolling(drillId, body.runId);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, fetchStatus, startPolling]);

  const markDetected = useCallback(async () => {
    if (!baseUrl || !activeRun) return;

    try {
      const res = await fetch(`${baseUrl}/drills/${encodeURIComponent(activeRun.drillId)}/mark-detected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: activeRun.runId }),
      });

      if (!res.ok) {
        throw new Error(`Failed to mark detection: ${res.status}`);
      }

      await fetchStatus(activeRun.drillId, activeRun.runId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  }, [activeRun, baseUrl, fetchStatus]);

  const cancelRun = useCallback(async () => {
    if (!baseUrl || !activeRun) return;

    try {
      const res = await fetch(`${baseUrl}/drills/${encodeURIComponent(activeRun.drillId)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: activeRun.runId }),
      });

      if (!res.ok) {
        throw new Error(`Failed to cancel drill: ${res.status}`);
      }

      clearPoll();
      const run = await fetchStatus(activeRun.drillId, activeRun.runId);
      if (run) {
        await fetchDebrief(run.drillId, run.runId);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  }, [activeRun, baseUrl, clearPoll, fetchDebrief, fetchStatus]);

  useEffect(() => {
    void fetchDrills();
    return () => clearPoll();
  }, [clearPoll, fetchDrills]);

  const activeDrill = useMemo(() => {
    if (!activeRun) return null;
    return drills.find((drill) => drill.id === activeRun.drillId) || null;
  }, [activeRun, drills]);

  return {
    drills,
    activeRun,
    activeDrill,
    debrief,
    isLoading,
    error,
    fetchDrills,
    fetchDebrief,
    startDrill,
    markDetected,
    cancelRun,
  };
}
