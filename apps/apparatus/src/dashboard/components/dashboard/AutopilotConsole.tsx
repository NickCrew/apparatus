import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ShieldAlert, Square, Play, XCircle, Gauge, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../ui/cn';
import { useAutopilot } from '../../hooks/useAutopilot';

const TOOL_OPTIONS = [
  { id: 'cluster.attack', label: 'Cluster Attack' },
  { id: 'chaos.cpu', label: 'CPU Chaos' },
  { id: 'chaos.memory', label: 'Memory Chaos' },
  { id: 'mtd.rotate', label: 'MTD Rotate' },
  { id: 'delay', label: 'Delay' },
  { id: 'chaos.crash', label: 'Crash Process' },
] as const;

const PHASE_LABELS: Record<string, string> = {
  analyze: 'ANALYZE',
  decide: 'DECIDE',
  act: 'ACT',
  verify: 'VERIFY',
  report: 'REPORT',
  system: 'SYSTEM',
};

function statusVariant(status?: string): 'neutral' | 'warning' | 'danger' | 'success' | 'primary' {
  if (!status) return 'neutral';
  if (status === 'running') return 'primary';
  if (status === 'stopping') return 'warning';
  if (status === 'failed') return 'danger';
  if (status === 'completed') return 'success';
  if (status === 'stopped') return 'warning';
  return 'neutral';
}

export function AutopilotConsole() {
  const { session, latestReport, active, isLoading, error, start, stop, kill } = useAutopilot();
  const [objective, setObjective] = useState('Find the breaking point of the /checkout API');
  const [maxIterations, setMaxIterations] = useState(12);
  const [intervalMs, setIntervalMs] = useState(1500);
  const [forbidCrash, setForbidCrash] = useState(true);
  const [allowedTools, setAllowedTools] = useState<string[]>([
    'cluster.attack',
    'chaos.cpu',
    'chaos.memory',
    'mtd.rotate',
    'delay',
  ]);
  const thoughtStreamRef = useRef<HTMLDivElement | null>(null);

  const thoughts = session?.thoughts || [];
  const actions = session?.actions || [];

  useEffect(() => {
    const scroller = thoughtStreamRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [thoughts.length]);

  const headerSummary = useMemo(() => {
    const status = session?.state || 'idle';
    const step = session ? `${session.iteration}/${session.maxIterations}` : '0/0';
    return { status, step };
  }, [session]);

  const onToggleTool = (tool: string) => {
    setAllowedTools((current) => {
      if (current.includes(tool)) {
        const next = current.filter((item) => item !== tool);
        return next.length ? next : current;
      }
      return [...current, tool];
    });
  };

  const startMission = async () => {
    await start({
      objective,
      maxIterations,
      intervalMs,
      scope: {
        allowedTools,
        forbidCrash,
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 font-mono uppercase flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary-400" />
            Autopilot Console
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Autonomous red-team loop: analyze, decide, act, verify, report.</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(headerSummary.status)} dot>
            {headerSummary.status}
          </Badge>
          <Badge variant="neutral">ITERATION {headerSummary.step}</Badge>
        </div>
      </div>

      {error && (
        <div className="text-danger-300 border border-danger-500/30 bg-danger-900/20 px-3 py-2 rounded-[3px] text-xs font-mono">
          {error}
        </div>
      )}

      <Card variant="glass">
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
              <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Objective</label>
              <input
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                className="w-full h-10 bg-neutral-900/60 border border-neutral-800/70 rounded-[3px] px-3 text-sm text-neutral-100 focus:outline-none focus:border-primary-500/40"
                placeholder="Find the breaking point of the /checkout API"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Max Iterations</label>
              <input
                type="number"
                min={1}
                max={30}
                value={maxIterations}
                onChange={(event) => setMaxIterations(Math.max(1, Math.min(30, Number(event.target.value) || 1)))}
                className="w-full h-10 bg-neutral-900/60 border border-neutral-800/70 rounded-[3px] px-3 text-sm text-neutral-100 focus:outline-none focus:border-primary-500/40"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Interval (ms)</label>
              <input
                type="number"
                min={0}
                max={30000}
                value={intervalMs}
                onChange={(event) => setIntervalMs(Math.max(0, Math.min(30000, Number(event.target.value) || 0)))}
                className="w-full h-10 bg-neutral-900/60 border border-neutral-800/70 rounded-[3px] px-3 text-sm text-neutral-100 focus:outline-none focus:border-primary-500/40"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 h-10 px-3 border border-neutral-800/70 rounded-[3px] bg-neutral-900/60 w-full text-xs font-mono uppercase text-neutral-300">
                <input
                  type="checkbox"
                  checked={forbidCrash}
                  onChange={(event) => setForbidCrash(event.target.checked)}
                />
                Forbid Crash Tool
              </label>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase text-neutral-500 mb-2">Scope Limits</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TOOL_OPTIONS.map((tool) => {
                const checked = allowedTools.includes(tool.id);
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
              disabled={active || !objective.trim()}
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
        <Card variant="panel" className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-400" />
              Live Thought Stream
            </CardTitle>
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
                <div key={entry.id} className="text-xs font-mono text-neutral-300 leading-relaxed">
                  <span className="text-neutral-600">[{new Date(entry.at).toLocaleTimeString()}]</span>{' '}
                  <span className="text-primary-400">{PHASE_LABELS[entry.phase] || entry.phase.toUpperCase()}</span>{' '}
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-warning-400" />
              Action Log
            </CardTitle>
            <CardDescription>Tools executed during this mission.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] overflow-y-auto space-y-2 pr-1">
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
            <div className="text-[11px] uppercase text-neutral-500 font-mono">Status</div>
            <div className="mt-1 text-lg font-display text-neutral-100 uppercase">{session?.state || 'idle'}</div>
          </div>
          <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
            <div className="text-[11px] uppercase text-neutral-500 font-mono">Breaking Point</div>
            <div className="mt-1 text-lg font-display text-neutral-100">
              {session?.summary?.breakingPointRps ? `${session.summary.breakingPointRps.toFixed(1)} RPS` : 'Not found'}
            </div>
          </div>
          <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
            <div className="text-[11px] uppercase text-neutral-500 font-mono">Last Verification</div>
            <div className="mt-1 text-sm font-mono text-neutral-200">
              {latestReport?.verification.notes || session?.summary?.failureReason || 'No verification events yet.'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
