import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export type AttackerGeoCategory = 'internal' | 'known_bot' | 'unknown_external';
export type AttackerTimelineKind = 'request' | 'deception' | 'tarpit';
export type AttackerKillChainStage = 'recon' | 'probe' | 'exploitation' | 'containment';

export interface AttackerTimelineEvent {
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
  counters: {
    requests: number;
    blocked: number;
    deception: number;
    tarpitTrapped: number;
    tarpitReleased: number;
  };
  protocols: Record<string, number>;
  timeline: AttackerTimelineEvent[];
}

interface AttackersQuery {
  q?: string;
  minRisk?: number;
  category?: AttackerGeoCategory;
  limit?: number;
}

interface BlackholeEntry {
  ip: string;
  blockedAt: number;
  duration: number;
}

interface TarpitEntry {
  ip: string;
  trappedAt: number;
  duration: number;
}

const DEFAULT_POLL_MS = 4000;

export function useAttackers(query: AttackersQuery, pollMs = DEFAULT_POLL_MS) {
  const { baseUrl } = useApparatus();
  const [profiles, setProfiles] = useState<AttackerProfile[]>([]);
  const [trackedCount, setTrackedCount] = useState(0);
  const [blackholed, setBlackholed] = useState<BlackholeEntry[]>([]);
  const [tarpitted, setTarpitted] = useState<TarpitEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (typeof query.minRisk === 'number') params.set('minRisk', String(query.minRisk));
    if (query.category) params.set('category', query.category);
    if (typeof query.limit === 'number') params.set('limit', String(query.limit));
    return params.toString();
  }, [query.q, query.minRisk, query.category, query.limit]);

  const refresh = useCallback(async () => {
    if (!baseUrl) return;
    setIsLoading(true);
    setError(null);
    try {
      const [attackersRes, blackholeRes, tarpitRes] = await Promise.all([
        fetch(`${baseUrl}/api/attackers${queryString ? `?${queryString}` : ''}`),
        fetch(`${baseUrl}/blackhole`),
        fetch(`${baseUrl}/tarpit`),
      ]);

      if (!attackersRes.ok) throw new Error('Failed to load attacker profiles');
      if (!blackholeRes.ok) throw new Error('Failed to load blackhole state');
      if (!tarpitRes.ok) throw new Error('Failed to load tarpit state');

      const attackersData = await attackersRes.json();
      const blackholeData = await blackholeRes.json();
      const tarpitData = await tarpitRes.json();

      setProfiles(attackersData.profiles || []);
      setTrackedCount(attackersData.tracked || 0);
      setBlackholed(blackholeData.blocked || []);
      setTarpitted(tarpitData.trapped || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown attacker fetch error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, queryString]);

  useEffect(() => {
    refresh();
    if (pollMs <= 0) return;
    const timer = setInterval(refresh, pollMs);
    return () => clearInterval(timer);
  }, [pollMs, refresh]);

  const blackholedIps = useMemo(() => new Set(blackholed.map((entry) => entry.ip)), [blackholed]);
  const tarpittedIps = useMemo(() => new Set(tarpitted.map((entry) => entry.ip)), [tarpitted]);

  const trapIp = useCallback(
    async (ip: string) => {
      if (!baseUrl) return false;
      const res = await fetch(`${baseUrl}/tarpit/trap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    },
    [baseUrl, refresh]
  );

  const releaseTarpit = useCallback(
    async (ip: string) => {
      if (!baseUrl) return false;
      const res = await fetch(`${baseUrl}/tarpit/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    },
    [baseUrl, refresh]
  );

  const blackholeIp = useCallback(
    async (ip: string) => {
      if (!baseUrl) return false;
      const res = await fetch(`${baseUrl}/blackhole`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    },
    [baseUrl, refresh]
  );

  const releaseBlackhole = useCallback(
    async (ip: string) => {
      if (!baseUrl) return false;
      const res = await fetch(`${baseUrl}/blackhole/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    },
    [baseUrl, refresh]
  );

  return {
    profiles,
    trackedCount,
    blackholedIps,
    tarpittedIps,
    isLoading,
    error,
    refresh,
    trapIp,
    releaseTarpit,
    blackholeIp,
    releaseBlackhole,
  };
}
