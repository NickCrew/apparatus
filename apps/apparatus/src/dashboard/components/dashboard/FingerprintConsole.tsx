import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Flame, RefreshCcw, Search, ShieldAlert, ShieldBan, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../ui/cn';
import { type AttackerGeoCategory, type AttackerProfile, useAttackers } from '../../hooks/useAttackers';

const CATEGORY_OPTIONS: Array<{ value: 'all' | AttackerGeoCategory; label: string }> = [
  { value: 'all', label: 'All Sources' },
  { value: 'internal', label: 'Internal' },
  { value: 'known_bot', label: 'Known Bot' },
  { value: 'unknown_external', label: 'Unknown External' },
];

const CATEGORY_LABELS: Record<AttackerGeoCategory, string> = {
  internal: 'Internal',
  known_bot: 'Known Bot',
  unknown_external: 'Unknown External',
};

function riskBadgeVariant(riskScore: number): 'success' | 'warning' | 'danger' {
  if (riskScore >= 80) return 'danger';
  if (riskScore >= 40) return 'warning';
  return 'success';
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString();
}

function heatCellClass(ratio: number): string {
  if (ratio <= 0) return 'bg-neutral-950 text-neutral-700';
  if (ratio < 0.25) return 'bg-warning-500/15 text-warning-200';
  if (ratio < 0.6) return 'bg-warning-500/30 text-warning-100';
  return 'bg-danger-500/45 text-danger-50';
}

