import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  BrainCircuit,
  EyeOff,
  GripHorizontal,
  ShieldAlert,
} from 'lucide-react';
import { useApparatus } from '../../providers/ApparatusProvider';
import { useAutopilot } from '../../hooks/useAutopilot';
import { useTrafficStream } from '../../hooks/useTrafficStream';
import { cn } from '../ui/cn';

type WidgetId = 'stats' | 'thoughts';

interface WidgetPreference {
  x: number;
  y: number;
  visible: boolean;
}

type HudPreferences = Record<WidgetId, WidgetPreference>;

const HUD_PREFERENCES_KEY = 'apparatus-dashboard-hud:v1';
const HUD_VISIBILITY_KEY = 'apparatus-dashboard-hud:hidden';
const TRAFFIC_WINDOW_MS = 15_000;
const FALLBACK_SAMPLE_SIZE = 80;
const KEYBOARD_MOVE_STEP = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getWidgetSize(widgetId: WidgetId): { width: number; height: number } {
  if (widgetId === 'stats') {
    return { width: 248, height: 138 };
  }
  return { width: 340, height: 196 };
}

function getDefaultPreferences(viewportWidth: number, viewportHeight: number): HudPreferences {
  const statsSize = getWidgetSize('stats');
  const thoughtsSize = getWidgetSize('thoughts');

  return {
    stats: {
      x: Math.max(12, viewportWidth - statsSize.width - 16),
      y: 16,
      visible: false,
    },
    thoughts: {
      x: 16,
      y: Math.max(16, viewportHeight - thoughtsSize.height - 16),
      visible: false,
    },
  };
}

function clampPosition(widgetId: WidgetId, x: number, y: number): { x: number; y: number } {
  const { width, height } = getWidgetSize(widgetId);
  const maxX = Math.max(12, window.innerWidth - width - 12);
  const maxY = Math.max(12, window.innerHeight - height - 12);
  return {
    x: clamp(x, 12, maxX),
    y: clamp(y, 12, maxY),
  };
}

