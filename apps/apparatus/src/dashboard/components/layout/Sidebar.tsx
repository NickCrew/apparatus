import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  Fingerprint,
  Bot,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  Ghost,
  Server,
  BookOpen,
  ListTree,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '../ui/cn';
import { useApparatus } from '../../providers/ApparatusProvider';

interface NavSection {
  title: string;
  items: Array<{ path: string; label: string; icon: any }>;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Core',
    items: [
      { path: '/', label: 'Overview', icon: LayoutDashboard },
      { path: '/docs', label: 'Docs Hub', icon: BookOpen },
    ],
  },
  {
    title: 'Observe',
    items: [
      { path: '/traffic', label: 'Traffic', icon: Activity },
      { path: '/timeline', label: 'Timeline', icon: ListTree },
      { path: '/fingerprints', label: 'Attackers', icon: ShieldAlert },
    ],
  },
  {
    title: 'Defend',
    items: [
      { path: '/defense', label: 'Defense', icon: Shield },
      { path: '/deception', label: 'Deception', icon: FileWarning },
      { path: '/mtd', label: 'MTD', icon: Key },
      { path: '/identity', label: 'Identity', icon: Fingerprint },
    ],
  },
  {
    title: 'Test & Attack',
    items: [
      { path: '/chaos', label: 'Chaos', icon: Zap },
      { path: '/scenarios', label: 'Scenarios', icon: Zap },
      { path: '/drill', label: 'Breach Protocol', icon: ShieldAlert },
      { path: '/ghosts', label: 'Ghost Mocker', icon: Ghost },
      { path: '/autopilot', label: 'Autopilot', icon: Bot },
    ],
  },
  {
    title: 'Infra',
    items: [
      { path: '/cluster', label: 'Cluster', icon: Globe },
      { path: '/network', label: 'Network', icon: Activity },
      { path: '/webhooks', label: 'Webhooks', icon: Webhook },
      { path: '/listeners', label: 'Listeners', icon: Server },
      { path: '/dependencies', label: 'Supply Chain', icon: Network },
      { path: '/testing', label: 'Testing Lab', icon: FlaskConical },
    ],
  },
  {
    title: 'Config',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const { health } = useApparatus();
  const isHealthy = health.status === 'healthy';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Core']));
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    try {
      const collapsed = localStorage.getItem('apparatus-sidebar:collapsed') === '1';
      setSidebarCollapsed(collapsed);

      const expanded = localStorage.getItem('apparatus-sidebar:expanded-sections');
      if (expanded) {
        setExpandedSections(new Set(JSON.parse(expanded)));
      }

      const isHidden = localStorage.getItem('apparatus-dashboard-hud:hidden') === '1';
      setHudHidden(isHidden);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    try {
      localStorage.setItem('apparatus-sidebar:collapsed', newState ? '1' : '0');
    } catch {
      // localStorage unavailable
    }
  };

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
    try {
      localStorage.setItem('apparatus-sidebar:expanded-sections', JSON.stringify([...newExpanded]));
    } catch {
      // localStorage unavailable
    }
  };

  const toggleHudVisibility = () => {
    const newState = !hudHidden;
    try {
      localStorage.setItem('apparatus-dashboard-hud:hidden', newState ? '1' : '0');
      setHudHidden(newState);
      // Dispatch custom event to notify HudOverlayLayer
      window.dispatchEvent(new CustomEvent('hud-visibility-changed', { detail: { hidden: newState } }));
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <aside className="w-60 h-screen bg-neutral-950 border-r border-neutral-800/60 flex flex-col relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary-500/60 via-primary-500/10 to-transparent" />

      {/* Brand */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-neutral-800/40">
        {!sidebarCollapsed && (
          <img
            src="/logo/apparatus-logo.svg"
            alt="Apparatus"
            className="h-7"
          />
        )}
        <button
          onClick={toggleSidebarCollapse}
          className="p-1 hover:bg-neutral-800/50 rounded-sm transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-neutral-500" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-neutral-500" />
          )}
        </button>
      </div>

      {/* Navigation */}
      {!sidebarCollapsed && (
        <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-display font-semibold text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-widest"
              >
                <span>{section.title}</span>
                {expandedSections.has(section.title) ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              {expandedSections.has(section.title) && (
                <ul className="space-y-px">
                  {section.items.map(({ path, label, icon: Icon }) => (
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
                            <span className="font-sans rec-tech">{label}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Footer — HUD Controls, Keyboard Shortcuts & Status */}
      {!sidebarCollapsed && (
      <div className="border-t border-neutral-800/40 bg-neutral-900/20">
        {/* HUD Toggle */}
        <div className="px-3 py-2">
          <button
            onClick={toggleHudVisibility}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-[11px] font-display text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors"
            title={hudHidden ? 'Show HUD widgets' : 'Hide HUD widgets'}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{hudHidden ? 'Show HUD' : 'Hide HUD'}</span>
          </button>
        </div>

        {/* Keyboard Shortcuts Section */}
        <div className="px-3 py-2 border-t border-neutral-800/40">
          <button
            onClick={() => setShowKeyboardHints(!showKeyboardHints)}
            aria-expanded={showKeyboardHints}
            className="w-full flex items-center justify-between text-[11px] font-display text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            <span>Keyboard</span>
            {showKeyboardHints ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {showKeyboardHints && (
            <div className="mt-2.5 space-y-1.5 text-[10px] text-neutral-500">
              <div className="flex justify-between items-center gap-2">
                <span>Commands</span>
                <kbd className="px-1 py-0.5 rounded bg-neutral-800/50 text-neutral-400 font-mono">⌘K</kbd>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Help</span>
                <kbd className="px-1 py-0.5 rounded bg-neutral-800/50 text-neutral-400 font-mono">⌘?</kbd>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Close</span>
                <kbd className="px-1 py-0.5 rounded bg-neutral-800/50 text-neutral-400 font-mono">Esc</kbd>
              </div>
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="px-4 py-3 border-t border-neutral-800/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label font-display text-neutral-600 rec-casual">Status</span>
            <span className={cn(
              "text-[10px] font-mono flex items-center gap-1.5 rec-casual",
              isHealthy ? "text-success-500" : "text-danger-400"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                isHealthy ? "bg-success-500 animate-pulse-fast" : "bg-danger-500"
              )} />
              {isHealthy ? 'Online' : health.status}
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
              <span className="text-neutral-400">{health.latencyMs}ms</span>
            )}
          </div>
        </div>
      </div>
      )}
    </aside>
  );
}

Sidebar.displayName = 'Sidebar';
