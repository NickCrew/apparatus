import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ShieldAlert, Square, Play, Pause, XCircle, Gauge, Activity, Database, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../ui/cn';
import { useAutopilot } from '../../hooks/useAutopilot';
import {
  clampIntervalMs,
  clampMaxIterations,
  compactAssetLabel,
  deriveAutopilotEvasionTelemetryModel,
  deriveAutopilotMemoryPanelModel,
  formatSeenAt,
  isMissionStartDisabled,
  statusVariant,
  toggleAllowedTool,
} from './AutopilotConsole.logic';

const TOOL_OPTIONS = [
  { id: 'cluster.attack', label: 'Cluster Attack' },
  { id: 'chaos.cpu', label: 'CPU Chaos' },
  { id: 'chaos.memory', label: 'Memory Chaos' },
  { id: 'mtd.rotate', label: 'MTD Rotate' },
  { id: 'delay', label: 'Delay' },
  { id: 'chaos.crash', label: 'Crash Process' },
] as const;

const FALLBACK_PERSONA_OPTIONS = [
  {
    id: 'script_kiddie',
    label: 'Script Kiddie',
    description: 'Noisy and fast with low stealth discipline.',
    tags: ['LOW_STEALTH', 'HIGH_NOISE', 'FAST_LOOP'],
  },
  {
    id: 'researcher',
    label: 'Researcher',
    description: 'Methodical and evidence-first with lower impact pacing.',
    tags: ['METHODICAL', 'LOW_IMPACT', 'EVIDENCE_FIRST'],
  },
  {
    id: 'apt',
    label: 'APT',
    description: 'Stealth-oriented and adaptive with evasive posture.',
    tags: ['HIGH_STEALTH', 'ADAPTIVE', 'PERSISTENT'],
  },
] as const;

const PHASE_LABELS: Record<string, string> = {
  analyze: 'ANALYZE',
  decide: 'DECIDE',
  act: 'ACT',
  verify: 'VERIFY',
  report: 'REPORT',
  system: 'SYSTEM',
};

