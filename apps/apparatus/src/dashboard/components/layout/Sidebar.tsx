import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Zap,
  Network,
  FlaskConical,
  Settings,
  Activity,
  FileWarning,
  Globe,
  Webhook,
  Key,
} from 'lucide-react';
import { cn } from '../ui/cn';
import { useApparatus } from '../../providers/ApparatusProvider';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/traffic', label: 'Traffic', icon: Activity },
  { path: '/defense', label: 'Defense', icon: Shield },
  { path: '/deception', label: 'Deception', icon: FileWarning },
  { path: '/chaos', label: 'Chaos', icon: Zap },
  { path: '/cluster', label: 'Cluster', icon: Globe },
  { path: '/webhooks', label: 'Webhooks', icon: Webhook },
  { path: '/mtd', label: 'MTD', icon: Key },
  { path: '/testing', label: 'Testing Lab', icon: FlaskConical },
  { path: '/network', label: 'Network', icon: Network },
  { path: '/scenarios', label: 'Scenarios', icon: Zap },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar() {
  const { health } = useApparatus();
  const isHealthy = health.status === 'healthy';

  return (
    <aside className="w-60 h-screen bg-neutral-950 border-r border-neutral-800/60 flex flex-col relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary-500/60 via-primary-500/10 to-transparent" />

      {/* Brand */}
      <div className="h-14 flex items-center px-5 border-b border-neutral-800/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[3px] bg-primary-500/8 border border-primary-500/40 flex items-center justify-center">
            <span className="text-primary-400 font-bold font-display text-sm leading-none">A</span>
          </div>
          <span className="text-base font-display font-semibold text-neutral-200 tracking-wide uppercase">
            Apparatus
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Main navigation">
        <div className="px-3 mb-3 text-label font-display text-neutral-600 uppercase">
          Modules
        </div>
        <ul className="space-y-px">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium relative rounded-[3px]',
                    'transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/40',
                    isActive
                      ? 'bg-primary-500/8 text-primary-300'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/60'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active accent bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary-500 shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
                    )}
                    <Icon className={cn(
                      "h-[15px] w-[15px] flex-shrink-0",
                      isActive ? "text-primary-400" : "text-neutral-600"
                    )} strokeWidth={1.75} />
                    <span className="font-sans">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer — System Status */}
      <div className="px-4 py-3 border-t border-neutral-800/40 bg-neutral-900/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-label font-display text-neutral-600 uppercase">Status</span>
          <span className={cn(
            "text-[10px] font-mono flex items-center gap-1.5",
            isHealthy ? "text-success-500" : "text-danger-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isHealthy ? "bg-success-500 animate-pulse-fast" : "bg-danger-500"
            )} />
            {isHealthy ? 'ONLINE' : health.status.toUpperCase()}
          </span>
        </div>
        <div className="w-full h-[3px] bg-neutral-900 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              isHealthy
                ? "bg-success-500/80 w-[98%]"
                : "bg-danger-500/60 w-[20%]"
            )}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-[10px] font-mono text-neutral-700">
          <span>{health.version ? `v${health.version}` : 'v—'}</span>
          {health.latencyMs !== undefined && (
            <span className="text-neutral-600">{health.latencyMs}ms</span>
          )}
        </div>
      </div>
    </aside>
  );
}

Sidebar.displayName = 'Sidebar';
