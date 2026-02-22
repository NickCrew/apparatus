import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Shield, ShieldAlert, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';
import { useApparatus } from '../../providers/ApparatusProvider';
import { useDefense } from '../../hooks/useDefense';
import { useTrafficStream } from '../../hooks/useTrafficStream';
import { useSSE } from '../../hooks/useSSE';
import {
  normalizeEvent,
  type FeedEventType,
  type TimelineEvent,
  type TimelineModule,
  type TimelineSeverity,
} from './incidentTimelineModel';

const MAX_INCIDENT_EVENTS = 160;
const INCIDENT_ROWS = 12;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const LATENCY_ALERT_MS = 750;
const TIME_WINDOW_TICK_MS = 30000;
const CHAOS_STATUS_POLL_MS = 15000;

const PROTOCOL_COLORS = [
  'bg-[#38a0ff]/90',
  'bg-[#6cb4ff]/85',
  'bg-[#d946a8]/80',
  'bg-[#e5a820]/80',
  'bg-[#4e6580]/80',
] as const;

const PANEL_CLASS =
  'border border-[#151e30] bg-[#0c111c]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_34px_rgba(1,8,20,0.55)]';

const CHIP_CLASS =
  'rounded-sm border border-[#1a2740] bg-[#0b1320]/85 px-2 py-1 text-[#8ca7c4]';

interface ProtocolSegment {
  protocol: string;
  count: number;
  colorClass: string;
}

interface ProtocolSummary {
  totalListeners: number;
  activeListeners: number;
  segments: ProtocolSegment[];
}

