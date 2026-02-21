import { Activity, Shield, Zap, Globe, Cpu } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PerformanceVisualizer } from './PerformanceVisualizer';
import { useApparatus } from '../../providers/ApparatusProvider';
import { cn } from '../ui/cn';

const MOCK_LOGS = [
  { id: 1, time: '10:42:05', level: 'WARN', module: 'WAF', message: 'Rate limit exceeded for IP 192.168.1.42' },
  { id: 2, time: '10:41:58', level: 'INFO', module: 'AUTH', message: 'New session established: user-admin' },
  { id: 3, time: '10:41:12', level: 'ERR', module: 'CHAOS', message: 'Latency injection failed: payment-gateway' },
  { id: 4, time: '10:40:30', level: 'INFO', module: 'NET', message: 'Inbound traffic spike on port 443' },
  { id: 5, time: '10:39:44', level: 'INFO', module: 'TLS', message: 'Certificate rotation completed' },
];

export function Overview() {
  const { health } = useApparatus();

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-end justify-between opacity-0 animate-terminal-in stagger-1">
        <div>
          <h1 className="text-display-lg font-display text-neutral-100 uppercase tracking-tight">
            System Overview
          </h1>
          <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest mt-1">
            Real-time telemetry / Control status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">EXPORT</Button>
          <Button variant="primary" size="sm" leftIcon={<Zap className="h-3 w-3" />}>
            ENGAGE DEFENSE
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 opacity-0 animate-terminal-in stagger-2">
        <StatCard
          label="THROUGHPUT"
          value="2.4 GB/s"
          trend={{ value: 12, direction: 'up' }}
          icon={Activity}
          accent="primary"
        />
        <StatCard
          label="ACTIVE_THREATS"
          value="42"
          trend={{ value: 5, direction: 'down' }}
          icon={Shield}
          accent="danger"
        />
        <StatCard
          label="SYSTEM_LOAD"
          value="78%"
          trend={{ value: 2, direction: 'up' }}
          icon={Cpu}
          accent="warning"
        />
        <StatCard
          label="NETWORK_HEALTH"
          value={health.status === 'healthy' ? '99.9%' : 'DEGRADED'}
          trend={{ value: 0, direction: 'neutral' }}
          icon={Globe}
          accent="success"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left: Traffic + Modules (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Performance Dashboard */}
          <div className="opacity-0 animate-terminal-in stagger-3">
            <PerformanceVisualizer />
          </div>

          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-0 animate-terminal-in stagger-5">
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase">
                  <Shield className="h-3.5 w-3.5 text-primary/70" />
                  Active Defenses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-0">
                <ModuleRow label="WAF Ruleset" status="Active" variant="success" />
                <ModuleRow label="IP Reputation" status="Learning" variant="warning" />
                <ModuleRow label="Rate Limiter" status="Active" variant="success" />
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase">
                  <Zap className="h-3.5 w-3.5 text-warning/70" />
                  Chaos Experiments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-0">
                <ModuleRow label="Latency Injection" status="Idle" variant="neutral" />
                <ModuleRow label="Pod Kill" status="Running" variant="danger" dot />
                <ModuleRow label="DNS Chaos" status="Idle" variant="neutral" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: Logs + Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Logs */}
          <div className="opacity-0 animate-terminal-in stagger-4 h-full flex flex-col">
            <Card variant="default" className="bg-black border-white/5 flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-[11px] font-mono tracking-widest uppercase">Telemetry Logs</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-3 pt-0 min-h-0">
                <div className="space-y-0.5 font-mono text-[10px] leading-relaxed">
                  {MOCK_LOGS.map((log) => (
                    <div key={log.id} className="flex gap-2 py-1 border-b border-white/[0.03] last:border-0 opacity-80 hover:opacity-100 transition-opacity">
                      <span className="text-neutral-700 flex-shrink-0">{log.time}</span>
                      <span className={cn(
                        "flex-shrink-0 font-bold",
                        log.level === 'ERR' ? 'text-danger' :
                        log.level === 'WARN' ? 'text-warning' :
                        'text-neutral-500'
                      )}>{log.level.padEnd(4)}</span>
                      <span className="text-neutral-300 truncate">{log.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="opacity-0 animate-terminal-in stagger-6">
            <Card variant="panel" className="border-primary/20 bg-primary/[0.02]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[11px] font-mono tracking-widest uppercase">Manual Overrides</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 p-3 pt-0">
                <Button variant="secondary" size="sm">FLUSH_CACHE</Button>
                <Button variant="secondary" size="sm">ROTATE_KEYS</Button>
                <Button variant="danger" size="sm" className="w-full col-span-2 mt-1">
                  EMERGENCY_SHUTDOWN
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleRow({ label, status, variant, dot }: {
  label: string;
  status: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
  dot?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 px-2 bg-white/[0.03] border border-white/[0.05]">
      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{label}</span>
      <Badge variant={variant} size="sm" dot={dot}>{status}</Badge>
    </div>
  );
}