function loadPreferences(): HudPreferences {
  const fallback = getDefaultPreferences(window.innerWidth, window.innerHeight);
  try {
    const raw = localStorage.getItem(HUD_PREFERENCES_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<HudPreferences>;
    const next = { ...fallback };

    (['stats', 'thoughts'] as const).forEach((widgetId) => {
      const incoming = parsed[widgetId];
      if (!incoming) return;
      const visible = incoming.visible !== false;
      const { x, y } = clampPosition(widgetId, incoming.x ?? next[widgetId].x, incoming.y ?? next[widgetId].y);
      next[widgetId] = { x, y, visible };
    });

    return next;
  } catch {
    return fallback;
  }
}

function loadHudHidden(): boolean {
  try {
    const stored = localStorage.getItem(HUD_VISIBILITY_KEY);
    // Default to hidden (true) if not explicitly set
    return stored === null ? true : stored === '1';
  } catch {
    return true; // Default to hidden
  }
}

interface DragState {
  widgetId: WidgetId;
  offsetX: number;
  offsetY: number;
}

export function HudOverlayLayer() {
  const { health } = useApparatus();
  const { events } = useTrafficStream(240);
  const { session } = useAutopilot();
  const [mounted, setMounted] = useState(false);
  const [preferences, setPreferences] = useState<HudPreferences | null>(null);
  const [hudHidden, setHudHidden] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const preferencesRef = useRef<HudPreferences | null>(null);

  const recentThoughts = useMemo(() => {
    const thoughts = session?.thoughts ?? [];
    return thoughts.slice(-3).reverse();
  }, [session?.thoughts]);

  const stats = useMemo(() => {
    if (events.length === 0) {
      return { rps: 0, activeThreats: 0 };
    }

    const now = Date.now();
    const recentEvents = events.filter((event) => now - new Date(event.timestamp).getTime() <= TRAFFIC_WINDOW_MS);
    const sample = recentEvents.length > 0 ? recentEvents : events.slice(0, FALLBACK_SAMPLE_SIZE);
    const timestamps = sample.map((event) => new Date(event.timestamp).getTime());
    const newest = Math.max(...timestamps);
    const oldest = Math.min(...timestamps);
    const durationSeconds = Math.max((newest - oldest) / 1000, 1);

    return {
      rps: Math.round(sample.length / durationSeconds),
      activeThreats: sample.filter((event) =>
        event.status >= 500 || [401, 403, 429].includes(event.status)
      ).length,
    };
  }, [events]);

  useEffect(() => {
    setMounted(true);
    setPreferences(loadPreferences());
    setHudHidden(loadHudHidden());
  }, []);

  // Listen for HUD visibility changes (e.g., from Sidebar toggle)
  useEffect(() => {
    const handleHudVisibilityChange = (event: Event) => {
      if (event instanceof CustomEvent) {
        setHudHidden(event.detail.hidden);
      }
    };

    const handleHudWidgetVisibilityChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as { widgetId?: WidgetId; visible?: boolean };
      if (!detail || !detail.widgetId || typeof detail.visible !== 'boolean') return;
      const nextVisible = detail.visible;

      if (detail.widgetId === 'stats') {
        setPreferences((prev) => (prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                visible: nextVisible,
              },
            }
          : prev
        ));
      } else {
        setPreferences((prev) => (prev
          ? {
              ...prev,
              thoughts: {
                ...prev.thoughts,
                visible: nextVisible,
              },
            }
          : prev
        ));
      }

      setHudHidden((currentHidden) => {
        if (nextVisible) return false;
        const currentPreferences = preferencesRef.current;
        if (!currentPreferences) return currentHidden;
        const otherWidgetId: WidgetId = detail.widgetId === 'stats' ? 'thoughts' : 'stats';
        const otherVisible = currentPreferences[otherWidgetId].visible;
        return otherVisible ? false : true;
      });
    };

    window.addEventListener('hud-visibility-changed', handleHudVisibilityChange);
    window.addEventListener('hud-widget-visibility-changed', handleHudWidgetVisibilityChange);
    return () => {
      window.removeEventListener('hud-visibility-changed', handleHudVisibilityChange);
      window.removeEventListener('hud-widget-visibility-changed', handleHudWidgetVisibilityChange);
    };
  }, []);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    if (!preferences) return;
    if (dragStateRef.current) return;
    try {
      localStorage.setItem(HUD_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // localStorage unavailable
    }
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem(HUD_VISIBILITY_KEY, hudHidden ? '1' : '0');
    } catch {
      // localStorage unavailable
    }
  }, [hudHidden]);

  useEffect(() => {
    if (!preferences) return;
    window.dispatchEvent(new CustomEvent('hud-preferences-changed', {
      detail: {
        hidden: hudHidden,
        statsVisible: preferences.stats.visible,
        thoughtsVisible: preferences.thoughts.visible,
      },
    }));
  }, [preferences, hudHidden]);

  useEffect(() => {
    const handleResize = () => {
      setPreferences((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        let changed = false;
        (['stats', 'thoughts'] as const).forEach((widgetId) => {
          const clamped = clampPosition(widgetId, next[widgetId].x, next[widgetId].y);
          if (next[widgetId].x !== clamped.x || next[widgetId].y !== clamped.y) {
            next[widgetId] = { ...next[widgetId], ...clamped };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      const x = event.clientX - drag.offsetX;
      const y = event.clientY - drag.offsetY;
      const clamped = clampPosition(drag.widgetId, x, y);
      setPreferences((prev) => {
        if (!prev) return prev;
        const current = prev[drag.widgetId];
        if (current.x === clamped.x && current.y === clamped.y) {
          return prev;
        }
        return {
          ...prev,
          [drag.widgetId]: {
            ...current,
            ...clamped,
          },
        };
      });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      const latest = preferencesRef.current;
      if (!latest) return;
      try {
        localStorage.setItem(HUD_PREFERENCES_KEY, JSON.stringify(latest));
      } catch {
        // localStorage unavailable
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const startDrag = useCallback((widgetId: WidgetId, event: ReactPointerEvent<HTMLDivElement>) => {
    if (!preferences) return;
    event.preventDefault();
    const current = preferences[widgetId];
    dragStateRef.current = {
      widgetId,
      offsetX: event.clientX - current.x,
      offsetY: event.clientY - current.y,
    };
  }, [preferences]);

  const setWidgetVisible = useCallback((widgetId: WidgetId, visible: boolean) => {
    setPreferences((prev) => (prev
      ? {
          ...prev,
          [widgetId]: { ...prev[widgetId], visible },
        }
      : prev
    ));
  }, []);

  const moveWidgetByDelta = useCallback((widgetId: WidgetId, dx: number, dy: number) => {
    setPreferences((prev) => {
      if (!prev) return prev;
      const current = prev[widgetId];
      const nextPosition = clampPosition(widgetId, current.x + dx, current.y + dy);
      return {
        ...prev,
        [widgetId]: {
          ...current,
          ...nextPosition,
        },
      };
    });
  }, []);

  const handleDragKeyDown = useCallback((widgetId: WidgetId, event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveWidgetByDelta(widgetId, -KEYBOARD_MOVE_STEP, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveWidgetByDelta(widgetId, KEYBOARD_MOVE_STEP, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveWidgetByDelta(widgetId, 0, -KEYBOARD_MOVE_STEP);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveWidgetByDelta(widgetId, 0, KEYBOARD_MOVE_STEP);
    }
  }, [moveWidgetByDelta]);

  if (!mounted || !preferences) return null;

  if (hudHidden) {
    // HUD is hidden - show controls are in the sidebar, nothing to render here
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9000] pointer-events-none select-none" role="complementary" aria-label="HUD overlay">
      {preferences.stats.visible && (
        <div
          className="pointer-events-auto fixed w-[248px] rounded-md bg-neutral-950/65 px-3 py-2.5 backdrop-blur-sm shadow-[0_18px_45px_rgba(0,0,0,0.55)]"
          style={{ left: preferences.stats.x, top: preferences.stats.y }}
        >
          <div
            className="mb-2 flex items-center justify-between cursor-move"
            onPointerDown={(event) => startDrag('stats', event)}
            onKeyDown={(event) => handleDragKeyDown('stats', event)}
            tabIndex={0}
            role="button"
            aria-roledescription="drag handle"
            aria-description="Use arrow keys to reposition"
            aria-label="Drag HUD stats widget"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-primary/80">
              <GripHorizontal className="h-3 w-3" />
              HUD Stats
            </div>
            <button
              type="button"
              onClick={() => setWidgetVisible('stats', false)}
              className="text-neutral-400 hover:text-neutral-100 transition-colors"
              aria-label="Hide HUD stats widget"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <Activity className="h-3.5 w-3.5 text-primary/80" />
                Throughput
              </span>
              <span className="text-primary drop-shadow-[0_0_8px_rgba(0,196,167,0.6)]">{stats.rps} RPS</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <ShieldAlert className="h-3.5 w-3.5 text-danger/80" />
                Active threats
              </span>
              <span className={cn(
                'drop-shadow-[0_0_8px_rgba(255,63,114,0.45)]',
                stats.activeThreats > 0 ? 'text-danger-400' : 'text-neutral-300'
              )}>
                {stats.activeThreats}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">System health</span>
              <span className={cn(
                'uppercase',
                health.status === 'healthy'
                  ? 'text-success-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]'
                  : 'text-danger-400 drop-shadow-[0_0_8px_rgba(255,63,114,0.45)]'
              )}>
                {health.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {preferences.thoughts.visible && (
        <div
          className="pointer-events-auto fixed w-[340px] rounded-md bg-neutral-950/65 px-3 py-2.5 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
          style={{ left: preferences.thoughts.x, top: preferences.thoughts.y }}
        >
          <div
            className="mb-2 flex items-center justify-between cursor-move"
            onPointerDown={(event) => startDrag('thoughts', event)}
            onKeyDown={(event) => handleDragKeyDown('thoughts', event)}
            tabIndex={0}
            role="button"
            aria-roledescription="drag handle"
            aria-description="Use arrow keys to reposition"
            aria-label="Drag AI thought widget"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-primary/80">
              <GripHorizontal className="h-3 w-3" />
              AI Thought Stream
            </div>
            <button
              type="button"
              onClick={() => setWidgetVisible('thoughts', false)}
              className="text-neutral-400 hover:text-neutral-100 transition-colors"
              aria-label="Hide AI thought widget"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {recentThoughts.length === 0 ? (
              <p className="text-[11px] font-mono text-neutral-500">
                Awaiting autopilot thoughts...
              </p>
            ) : (
              recentThoughts.map((entry) => (
                <div key={entry.id} className="rounded-sm bg-black/30 px-2 py-1.5">
                  <div className="mb-0.5 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                    <span className="uppercase">{entry.phase}</span>
                    <span>{new Date(entry.at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-neutral-200 leading-relaxed">
                    <BrainCircuit className="mr-1 inline h-3.5 w-3.5 text-primary/80" />
                    {entry.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
