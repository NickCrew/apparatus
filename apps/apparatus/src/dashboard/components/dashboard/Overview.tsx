import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Pause, Play, Shield, ShieldAlert, Zap } from 'lucide-react';
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
} from './incidentTimelineModel';
import {
  computeDefenseSignalsLast10m,
  computeIncidentPressure,
  computeIncidentSnapshot,
  computeTrafficSnapshot,
  formatTime,
  getNumber,
  isActionableIncident,
  LATENCY_ALERT_MS,
  LATENCY_WARN_MS,
  severityBadgeVariant,
  severityDotClass,
  sourceBadgeVariant,
  sourceLabel,
} from './Overview.logic';

const MAX_INCIDENT_EVENTS = 160;
const INCIDENT_ROWS = 8;
const TIME_WINDOW_TICK_MS = 30000;
const CHAOS_STATUS_POLL_MS = 15000;

const PROTOCOL_COLORS = [
  'bg-ops-accent/90',
  'bg-ops-accent-alt/85',
  'bg-ops-magenta/80',
  'bg-ops-warning-soft/80',
  'bg-ops-slate/80',
] as const;

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
        <Icon className="h-3.5 w-3.5 text-ops-slate" />
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-ops-text-subtle">
          {title}
        </span>
      </div>
      <Link
        to={to}
        className="group inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-ops-accent/85 transition-colors hover:text-ops-accent"
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
    return <div className="mt-4 h-1 rounded-full bg-ops-rail" />;
  }

  return (
    <div className="mt-4">
      <div className="flex h-1 gap-px overflow-hidden rounded-full bg-ops-rail">
        {units.map((unit) => (
          <span key={unit.key} className={cn('h-full flex-1', unit.colorClass)} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((segment) => (
          <span key={segment.protocol} className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.08em] text-ops-text-subtle">
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
  const [incidentAutoScroll, setIncidentAutoScroll] = useState(true);

  const sequenceRef = useRef(0);
  const incidentFeedRef = useRef<HTMLDivElement | null>(null);

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

  const trafficSnapshot = useMemo(() => computeTrafficSnapshot(trafficEvents), [trafficEvents]);

  const incidentSnapshot = useMemo(
    () => computeIncidentSnapshot(incidentEvents, Date.now()),
    [incidentEvents, timeTick]
  );

  const recentIncidents = useMemo(
    () => incidentEvents.slice(0, INCIDENT_ROWS),
    [incidentEvents]
  );
  const latestIncidentId = recentIncidents[0]?.id;

  useEffect(() => {
    if (!incidentAutoScroll) return;
    const scroller = incidentFeedRef.current;
    if (!scroller) return;
    // Newest incidents render at the top of the list.
    scroller.scrollTop = 0;
  }, [incidentAutoScroll, latestIncidentId]);

  const toggleIncidentAutoScroll = () => {
    setIncidentAutoScroll((current) => !current);
  };

  const defenseSignalsLast10m = useMemo(
    () => computeDefenseSignalsLast10m(incidentEvents, Date.now()),
    [incidentEvents, timeTick]
  );

  const lastChaosCommand = useMemo(
    () => trafficEvents.find((event) => event.path.startsWith('/chaos/')),
    [trafficEvents]
  );

  const defensesOn = health.status !== 'unhealthy' && health.status !== 'unknown';
  const chaosRunning = Boolean(chaosStatus?.cpuSpikeRunning) || (chaosStatus?.memoryAllocatedMb ?? 0) > 0;
  const systemToneClass =
    health.status === 'healthy'
      ? 'text-success-500'
      : health.status === 'degraded' || health.status === 'checking'
        ? 'text-warning'
        : health.status === 'critical' || health.status === 'unhealthy'
          ? 'text-danger'
          : 'text-neutral-300';
  const systemLabel = health.status === 'healthy' ? 'NOMINAL' : health.status.toUpperCase();
  const requestLatencyToneClass =
    trafficSnapshot.avgLatencyMs === null
      ? 'text-ops-text-body'
      : trafficSnapshot.avgLatencyMs >= LATENCY_ALERT_MS
        ? 'text-danger'
        : trafficSnapshot.avgLatencyMs >= LATENCY_WARN_MS
          ? 'text-warning'
          : 'text-ops-text-body';
  const requestLatencyLabel =
    trafficSnapshot.avgLatencyMs === null
      ? 'NO DATA'
      : trafficSnapshot.avgLatencyMs >= LATENCY_ALERT_MS
        ? 'CRITICAL'
        : trafficSnapshot.avgLatencyMs >= LATENCY_WARN_MS
          ? 'ELEVATED'
          : 'NOMINAL';
  const incidentPressure = useMemo(
    () => computeIncidentPressure(incidentSnapshot),
    [incidentSnapshot]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between opacity-0 animate-terminal-in stagger-1">
        <div>
          <h1 className="text-2xl text-neutral-100 ml-2 type-heading">
            System Overview
          </h1>
          <p className="text-neutral-400 text-sm mt-1 ml-2">
            Incident-first real-time state.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-sm border border-ops-line bg-ops-panel-soft/90 px-4 py-3 shadow-[inset_0_0_18px_rgba(56,160,255,0.05)]">
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-ops-text-subtle">System</div>
            <div className={cn('text-[12px] font-mono uppercase', systemToneClass)}>{systemLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-ops-text-subtle">Control Latency</div>
            <div className="text-[12px] font-mono text-ops-text-body">
              {health.latencyMs !== undefined ? `${health.latencyMs}ms` : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-ops-text-subtle">Request Latency</div>
            <div className={cn('text-[12px] font-mono', requestLatencyToneClass)}>
              {trafficSnapshot.avgLatencyMs !== null ? `${trafficSnapshot.avgLatencyMs}ms` : '—'}
            </div>
            <div className="text-[10px] font-mono text-ops-text-quiet">{requestLatencyLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-ops-text-subtle">Incident Pressure</div>
            <div className={cn('text-[12px] font-mono uppercase', incidentPressure.toneClass)}>
              {incidentPressure.label}
            </div>
            <div className="text-[10px] font-mono text-ops-text-quiet">
              {incidentSnapshot.critical}C / {incidentSnapshot.warning}W
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-ops-text-subtle">Protocols</div>
            <div className="text-[12px] font-mono text-ops-text-body">
              {protocolLoading
                ? '...'
                : `${protocolSummary.activeListeners}/${protocolSummary.totalListeners || '—'}`}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card variant="panel" className="opacity-0 animate-terminal-in stagger-2">
          <CardContent className="p-4 pt-4">
            <OverviewSectionHeader
              title="Traffic"
              icon={Activity}
              to="/traffic"
              actionLabel="Traffic"
            />
            <div className="text-3xl font-display text-ops-text-strong">{trafficSnapshot.throughputRps} RPS</div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-wide text-ops-text-subtle">
              <span>{trafficSnapshot.activeSources} active sources</span>
              <span
                className={cn(
                  trafficSnapshot.errorRate > 5 ? 'text-ops-warning-soft' : 'text-ops-text-subtle'
                )}
              >
                {trafficSnapshot.errorRate}% errors
              </span>
            </div>
            {protocolLoading ? (
              <div className="mt-4 h-1 animate-pulse rounded-full bg-ops-line/80" />
            ) : (
              <ProtocolStrip segments={protocolSummary.segments} />
            )}
          </CardContent>
        </Card>

        <Card
          variant="panel"
          glow={incidentSnapshot.critical > 0 ? 'danger' : 'none'}
          className="opacity-0 animate-terminal-in stagger-3"
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
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ops-text-subtle">Last 10m</div>
                <div className="mt-1 text-2xl font-display text-ops-text-strong">{incidentSnapshot.last10m}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ops-text-subtle">Last hour</div>
                <div className="mt-1 text-2xl font-display text-ops-text-strong">{incidentSnapshot.lastHour}</div>
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

        <Card variant="panel" className="opacity-0 animate-terminal-in stagger-4">
          <CardContent className="p-4 pt-4">
            <OverviewSectionHeader
              title="Threats"
              icon={ShieldAlert}
              to="/fingerprints"
              actionLabel="Attackers"
            />

            <div className="text-3xl font-display text-ops-text-strong">{incidentSnapshot.activeEntities}</div>
            <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.16em] text-ops-text-subtle">
              active entities (1h)
            </div>

            <div className="mt-4 space-y-2">
              {incidentSnapshot.topSources.length === 0 ? (
                <div className="rounded-sm border border-ops-line bg-ops-panel-soft/85 px-3 py-2 text-[11px] font-mono text-ops-text-subtle">
                  No high-risk entities recorded yet.
                </div>
              ) : (
                incidentSnapshot.topSources.map((source) => (
                  <div
                    key={source.label}
                    className="flex items-center justify-between rounded-sm border border-ops-line bg-ops-panel-soft/85 px-3 py-2"
                  >
                    <span className="truncate pr-3 text-[11px] font-mono text-ops-text-body">{source.label}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-ops-text-quiet">
                      {source.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="panel" className="opacity-0 animate-terminal-in stagger-5">
        <CardHeader className="border-ops-line bg-ops-panel-soft/55 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-ops-text-subtle">
              <AlertTriangle className="h-3.5 w-3.5 text-ops-warning-soft" />
              Incident Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={toggleIncidentAutoScroll}
                aria-pressed={incidentAutoScroll}
                className="border-ops-line bg-ops-panel-soft text-ops-accent-soft hover:bg-ops-hover hover:text-ops-text-body"
              >
                {incidentAutoScroll ? (
                  <>
                    <Pause className="mr-1.5 h-3.5 w-3.5" />
                    STOP AUTO-SCROLLING
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    RESUME AUTO-SCROLLING
                  </>
                )}
              </Button>
              <Button asChild variant="secondary" size="sm" className="border-ops-line bg-ops-panel-soft text-ops-accent-soft hover:bg-ops-hover hover:text-ops-text-body">
                <Link to="/timeline">OPEN TIMELINE</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentIncidents.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ops-text-subtle">
                Waiting for actionable incidents
              </div>
              <p className="mt-2 text-sm text-ops-text-muted">
                Feed shows triggered, detected, and failed events only.
              </p>
            </div>
          ) : (
            <div className="relative">
              <div
                ref={incidentFeedRef}
                tabIndex={0}
                role="log"
                aria-live={incidentAutoScroll ? 'polite' : 'off'}
                aria-label="Incident feed"
                className="max-h-[320px] overflow-y-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ops-accent/50"
              >
                {recentIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="grid grid-cols-[72px_1fr_auto] items-start gap-3 border-b border-ops-line px-4 py-3 transition-colors hover:bg-ops-hover/35 last:border-b-0"
                  >
                    <div className="pt-[2px] text-[11px] font-mono text-ops-text-subtle">
                      {formatTime(incident.timestamp)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', severityDotClass(incident.severity))} />
                        <span className="truncate text-sm font-medium text-ops-text-strong">{incident.title}</span>
                        <Badge variant={severityBadgeVariant(incident.severity)} size="sm" className="inline-flex">
                          {incident.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[12px] font-mono text-ops-text-muted">{incident.summary}</p>
                    </div>

                    <Badge
                      variant={sourceBadgeVariant(incident.module)}
                      size="sm"
                      className="mt-[2px] border-ops-source-border bg-ops-source-bg text-ops-source-text"
                    >
                      {sourceLabel(incident.module)}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-ops-panel to-transparent" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="panel" className="opacity-0 animate-terminal-in stagger-6">
          <CardContent className="p-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-ops-accent/90" />
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-ops-text-subtle">
                  Defenses
                </span>
              </div>
              <Button asChild variant="secondary" size="sm" className="border-ops-line bg-ops-panel-soft text-ops-accent-soft hover:bg-ops-hover hover:text-ops-text-body">
                <Link to="/defense">OPEN DEFENSE</Link>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-ops-text-muted">
              <Badge variant={defensesOn ? 'success' : 'warning'} size="sm">
                {defensesOn ? 'ON' : 'CHECK'}
              </Badge>
              <Badge variant="chip">
                {defenseLoading ? 'RULES ...' : `${rules.length} RULES LOADED`}
              </Badge>
              <Badge variant="chip">
                {defenseSignalsLast10m} TRIGGERS / 10M
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card variant="panel" className="opacity-0 animate-terminal-in stagger-7">
          <CardContent className="p-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-ops-warning-soft/90" />
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-ops-text-subtle">
                  Chaos
                </span>
              </div>
              <Button asChild variant="secondary" size="sm" className="border-ops-line bg-ops-panel-soft text-ops-accent-soft hover:bg-ops-hover hover:text-ops-text-body">
                <Link to="/chaos">OPEN CHAOS</Link>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-ops-text-muted">
              {chaosLoading ? (
                <Badge variant="chip">
                  LOADING STATUS...
                </Badge>
              ) : (
                <>
                  <Badge variant={chaosRunning ? 'danger' : 'success'} size="sm" dot={chaosRunning}>
                    {chaosRunning ? 'RUNNING' : 'IDLE'}
                  </Badge>
                  <Badge variant="chip">
                    CPU {chaosStatus?.cpuSpikeRunning ? 'ACTIVE' : 'CLEAR'}
                  </Badge>
                  <Badge variant="chip">
                    MEM {chaosStatus?.memoryAllocatedMb ?? 0}MB
                  </Badge>
                  {lastChaosCommand && (
                    <Badge variant="chip">
                      LAST {lastChaosCommand.path.replace('/chaos/', '').toUpperCase()} {formatTime(lastChaosCommand.timestamp)}
                    </Badge>
                  )}
                  {!lastChaosCommand && (
                    <Badge variant="chip" className="text-ops-text-subtle">
                      NO CHAOS COMMANDS YET
                    </Badge>
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
