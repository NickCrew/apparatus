import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert, StopCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { useDrills } from '../../hooks/useDrills';
import { cn } from '../ui/cn';

function statusVariant(status: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'won':
      return 'success';
    case 'failed':
      return 'danger';
    case 'cancelled':
      return 'warning';
    case 'active':
    case 'stabilizing':
    case 'arming':
      return 'primary';
    default:
      return 'neutral';
  }
}

export function DrillConsole() {
  const {
    drills,
    activeRun,
    activeDrill,
    debrief,
    isLoading,
    error,
    startDrill,
    markDetected,
    cancelRun,
  } = useDrills();

  const isTerminal = activeRun
    ? activeRun.status === 'won' || activeRun.status === 'failed' || activeRun.status === 'cancelled'
    : false;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-100 type-heading flex items-center gap-2 ml-2">
            <ShieldAlert className="h-5 w-5 text-danger-400" />
            Breach Protocol
          </h1>
          <p className="text-neutral-400 text-sm mt-1 ml-2">Run timed incident drills and practice response under pressure.</p>
        </div>

        {activeRun && (
          <Badge variant={statusVariant(activeRun.status)}>
            {activeRun.status}
          </Badge>
        )}
      </div>

      {error && (
        <div className="rounded border border-danger-900/60 bg-danger-950/20 px-3 py-2 text-xs text-danger-300 font-mono">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="panel" className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Lobby</CardTitle>
            <CardDescription>Select and start a drill scenario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {drills.length === 0 && (
              <div className="text-xs text-neutral-500 font-mono">No drills available.</div>
            )}

            {drills.map((drill) => {
              const selected = activeRun?.drillId === drill.id;
              return (
                <div
                  key={drill.id}
                  className={cn(
                    'rounded border px-3 py-3 transition-colors',
                    selected ? 'border-primary-500/60 bg-primary-500/10' : 'border-neutral-800 bg-neutral-900/30'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-neutral-100 font-semibold">{drill.name}</div>
                    <Badge variant="neutral">{drill.difficulty}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">{drill.description}</p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={isLoading || !!activeRun && !isTerminal}
                    onClick={() => startDrill(drill.id)}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Start Shift
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card variant="glass" glow="danger" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm">Incident Console</span>
              {activeRun ? (
                <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {activeRun.elapsedSec}s
                </span>
              ) : null}
            </CardTitle>
            <CardDescription>
              {activeDrill ? activeDrill.briefing : 'Start a drill to begin incident response simulation.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeRun && (
              <div className="rounded border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
                No active run.
              </div>
            )}

            {activeRun && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
                    <div className="text-[11px] tracking-wide text-neutral-500">CPU</div>
                    <div className="mt-1 text-lg font-mono text-neutral-200">
                      {activeRun.lastSnapshot ? `${activeRun.lastSnapshot.cpuPercent.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
                    <div className="text-[11px] tracking-wide text-neutral-500">Error Rate</div>
                    <div className="mt-1 text-lg font-mono text-neutral-200">
                      {activeRun.lastSnapshot ? `${(activeRun.lastSnapshot.errorRate * 100).toFixed(2)}%` : '—'}
                    </div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
                    <div className="text-[11px] tracking-wide text-neutral-500">Blocked SQLi</div>
                    <div className="mt-1 text-lg font-mono text-neutral-200">
                      {activeRun.lastSnapshot ? `${(activeRun.lastSnapshot.blockedSqliRatio * 100).toFixed(2)}%` : '—'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] font-mono tracking-wide text-neutral-400">
                  <span className="rounded border border-neutral-800 bg-neutral-900/40 px-2 py-1">
                    Ghost: {activeRun.lastSnapshot?.ghostTrafficActive ? 'Active' : 'Idle'}
                  </span>
                  <span className="rounded border border-neutral-800 bg-neutral-900/40 px-2 py-1">
                    Cluster Attack: {activeRun.lastSnapshot?.clusterAttackActive ? 'Active' : 'Idle'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={markDetected}
                    disabled={isTerminal || Boolean(activeRun.detectedAt)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {activeRun.detectedAt ? 'Detection Marked' : 'Mark Detected'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={cancelRun}
                    disabled={isTerminal}
                  >
                    <StopCircle className="h-4 w-4" />
                    Cancel Run
                  </Button>
                </div>

                <div className="rounded border border-neutral-800 bg-black/30">
                  <div className="border-b border-neutral-800 px-3 py-2 text-[11px] uppercase tracking-wide text-neutral-500 font-mono">
                    Timeline
                  </div>
                  <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-2">
                    {activeRun.timeline.length === 0 && (
                      <div className="text-xs text-neutral-500 font-mono">No timeline events yet.</div>
                    )}
                    {[...activeRun.timeline].reverse().map((event, idx) => (
                      <div key={`${event.at}-${idx}`} className="text-xs font-mono text-neutral-300">
                        <span className="text-neutral-500">[{new Date(event.at).toLocaleTimeString()}]</span>{' '}
                        <span className="text-primary-300">{event.type}</span>{' '}
                        {event.message}
                      </div>
                    ))}
                  </div>
                </div>

                {debrief && (
                  <div className="rounded border border-primary-700/40 bg-primary-950/20 p-3">
                    <div className="text-xs font-mono uppercase tracking-wide text-primary-300 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Debrief
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="text-neutral-300">Score: <span className="text-primary-300">{debrief.score.total}</span></div>
                      <div className="text-neutral-300">TTD: <span className="text-neutral-100">{debrief.score.ttdSec}s</span></div>
                      <div className="text-neutral-300">TTM: <span className="text-neutral-100">{debrief.score.ttmSec}s</span></div>
                      <div className="text-neutral-300">TTR: <span className="text-neutral-100">{debrief.score.ttrSec}s</span></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