export function AutopilotConsole() {
  const { session, latestReport, active, isLoading, error, config, start, stop, kill } = useAutopilot();
  const [objective, setObjective] = useState('Find the breaking point of the /checkout API');
  const [maxIterations, setMaxIterations] = useState(12);
  const [intervalMs, setIntervalMs] = useState(1500);
  const [selectedPersona, setSelectedPersona] = useState('script_kiddie');
  const [forbidCrash, setForbidCrash] = useState(true);
  const [allowedTools, setAllowedTools] = useState<string[]>([
    'cluster.attack',
    'chaos.cpu',
    'chaos.memory',
    'mtd.rotate',
    'delay',
  ]);
  const thoughtStreamRef = useRef<HTMLDivElement | null>(null);
  const actionLogRef = useRef<HTMLDivElement | null>(null);
  const [thoughtAutoScroll, setThoughtAutoScroll] = useState(true);
  const [actionAutoScroll, setActionAutoScroll] = useState(true);
  const effectiveAllowedTools = useMemo(
    () => (forbidCrash ? allowedTools.filter((tool) => tool !== 'chaos.crash') : allowedTools),
    [allowedTools, forbidCrash]
  );
  const personaOptions = useMemo(
    () => (config?.personas?.length ? config.personas : [...FALLBACK_PERSONA_OPTIONS]),
    [config?.personas]
  );
  const isPersonaSupported = useMemo(
    () => personaOptions.some((persona) => persona.id === selectedPersona),
    [personaOptions, selectedPersona]
  );
  const selectedPersonaModel = useMemo(
    () => (isPersonaSupported
      ? personaOptions.find((persona) => persona.id === selectedPersona)
      : personaOptions[0]),
    [isPersonaSupported, personaOptions, selectedPersona]
  );

  const thoughts = session?.thoughts || [];
  const actions = session?.actions || [];
  const sessionContext = session?.sessionContext;

  const { acquiredAssets, relationStrip, breakSignals, openedPaths, preconditions } = useMemo(
    () => deriveAutopilotMemoryPanelModel(sessionContext),
    [sessionContext]
  );
  const {
    blockedSignals,
    blockedSignalEvents,
    evasionManeuvers,
    successfulEvasions,
    stalledEvasions,
  } = useMemo(
    () => deriveAutopilotEvasionTelemetryModel({ breakSignals, actions }),
    [actions, breakSignals]
  );

  useEffect(() => {
    if (!thoughtAutoScroll) return;
    const scroller = thoughtStreamRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [thoughtAutoScroll, thoughts.length]);

  useEffect(() => {
    if (!actionAutoScroll) return;
    const scroller = actionLogRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [actionAutoScroll, actions.length]);

  useEffect(() => {
    const fallbackPersona = config?.defaultPersona || personaOptions[0]?.id || 'script_kiddie';
    if (!isPersonaSupported) {
      setSelectedPersona(fallbackPersona);
    }
  }, [config?.defaultPersona, isPersonaSupported, personaOptions]);

  const headerSummary = useMemo(() => {
    const status = session?.state || 'idle';
    const step = session ? `${session.iteration}/${session.maxIterations}` : '0/0';
    return { status, step };
  }, [session]);

  const onToggleTool = (tool: string) => {
    setAllowedTools((current) => toggleAllowedTool(current, tool));
  };

  const startMission = async () => {
    await start({
      objective,
      maxIterations,
      intervalMs,
      persona: selectedPersona,
      scope: {
        allowedTools: effectiveAllowedTools,
        forbidCrash,
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 font-mono flex items-center gap-2 ml-2">
            <Bot className="h-6 w-6 text-primary-400" />
            Autopilot Console
          </h1>
          <p className="text-neutral-400 text-sm mt-1 ml-2">Autonomous red-team loop: analyze, decide, act, verify, report.</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(headerSummary.status)} dot>
            {headerSummary.status}
          </Badge>
          <Badge variant="neutral">Iteration {headerSummary.step}</Badge>
        </div>
      </div>

      {error && (
        <div className="text-danger-300 border border-danger-500/30 bg-danger-900/20 px-3 py-2 rounded-[3px] text-xs font-mono">
          {error}
        </div>
      )}

      <Card variant="glass" glow="danger">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary-400" />
            Mission Control
          </CardTitle>
          <CardDescription>Define objective, tool scope, and execution profile before engaging autopilot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-mono text-neutral-500 mb-1">Objective</label>
              <input
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                className="w-full h-10 bg-neutral-900/60 border border-neutral-800/70 rounded-[3px] px-3 text-sm text-neutral-100 focus:outline-none focus:border-primary-500/40"
                placeholder="Find the breaking point of the /checkout API"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-neutral-500 mb-1">Max Iterations</label>
              <input
                type="number"
                min={1}
                max={30}
                value={maxIterations}
                onChange={(event) => setMaxIterations(clampMaxIterations(Number(event.target.value)))}
                className="w-full h-10 bg-neutral-900/60 border border-neutral-800/70 rounded-[3px] px-3 text-sm text-neutral-100 focus:outline-none focus:border-primary-500/40"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-neutral-500 mb-1">Interval (ms)</label>
              <input
                type="number"
                min={0}
                max={30000}
                value={intervalMs}
                onChange={(event) => setIntervalMs(clampIntervalMs(Number(event.target.value)))}
                className="w-full h-10 bg-neutral-900/60 border border-neutral-800/70 rounded-[3px] px-3 text-sm text-neutral-100 focus:outline-none focus:border-primary-500/40"
              />
            </div>

            <div>
              <label htmlFor="autopilot-persona" className="block text-[11px] font-mono text-neutral-500 mb-1">Persona</label>
              <select
                id="autopilot-persona"
                value={selectedPersona}
                onChange={(event) => setSelectedPersona(event.target.value)}
                className="w-full h-10 bg-neutral-900/60 border border-neutral-800/70 rounded-[3px] px-3 text-sm text-neutral-100 focus:outline-none focus:border-primary-500/40"
              >
                {personaOptions.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 h-10 px-3 border border-neutral-800/70 rounded-[3px] bg-neutral-900/60 w-full text-xs font-mono text-neutral-300">
                <input
                  type="checkbox"
                  checked={forbidCrash}
                  onChange={(event) => setForbidCrash(event.target.checked)}
                />
                Forbid Crash Tool
              </label>
            </div>
          </div>

          <div className="rounded-[3px] border border-neutral-800/70 bg-neutral-900/45 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-neutral-500">Persona Profile</span>
              <span className="text-xs font-mono text-neutral-100">{selectedPersonaModel?.label || 'Unknown'}</span>
              {selectedPersonaModel?.tags?.map((tag) => (
                <Badge key={tag} size="sm" variant="warning">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="mt-1 text-[11px] text-neutral-400 font-mono">
              {selectedPersonaModel?.description || 'No persona metadata available.'}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono text-neutral-500 mb-2">Scope Limits</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TOOL_OPTIONS.map((tool) => {
                const checked = effectiveAllowedTools.includes(tool.id);
                const disabledBySafety = forbidCrash && tool.id === 'chaos.crash';

                return (
                  <label
                    key={tool.id}
                    className={cn(
                      'flex items-center gap-2 h-9 px-2.5 rounded-[3px] border text-xs font-mono',
                      checked ? 'bg-primary-500/10 border-primary-500/40 text-primary-200' : 'bg-neutral-900/50 border-neutral-800/70 text-neutral-400',
                      disabledBySafety && 'opacity-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked && !disabledBySafety}
                      disabled={disabledBySafety}
                      onChange={() => onToggleTool(tool.id)}
                    />
                    <span>{tool.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="neon"
              size="lg"
              onClick={startMission}
              disabled={isMissionStartDisabled(active, objective)}
              isLoading={isLoading && !active}
              leftIcon={<Play className="h-4 w-4" />}
            >
              Engage Autopilot
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={stop}
              disabled={!active}
              isLoading={isLoading && active}
              leftIcon={<Square className="h-4 w-4" />}
            >
              Soft Stop
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={kill}
              leftIcon={<XCircle className="h-4 w-4" />}
            >
              Kill Switch
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card variant="panel" glow="primary" className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary-400" />
                Live Thought Stream
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setThoughtAutoScroll((current) => !current)}
                className="h-7 px-2 text-[10px] font-mono uppercase tracking-wider"
                aria-pressed={thoughtAutoScroll}
              >
                {thoughtAutoScroll ? (
                  <>
                    <Pause className="mr-1 h-3 w-3" />
                    Stop Auto-Scrolling
                  </>
                ) : (
                  <>
                    <Play className="mr-1 h-3 w-3" />
                    Resume Auto-Scrolling
                  </>
                )}
              </Button>
            </div>
            <CardDescription>Internal reasoning trace from the autonomous loop.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={thoughtStreamRef}
              className="h-[320px] overflow-y-auto rounded-[3px] border border-neutral-800/60 bg-black/35 p-3 space-y-2"
            >
              {thoughts.length === 0 && (
                <div className="text-xs text-neutral-600 font-mono">Awaiting mission activity...</div>
              )}

              {thoughts.map((entry) => (
                <div key={entry.id} className="text-xs font-mono text-neutral-300 leading-relaxed group">
                  <span className="text-neutral-600">[{new Date(entry.at).toLocaleTimeString()}]</span>{' '}
                  <span className="text-primary-400 font-bold">{PHASE_LABELS[entry.phase] || entry.phase.toUpperCase()}</span>{' '}
                  <span className="rec-casual rec-slant text-neutral-200 group-hover:text-primary transition-colors">{entry.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="panel" glow="primary">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-warning-400" />
                Action Log
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setActionAutoScroll((current) => !current)}
                className="h-7 px-2 text-[10px] font-mono uppercase tracking-wider"
                aria-pressed={actionAutoScroll}
              >
                {actionAutoScroll ? (
                  <>
                    <Pause className="mr-1 h-3 w-3" />
                    Stop Auto-Scrolling
                  </>
                ) : (
                  <>
                    <Play className="mr-1 h-3 w-3" />
                    Resume Auto-Scrolling
                  </>
                )}
              </Button>
            </div>
            <CardDescription>Tools executed during this mission.</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={actionLogRef} className="h-[320px] overflow-y-auto space-y-2 pr-1">
              {actions.length === 0 && (
                <div className="text-xs text-neutral-600 font-mono">No tool executions yet.</div>
              )}

              {actions.map((entry) => (
                <div key={entry.id} className="p-2 rounded-[3px] border border-neutral-800/70 bg-neutral-900/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-mono text-neutral-100">{entry.tool}</div>
                    <Badge size="sm" variant={entry.ok ? 'success' : 'danger'}>
                      {entry.ok ? 'ok' : 'error'}
                    </Badge>
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500 font-mono">{entry.message}</div>
                  {entry.maneuver && (
                    <div className="mt-1 text-[11px] font-mono text-warning-300">
                      signal={entry.maneuver.triggerSignal} | counter={entry.maneuver.countermeasure}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Report Card</CardTitle>
          <CardDescription>Session summary and detected breaking conditions.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
            <div className="text-[11px] text-neutral-500 font-mono">Status</div>
            <div className="mt-1 text-lg font-display text-neutral-100">{session?.state || 'idle'}</div>
          </div>
          <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
            <div className="text-[11px] text-neutral-500 font-mono">Breaking Point</div>
            <div className="mt-1 text-lg font-display text-neutral-100">
              {session?.summary?.breakingPointRps ? `${session.summary.breakingPointRps.toFixed(1)} RPS` : 'Not found'}
            </div>
          </div>
          <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
            <div className="text-[11px] text-neutral-500 font-mono">Last Verification</div>
            <div className="mt-1 text-sm font-mono text-neutral-200">
              {latestReport?.verification.notes || session?.summary?.failureReason || 'No verification events yet.'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Defense Telemetry</CardTitle>
          <CardDescription>Blocked-vs-evaded signal tracking for recent autopilot maneuvers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
              <div className="text-[11px] text-neutral-500 font-mono">Blocked Events</div>
              <div className="mt-1 text-lg font-display text-danger-200">{blockedSignalEvents}</div>
            </div>
            <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
              <div className="text-[11px] text-neutral-500 font-mono">Distinct Signals</div>
              <div className="mt-1 text-lg font-display text-neutral-100">{blockedSignals.length}</div>
            </div>
            <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
              <div className="text-[11px] text-neutral-500 font-mono">Successful Evasions</div>
              <div className="mt-1 text-lg font-display text-success-200">{successfulEvasions}</div>
            </div>
            <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
              <div className="text-[11px] text-neutral-500 font-mono">Stalled Evasions</div>
              <div className="mt-1 text-lg font-display text-warning-200">{stalledEvasions}</div>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-mono">Detected Defense Signals</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {blockedSignals.length === 0 ? (
                <span className="text-[11px] text-neutral-600 font-mono">none</span>
              ) : (
                blockedSignals.slice(-8).map((signal) => (
                  <Badge key={signal} size="sm" variant="danger">{signal}</Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-mono">Recent Evasion Maneuvers</div>
            <div
              className="mt-1 h-[170px] overflow-y-auto rounded-[3px] border border-neutral-800/60 bg-black/25 p-2 space-y-2"
              role="log"
              aria-label="Recent evasion maneuvers"
              tabIndex={0}
            >
              {isLoading && !session ? (
                <div className="text-xs text-neutral-600 font-mono">Loading telemetry...</div>
              ) : evasionManeuvers.length === 0 ? (
                <div className="text-xs text-neutral-600 font-mono">
                  {session ? 'No evasion maneuvers recorded yet.' : 'Start a mission to stream telemetry.'}
                </div>
              ) : (
                evasionManeuvers.map((entry) => (
                  <div key={entry.id} className="rounded-[3px] border border-neutral-800/70 bg-neutral-900/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-neutral-200 font-mono">
                        {entry.triggerSignal} <span className="text-neutral-500">-&gt;</span> {entry.countermeasure || 'none'}
                      </div>
                      <Badge size="sm" variant={entry.ok ? 'success' : 'warning'}>
                        {entry.ok ? 'evaded' : 'blocked'}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 font-mono">{entry.rationale}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card variant="panel" glow="primary" className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary-400" />
              Acquired Assets
            </CardTitle>
            <CardDescription>Session memory of discovered assets with source attribution and recency.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] overflow-y-auto space-y-2 pr-1">
              {acquiredAssets.length === 0 && (
                <div className="text-xs text-neutral-600 font-mono">No assets captured yet.</div>
              )}

              {acquiredAssets.map((asset) => (
                <div key={asset.id} className="p-2 rounded-[3px] border border-neutral-800/70 bg-neutral-900/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge size="sm" variant="neutral">{asset.type}</Badge>
                      <div className="text-xs font-mono text-neutral-100 truncate" title={asset.value}>
                        {asset.value}
                      </div>
                    </div>
                    <Badge size="sm" variant="primary">{Math.round(asset.confidence * 100)}%</Badge>
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500 font-mono">
                    src {asset.source} | seen {formatSeenAt(asset.lastSeenAt)} | x{asset.occurrences}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="panel" glow="primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary-400" />
              Relation Strip
            </CardTitle>
            <CardDescription>Compact objective progress and memory relationship map.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-[11px] text-neutral-500 font-mono">Break Signals</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {breakSignals.length === 0 ? (
                  <span className="text-[11px] text-neutral-600 font-mono">none</span>
                ) : (
                  breakSignals.slice(-4).map((signal) => (
                    <Badge key={signal} size="sm" variant="danger">{signal}</Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-neutral-500 font-mono">Opened Paths</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {openedPaths.length === 0 ? (
                  <span className="text-[11px] text-neutral-600 font-mono">none</span>
                ) : (
                  openedPaths.slice(-4).map((pathValue) => (
                    <Badge key={pathValue} size="sm" variant="primary">{pathValue}</Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-neutral-500 font-mono">Relation Links</div>
              <div className="mt-1 h-[150px] overflow-y-auto space-y-1 rounded-[3px] border border-neutral-800/60 bg-black/25 p-2">
                {relationStrip.length === 0 && (
                  <div className="text-[11px] text-neutral-600 font-mono">No relations captured yet.</div>
                )}

                {relationStrip.map((relation) => (
                  <div key={relation.id} className="text-[11px] font-mono text-neutral-300">
                    <span className="text-primary-300">{compactAssetLabel(relation.fromAssetId)}</span>{' '}
                    <span className="text-neutral-500">[{relation.type}]</span>{' '}
                    <span className="text-primary-300">{compactAssetLabel(relation.toAssetId)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-neutral-500 font-mono">
              Preconditions: {preconditions.length > 0 ? preconditions.slice(-2).join(', ') : 'none'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