export function FingerprintConsole() {
  const [search, setSearch] = useState('');
  const [minRisk, setMinRisk] = useState(0);
  const [category, setCategory] = useState<'all' | AttackerGeoCategory>('all');
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      q: search.trim() || undefined,
      minRisk: minRisk > 0 ? minRisk : undefined,
      category: category === 'all' ? undefined : category,
      limit: 150,
    }),
    [search, minRisk, category]
  );

  const {
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
  } = useAttackers(query, 4000);

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedIp(null);
      return;
    }
    if (!selectedIp || !profiles.some((profile) => profile.ip === selectedIp)) {
      setSelectedIp(profiles[0].ip);
    }
  }, [profiles, selectedIp]);

  const selectedProfile: AttackerProfile | null = useMemo(
    () => profiles.find((profile) => profile.ip === selectedIp) ?? profiles[0] ?? null,
    [profiles, selectedIp]
  );

  const highRiskCount = useMemo(() => profiles.filter((profile) => profile.riskScore >= 80).length, [profiles]);
  const containedCount = useMemo(
    () => profiles.filter((profile) => blackholedIps.has(profile.ip) || tarpittedIps.has(profile.ip)).length,
    [profiles, blackholedIps, tarpittedIps]
  );

  const protocolColumns = useMemo(() => {
    const totals = new Map<string, number>();
    for (const profile of profiles) {
      for (const [protocol, count] of Object.entries(profile.protocols)) {
        totals.set(protocol, (totals.get(protocol) || 0) + count);
      }
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([protocol]) => protocol);
  }, [profiles]);

  const heatmapRows = useMemo(() => profiles.slice(0, 12), [profiles]);
  const maxHeatValue = useMemo(() => {
    let max = 1;
    for (const profile of heatmapRows) {
      for (const protocol of protocolColumns) {
        max = Math.max(max, profile.protocols[protocol] || 0);
      }
    }
    return max;
  }, [heatmapRows, protocolColumns]);

  const handleAction = async (actionKey: string, action: () => Promise<boolean>) => {
    setPendingAction(actionKey);
    try {
      await action();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Attacker Fingerprinting</h1>
          <p className="text-sm text-neutral-400 mt-1 ml-2">
            Persistent attacker identities, risk scoring, protocol heatmap, and one-click containment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info" dot>{trackedCount} tracked</Badge>
          <Badge variant="danger" dot>{highRiskCount} high risk</Badge>
          <Badge variant="warning" dot>{containedCount} contained</Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-[11px] uppercase tracking-wider"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      <Card variant="panel" className="border-neutral-800/70">
        <CardContent className="p-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="relative">
              <Search className="h-3.5 w-3.5 text-neutral-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search source IP..."
                className="h-9 w-full rounded-sm border border-neutral-700 bg-neutral-900/70 pl-8 pr-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-primary/60"
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as 'all' | AttackerGeoCategory)}
                className="h-9 w-full rounded-sm border border-neutral-700 bg-neutral-900/70 px-2 text-xs text-neutral-200 focus:outline-none focus:border-primary/60"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 px-2 h-9 rounded-sm border border-neutral-700 bg-neutral-900/70">
              <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Min Risk</span>
              <input
                type="range"
                min={0}
                max={150}
                step={5}
                value={minRisk}
                onChange={(event) => setMinRisk(Number(event.target.value))}
                className="w-full accent-danger-500"
              />
              <span className="text-[11px] font-mono text-neutral-300 w-8 text-right">{minRisk}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card variant="panel" className="border-danger-500/40 bg-danger-500/5">
          <CardContent className="p-3 pt-3 text-xs text-danger-300 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-[620px] min-h-0">
        <Card variant="panel" glow="danger" className="xl:col-span-7 h-full min-h-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-danger-400" />
              Attacker Registry
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0 flex-1 min-h-0 overflow-y-auto">
            <div className="divide-y divide-neutral-800/70">
              {profiles.length === 0 && (
                <div className="p-4 text-xs text-neutral-500">No attacker profiles match current filters.</div>
              )}
              {profiles.map((profile) => {
                const isSelected = selectedProfile?.ip === profile.ip;
                const isTarpitted = tarpittedIps.has(profile.ip);
                const isBlackholed = blackholedIps.has(profile.ip);
                const tarpitKey = `${profile.ip}:tarpit`;
                const blackholeKey = `${profile.ip}:blackhole`;
                return (
                  <button
                    key={profile.ip}
                    type="button"
                    onClick={() => setSelectedIp(profile.ip)}
                    className={cn(
                      'w-full p-3 text-left transition-colors',
                      isSelected ? 'bg-primary-500/10' : 'hover:bg-neutral-900/60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-neutral-100">{profile.ip}</span>
                          <Badge variant={riskBadgeVariant(profile.riskScore)} size="sm">
                            RISK {profile.riskScore}
                          </Badge>
                          <Badge variant="neutral" size="sm">
                            {CATEGORY_LABELS[profile.geoCategory]}
                          </Badge>
                          {isBlackholed && <Badge variant="danger" size="sm" dot>BLACKHOLED</Badge>}
                          {isTarpitted && <Badge variant="warning" size="sm" dot>TARPITTED</Badge>}
                        </div>
                        <div className="mt-2 text-[11px] text-neutral-500 flex flex-wrap gap-3 font-mono">
                          <span>REQ {profile.counters.requests}</span>
                          <span>BLOCK {profile.counters.blocked}</span>
                          <span>DECEPTION {profile.counters.deception}</span>
                          <span>LAST {formatTime(profile.lastSeen)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={isTarpitted ? 'outline' : 'secondary'}
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          disabled={pendingAction === tarpitKey}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleAction(
                              tarpitKey,
                              () => (isTarpitted ? releaseTarpit(profile.ip) : trapIp(profile.ip))
                            );
                          }}
                        >
                          {isTarpitted ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
                          {isTarpitted ? 'RELEASE' : 'TARPIT'}
                        </Button>
                        <Button
                          variant={isBlackholed ? 'outline' : 'danger'}
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          disabled={pendingAction === blackholeKey}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleAction(
                              blackholeKey,
                              () => (isBlackholed ? releaseBlackhole(profile.ip) : blackholeIp(profile.ip))
                            );
                          }}
                        >
                          <ShieldBan className="h-3 w-3 mr-1" />
                          {isBlackholed ? 'UNBLOCK' : 'BLACKHOLE'}
                        </Button>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-5 grid grid-rows-2 gap-4 h-full min-h-0">
          <Card variant="panel" glow="warning" className="h-full min-h-0 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider">Kill Chain Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-0 flex-1 min-h-0 overflow-y-auto">
              {!selectedProfile && (
                <div className="p-4 text-xs text-neutral-500">Select an attacker to inspect timeline events.</div>
              )}
              {selectedProfile && (
                <div className="divide-y divide-neutral-800/60">
                  {selectedProfile.timeline.slice(0, 25).map((event, index) => (
                    <div key={`${selectedProfile.ip}-${event.timestamp}-${index}`} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-neutral-400 uppercase">{event.kind}</span>
                        <span className="text-neutral-600">{formatTime(event.timestamp)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="neutral" size="sm">{event.stage}</Badge>
                        <span className={cn(
                          'text-xs font-mono',
                          event.scoreDelta > 0 ? 'text-danger-300' : 'text-neutral-500'
                        )}>
                          +{event.scoreDelta}
                        </span>
                      </div>
                      {'path' in event.detail && (
                        <div className="mt-1 text-[11px] text-neutral-500 font-mono">
                          {(event.detail.path as string) || ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="panel" glow="danger" className="h-full min-h-0 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider">Risk Posture</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 text-xs text-neutral-400">
              <div className="flex items-center justify-between border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                <span>Selected Source</span>
                <span className="font-mono text-neutral-200">{selectedProfile?.ip || '—'}</span>
              </div>
              <div className="flex items-center justify-between border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                <span>Current Risk</span>
                <Badge variant={selectedProfile ? riskBadgeVariant(selectedProfile.riskScore) : 'neutral'}>
                  {selectedProfile ? selectedProfile.riskScore : 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                <span>Blocked Requests</span>
                <span className="font-mono text-danger-300">{selectedProfile?.counters.blocked || 0}</span>
              </div>
              <div className="flex items-center justify-between border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                <span>Deception Hits</span>
                <span className="font-mono text-warning-300">{selectedProfile?.counters.deception || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card variant="panel" glow="danger">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider">Attacker Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          {heatmapRows.length === 0 || protocolColumns.length === 0 ? (
            <div className="text-xs text-neutral-500 py-4">No protocol activity yet.</div>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="text-neutral-500">
                  <th className="text-left py-2 px-2 border-b border-neutral-800">Source IP</th>
                  {protocolColumns.map((protocol) => (
                    <th key={protocol} className="text-center py-2 px-2 border-b border-neutral-800 uppercase font-mono">
                      {protocol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map((profile) => (
                  <tr key={`heat-${profile.ip}`} className="border-b border-neutral-900">
                    <td className="py-2 px-2 font-mono text-neutral-300">{profile.ip}</td>
                    {protocolColumns.map((protocol) => {
                      const value = profile.protocols[protocol] || 0;
                      const ratio = value / maxHeatValue;
                      return (
                        <td key={`${profile.ip}-${protocol}`} className="py-1.5 px-1.5">
                          <div className={cn('h-7 rounded-sm flex items-center justify-center font-mono', heatCellClass(ratio))}>
                            {value}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