interface ChaosStatusPayload {
  cpuSpikeRunning: boolean;
  memoryChunks: number;
  memoryAllocatedMb: number;
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseTimestampMs(value: string | number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString([], { hour12: false });
}

function severityBadgeVariant(severity: TimelineSeverity) {
  if (severity === 'error') return 'danger';
  if (severity === 'warn') return 'warning';
  return 'info';
}

function sourceBadgeVariant(module: TimelineModule) {
  if (module === 'deception') return 'danger';
  if (module === 'defense') return 'warning';
  if (module === 'traffic') return 'info';
  return 'neutral';
}

function sourceLabel(module: TimelineModule): string {
  if (module === 'traffic') return 'TRAFFIC';
  if (module === 'defense') return 'DEFENSE';
  if (module === 'deception') return 'DECEPTION';
  if (module === 'integrations') return 'INTEGRATION';
  return 'SYSTEM';
}

function severityDotClass(severity: TimelineSeverity): string {
  if (severity === 'error') return 'bg-danger';
  if (severity === 'warn') return 'bg-warning';
  return 'bg-info';
}

function isActionableIncident(event: TimelineEvent): boolean {
  if (event.module === 'defense' || event.module === 'deception') return true;

  if (event.type === 'health') {
    return event.severity !== 'info';
  }

  if (event.type === 'request') {
    const status = getNumber(event.data.status);
    const latencyMs = getNumber(event.data.latencyMs);
    const path = typeof event.data.path === 'string' ? event.data.path : '';

    if (status !== null && status >= 400) return true;
    if (latencyMs !== null && latencyMs >= LATENCY_ALERT_MS) return true;
    if (path.startsWith('/chaos/')) return true;
  }

  return event.severity !== 'info';
}

function OverviewSectionHeader({
  title,
  icon: Icon,
  to,
  actionLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  actionLabel: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[#4e6580]" />
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#6d85a0]">
          {title}
        </span>
      </div>
      <Link
        to={to}
        className="group inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[#38a0ff]/85 transition-colors hover:text-[#38a0ff]"
      >
        {actionLabel}
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function ProtocolStrip({ segments }: { segments: ProtocolSegment[] }) {
  const units = useMemo(
    () =>
      segments.flatMap((segment) =>
        Array.from({ length: Math.max(1, segment.count) }, (_, index) => ({
          key: `${segment.protocol}-${index}`,
          colorClass: segment.colorClass,
        }))
      ),
    [segments]
  );

  if (units.length === 0) {
    return <div className="mt-4 h-1 rounded-full bg-[#101927]" />;
  }

  return (
    <div className="mt-4">
      <div className="flex h-1 gap-px overflow-hidden rounded-full bg-[#101927]">
        {units.map((unit) => (
          <span key={unit.key} className={cn('h-full flex-1', unit.colorClass)} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((segment) => (
          <span key={segment.protocol} className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.08em] text-[#6d85a0]">
            <span className={cn('h-1.5 w-1.5 rounded-full', segment.colorClass)} />
            {segment.protocol} {segment.count}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Overview() {
  const { health, baseUrl } = useApparatus();
  const { rules, isLoading: defenseLoading } = useDefense();
  const { events: trafficEvents } = useTrafficStream(600);
  const [incidentEvents, setIncidentEvents] = useState<TimelineEvent[]>([]);
  const [protocolSummary, setProtocolSummary] = useState<ProtocolSummary>({
    totalListeners: 0,
    activeListeners: 0,
    segments: [],
  });
  const [protocolLoading, setProtocolLoading] = useState(true);
  const [chaosStatus, setChaosStatus] = useState<ChaosStatusPayload | null>(null);
  const [chaosLoading, setChaosLoading] = useState(true);
  const [timeTick, setTimeTick] = useState(0);

  const sequenceRef = useRef(0);

  const { subscribe, status: sseStatus } = useSSE(`${baseUrl}/sse`, {
    enabled: Boolean(baseUrl),
    maxRetries: 10,
  });

  const appendIncident = useCallback((type: FeedEventType, payload: Record<string, unknown>) => {
    sequenceRef.current += 1;
    const event = normalizeEvent(type, payload, sequenceRef.current);
    if (!isActionableIncident(event)) return;
    setIncidentEvents((previous) => [event, ...previous].slice(0, MAX_INCIDENT_EVENTS));
  }, []);

  useEffect(() => {
    sequenceRef.current = 0;
    setIncidentEvents([]);
  }, [baseUrl]);

  useEffect(() => {
    // Recompute "last 10m/1h" windows even when the feed is quiet.
    const intervalId = window.setInterval(() => {
      setTimeTick((previous) => previous + 1);
    }, TIME_WINDOW_TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (sseStatus !== 'connected') return;

    const unsubscribers = [
      subscribe<Record<string, unknown>>('request', (event) => appendIncident('request', event)),
      subscribe<Record<string, unknown>>('deception', (event) => appendIncident('deception', event)),
      subscribe<Record<string, unknown>>('tarpit', (event) => appendIncident('tarpit', event)),
      subscribe<Record<string, unknown>>('health', (event) => appendIncident('health', event)),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [appendIncident, sseStatus, subscribe]);

  useEffect(() => {
    if (!baseUrl) {
      setProtocolLoading(false);
      return;
    }

    const controller = new AbortController();
    setProtocolLoading(true);

    const loadProtocolSummary = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/infra/status`, {
          signal: controller.signal,
          credentials: 'same-origin',
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch protocols (${response.status})`);
        }

        const payload = (await response.json()) as {
          servers?: Array<{ protocol?: unknown; status?: unknown }>;
        };

        const servers = Array.isArray(payload.servers) ? payload.servers : [];
        const activeServers = servers.filter((server) => server.status === 'active');

        const buckets = new Map<string, number>();
        for (const server of activeServers) {
          const protocolValue =
            typeof server.protocol === 'string' && server.protocol.trim() !== ''
              ? server.protocol.toUpperCase()
              : 'UNKNOWN';

          buckets.set(protocolValue, (buckets.get(protocolValue) ?? 0) + 1);
        }

        const segments = [...buckets.entries()]
          .sort((left, right) => right[1] - left[1])
          .map(([protocol, count], index) => ({
            protocol,
            count,
            colorClass: PROTOCOL_COLORS[index % PROTOCOL_COLORS.length],
          }));

        setProtocolSummary({
          totalListeners: servers.length,
          activeListeners: activeServers.length,
          segments,
        });
      } catch {
        if (controller.signal.aborted) return;
        setProtocolSummary({
          totalListeners: 0,
          activeListeners: 0,
          segments: [],
        });
      } finally {
        if (controller.signal.aborted) return;
        setProtocolLoading(false);
      }
    };

    void loadProtocolSummary();

    return () => {
      controller.abort();
    };
  }, [baseUrl]);

  useEffect(() => {
    if (!baseUrl) {
      setChaosStatus(null);
      setChaosLoading(false);
      return;
    }

    let disposed = false;
    const controller = new AbortController();
    setChaosLoading(true);

    const loadChaosStatus = async () => {
      try {
        const response = await fetch(`${baseUrl}/chaos/status`, {
          signal: controller.signal,
          credentials: 'same-origin',
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch chaos status (${response.status})`);
        }

        const payload = (await response.json()) as {
          cpuSpikeRunning?: unknown;
          memoryChunks?: unknown;
          memoryAllocatedMb?: unknown;
        };

        if (disposed) return;

        setChaosStatus({
          cpuSpikeRunning: payload.cpuSpikeRunning === true,
          memoryChunks: Math.max(0, getNumber(payload.memoryChunks) ?? 0),
          memoryAllocatedMb: Math.max(0, getNumber(payload.memoryAllocatedMb) ?? 0),
        });
      } catch {
        if (disposed) return;
        setChaosStatus(null);
      } finally {
        if (disposed) return;
        setChaosLoading(false);
      }
    };

    void loadChaosStatus();
    const intervalId = window.setInterval(loadChaosStatus, CHAOS_STATUS_POLL_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      controller.abort();
    };
  }, [baseUrl]);

  const trafficSnapshot = useMemo(() => {
    if (trafficEvents.length === 0) {
      return {
        throughputRps: 0,
        errorRate: 0,
        activeSources: 0,
      };
    }

    const newest = parseTimestampMs(trafficEvents[0].timestamp);
    const oldest = parseTimestampMs(trafficEvents[trafficEvents.length - 1].timestamp);
    const durationSec =
      newest !== null && oldest !== null ? Math.max((newest - oldest) / 1000, 1) : 1;

    const errors = trafficEvents.filter((event) => event.status >= 400).length;
    const sourceCount = new Set(
      trafficEvents
        .map((event) => event.ip)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    ).size;

    return {
      throughputRps: Math.round(trafficEvents.length / durationSec),
      errorRate: Math.round((errors / trafficEvents.length) * 100),
      activeSources: sourceCount,
    };
  }, [trafficEvents]);

  const incidentSnapshot = useMemo(() => {
    const now = Date.now();
    let last10m = 0;
    let lastHour = 0;
    let critical = 0;
    let warning = 0;
    const sourceCounts = new Map<string, number>();

    for (const event of incidentEvents) {
      const timestampMs = parseTimestampMs(event.timestamp);
      const ageMs = timestampMs !== null ? now - timestampMs : null;

      if (ageMs !== null && ageMs <= TEN_MINUTES_MS) last10m += 1;
      if (ageMs !== null && ageMs <= ONE_HOUR_MS) lastHour += 1;
      if (event.severity === 'error') critical += 1;
      if (event.severity === 'warn') warning += 1;

      if (ageMs !== null && ageMs <= ONE_HOUR_MS && (event.severity === 'error' || event.severity === 'warn')) {
        const key = event.sourceIp ?? sourceLabel(event.module);
        sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
      }
    }

    const topSources = [...sourceCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 2)
      .map(([label, count]) => ({ label, count }));

    return {
      last10m,
      lastHour,
      critical,
      warning,
      activeEntities: sourceCounts.size,
      topSources,
    };
  }, [incidentEvents, timeTick]);

  const recentIncidents = useMemo(
    () => incidentEvents.slice(0, INCIDENT_ROWS),
    [incidentEvents]
  );

  const defenseSignalsLast10m = useMemo(() => {
    const now = Date.now();
    return incidentEvents.filter((event) => {
      if (event.module !== 'defense') return false;
      const timestampMs = parseTimestampMs(event.timestamp);
      return timestampMs !== null && now - timestampMs <= TEN_MINUTES_MS;
    }).length;
  }, [incidentEvents, timeTick]);

  const lastChaosCommand = useMemo(
    () => trafficEvents.find((event) => event.path.startsWith('/chaos/')),
    [trafficEvents]
  );

  const defensesOn = health.status !== 'unhealthy' && health.status !== 'unknown';
  const chaosRunning = Boolean(chaosStatus?.cpuSpikeRunning) || (chaosStatus?.memoryAllocatedMb ?? 0) > 0;
  const healthToneClass =
    health.status === 'healthy'
      ? 'text-success-500'
      : health.status === 'degraded' || health.status === 'checking'
        ? 'text-warning'
        : health.status === 'critical' || health.status === 'unhealthy'
          ? 'text-danger'
          : 'text-neutral-300';

  return (
    <div className="relative space-y-5 overflow-hidden rounded-sm pb-2">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_0%,rgba(56,160,255,0.14),transparent_42%),radial-gradient(circle_at_88%_80%,rgba(56,160,255,0.08),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_3px,rgba(5,9,20,0.55)_4px)]" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between opacity-0 animate-terminal-in stagger-1">
        <div>
          <h1 className="text-display-lg font-display text-[#e8eef7] tracking-tight rec-casual">
            System_Overview
          </h1>
          <p className="mt-1 text-[10px] font-mono tracking-[0.28em] text-[#6d85a0]">
            INCIDENT-FIRST / REAL-TIME STATE
          </p>
        </div>

        <div className="flex items-center gap-5 rounded-sm border border-[#1a2740] bg-[#0b1320]/90 px-4 py-3 shadow-[inset_0_0_18px_rgba(56,160,255,0.05)]">
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6d85a0]">Health</div>
            <div className={cn('text-[12px] font-mono uppercase', healthToneClass)}>{health.status}</div>
          </div>
          <div className="h-8 w-px bg-[#1a2740]" />
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6d85a0]">Latency</div>
            <div className="text-[12px] font-mono text-[#dce4ec]">
              {health.latencyMs !== undefined ? `${health.latencyMs}ms` : '—'}
            </div>
          </div>
          <div className="h-8 w-px bg-[#1a2740]" />
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6d85a0]">Protocols</div>
            <div className="text-[12px] font-mono text-[#dce4ec]">
              {protocolLoading
                ? '...'
                : `${protocolSummary.activeListeners}/${protocolSummary.totalListeners || '—'}`}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card variant="panel" className={cn(PANEL_CLASS, 'opacity-0 animate-terminal-in stagger-2')}>
          <CardContent className="p-4 pt-4">
            <OverviewSectionHeader
              title="Traffic"
              icon={Activity}
              to="/traffic"
              actionLabel="Traffic"
            />
            <div className="text-3xl font-display text-[#e8eef7]">{trafficSnapshot.throughputRps} RPS</div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-wide text-[#6d85a0]">
              <span>{trafficSnapshot.activeSources} active sources</span>
              <span
                className={cn(
                  trafficSnapshot.errorRate > 5 ? 'text-[#e5a820]' : 'text-[#6d85a0]'
                )}
              >
                {trafficSnapshot.errorRate}% errors
              </span>
            </div>
            {protocolLoading ? (
              <div className="mt-4 h-1 animate-pulse rounded-full bg-[#1a2740]/80" />
            ) : (
              <ProtocolStrip segments={protocolSummary.segments} />
            )}
          </CardContent>
        </Card>

        <Card
          variant="panel"
          glow={incidentSnapshot.critical > 0 ? 'danger' : 'none'}
          className={cn(PANEL_CLASS, 'opacity-0 animate-terminal-in stagger-3')}
        >
          <CardContent className="p-4 pt-4">
            <OverviewSectionHeader
              title="Incidents"
              icon={AlertTriangle}
              to="/timeline"
              actionLabel="Timeline"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#6d85a0]">Last 10m</div>
                <div className="mt-1 text-2xl font-display text-[#e8eef7]">{incidentSnapshot.last10m}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#6d85a0]">Last hour</div>
                <div className="mt-1 text-2xl font-display text-[#e8eef7]">{incidentSnapshot.lastHour}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {incidentSnapshot.critical > 0 && (
                <Badge variant="danger" size="sm" className="shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                  {incidentSnapshot.critical} CRITICAL
                </Badge>
              )}
              {incidentSnapshot.warning > 0 && (
                <Badge variant="warning" size="sm">
                  {incidentSnapshot.warning} WARNING
                </Badge>
              )}
              {incidentSnapshot.critical === 0 && incidentSnapshot.warning === 0 && (
                <Badge variant="success" size="sm">NO ACTIVE ALERTS</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="panel" className={cn(PANEL_CLASS, 'opacity-0 animate-terminal-in stagger-4')}>
          <CardContent className="p-4 pt-4">
            <OverviewSectionHeader
              title="Threats"
              icon={ShieldAlert}
              to="/fingerprints"
              actionLabel="Attackers"
            />

            <div className="text-3xl font-display text-[#e8eef7]">{incidentSnapshot.activeEntities}</div>
            <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.16em] text-[#6d85a0]">
              active entities (1h)
            </div>

            <div className="mt-4 space-y-2">
              {incidentSnapshot.topSources.length === 0 ? (
                <div className="rounded-sm border border-[#1a2740] bg-[#0b1320]/85 px-3 py-2 text-[11px] font-mono text-[#6d85a0]">
                  No high-risk entities recorded yet.
                </div>
              ) : (
                incidentSnapshot.topSources.map((source) => (
                  <div
                    key={source.label}
                    className="flex items-center justify-between rounded-sm border border-[#1a2740] bg-[#0b1320]/85 px-3 py-2"
                  >
                    <span className="truncate pr-3 text-[11px] font-mono text-[#dce4ec]">{source.label}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#7f97b3]">
                      {source.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="panel" className={cn(PANEL_CLASS, 'opacity-0 animate-terminal-in stagger-5')}>
        <CardHeader className="border-[#1a2740] bg-[#0b1320]/55 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[#6d85a0]">
              <AlertTriangle className="h-3.5 w-3.5 text-[#e5a820]" />
              Incident Feed
            </CardTitle>
            <Button asChild variant="secondary" size="sm" className="border-[#1a2740] bg-[#0b1320] text-[#9ec4ff] hover:bg-[#12213a] hover:text-[#dce4ec]">
              <Link to="/timeline">OPEN TIMELINE</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentIncidents.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#6d85a0]">
                Waiting for actionable incidents
              </div>
              <p className="mt-2 text-sm text-[#8ca7c4]">
                Feed shows triggered, detected, and failed events only.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a2740]">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="grid grid-cols-[72px_1fr_auto] items-start gap-3 px-4 py-3 transition-colors hover:bg-[#12213a]/35"
                >
                  <div className="pt-[2px] text-[11px] font-mono text-[#6d85a0]">
                    {formatTime(incident.timestamp)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', severityDotClass(incident.severity))} />
                      <span className="truncate text-sm font-medium text-[#e8eef7]">{incident.title}</span>
                      <Badge variant={severityBadgeVariant(incident.severity)} size="sm" className="hidden sm:inline-flex">
                        {incident.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[12px] font-mono text-[#8ca7c4]">{incident.summary}</p>
                  </div>

                  <Badge
                    variant={sourceBadgeVariant(incident.module)}
                    size="sm"
                    className="mt-[2px] border-[#1c3055] bg-[#0e1a2b] text-[#9fc6ff]"
                  >
                    {sourceLabel(incident.module)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="panel" className={cn(PANEL_CLASS, 'opacity-0 animate-terminal-in stagger-6')}>
          <CardContent className="p-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-[#38a0ff]/90" />
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#6d85a0]">
                  Defenses
                </span>
              </div>
              <Button asChild variant="secondary" size="sm" className="border-[#1a2740] bg-[#0b1320] text-[#9ec4ff] hover:bg-[#12213a] hover:text-[#dce4ec]">
                <Link to="/defense">OPEN DEFENSE</Link>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#8ca7c4]">
              <Badge variant={defensesOn ? 'success' : 'warning'} size="sm">
                {defensesOn ? 'ON' : 'CHECK'}
              </Badge>
              <span className={CHIP_CLASS}>
                {defenseLoading ? 'RULES ...' : `${rules.length} RULES LOADED`}
              </span>
              <span className={CHIP_CLASS}>
                {defenseSignalsLast10m} TRIGGERS / 10M
              </span>
            </div>
          </CardContent>
        </Card>

        <Card variant="panel" className={cn(PANEL_CLASS, 'opacity-0 animate-terminal-in stagger-7')}>
          <CardContent className="p-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-[#e5a820]/90" />
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#6d85a0]">
                  Chaos
                </span>
              </div>
              <Button asChild variant="secondary" size="sm" className="border-[#1a2740] bg-[#0b1320] text-[#9ec4ff] hover:bg-[#12213a] hover:text-[#dce4ec]">
                <Link to="/chaos">OPEN CHAOS</Link>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#8ca7c4]">
              {chaosLoading ? (
                <span className={CHIP_CLASS}>
                  LOADING STATUS...
                </span>
              ) : (
                <>
                  <Badge variant={chaosRunning ? 'danger' : 'success'} size="sm" dot={chaosRunning}>
                    {chaosRunning ? 'RUNNING' : 'IDLE'}
                  </Badge>
                  <span className={CHIP_CLASS}>
                    CPU {chaosStatus?.cpuSpikeRunning ? 'ACTIVE' : 'CLEAR'}
                  </span>
                  <span className={CHIP_CLASS}>
                    MEM {chaosStatus?.memoryAllocatedMb ?? 0}MB
                  </span>
                  {lastChaosCommand && (
                    <span className={CHIP_CLASS}>
                      LAST {lastChaosCommand.path.replace('/chaos/', '').toUpperCase()} {formatTime(lastChaosCommand.timestamp)}
                    </span>
                  )}
                  {!lastChaosCommand && (
                    <span className={cn(CHIP_CLASS, 'text-[#6d85a0]')}>
                      NO CHAOS COMMANDS YET
                    </span>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
