import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Pause, Play, Search, ShieldAlert, Activity, Globe, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../ui/cn';
import { useApparatus } from '../../providers/ApparatusProvider';
import { useSSE } from '../../hooks/useSSE';
import {
  MODULE_FILTERS,
  SEVERITY_FILTERS,
  normalizeEvent,
  type FeedEventType,
  type TimelineEvent,
  type TimelineSeverity,
  type TimelineModule,
} from './incidentTimelineModel';

const MAX_EVENTS = 1000;
const MAX_RENDERED_EVENTS = 250;

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString();
}

function toSortableMs(timestamp: string, fallbackMs: number): number {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? fallbackMs : parsed;
}

function severityBadgeVariant(severity: TimelineSeverity) {
  if (severity === 'error') return 'danger';
  if (severity === 'warn') return 'warning';
  return 'info';
}

function moduleBadgeVariant(module: TimelineModule) {
  if (module === 'traffic') return 'info';
  if (module === 'deception') return 'danger';
  if (module === 'defense') return 'warning';
  return 'neutral';
}

export function IncidentTimeline() {
  const { baseUrl } = useApparatus();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moduleFilters, setModuleFilters] = useState<Set<TimelineModule>>(
    new Set(MODULE_FILTERS)
  );
  const [severityFilters, setSeverityFilters] = useState<Set<TimelineSeverity>>(
    new Set(SEVERITY_FILTERS)
  );
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState('Timeline ready');
  const pausedRef = useRef(paused);
  const sequenceRef = useRef(0);
  const pendingEventsRef = useRef<TimelineEvent[]>([]);
  const frameRef = useRef<number | null>(null);
  const previousErrorCountRef = useRef(0);
  const sourceIpFilter = sourceFilter.trim().toLowerCase();
  const queryFilter = searchText.trim().toLowerCase();

  const { subscribe, status } = useSSE(`${baseUrl}/sse`, {
    enabled: Boolean(baseUrl),
    maxRetries: 10,
  });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const flushPendingEvents = useCallback(() => {
    frameRef.current = null;
    if (pendingEventsRef.current.length === 0) return;

    const pending = pendingEventsRef.current;
    pendingEventsRef.current = [];
    const fallbackMs = Date.now();
    const normalizedInOrder = [...pending].sort((left, right) => {
      const leftMs = toSortableMs(left.timestamp, fallbackMs);
      const rightMs = toSortableMs(right.timestamp, fallbackMs);
      return rightMs - leftMs;
    });

    setEvents((previous) => [...normalizedInOrder, ...previous].slice(0, MAX_EVENTS));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(flushPendingEvents);
  }, [flushPendingEvents]);

  const appendEvent = useCallback((type: FeedEventType, raw: Record<string, unknown>) => {
    sequenceRef.current += 1;
    const normalized = normalizeEvent(type, raw, sequenceRef.current);
    pendingEventsRef.current.push(normalized);
    if (pendingEventsRef.current.length > MAX_EVENTS) {
      const fallbackMs = Date.now();
      pendingEventsRef.current = [...pendingEventsRef.current]
        .sort((left, right) => toSortableMs(right.timestamp, fallbackMs) - toSortableMs(left.timestamp, fallbackMs))
        .slice(0, MAX_EVENTS);
    }
    if (pausedRef.current) return;
    scheduleFlush();
  }, [scheduleFlush]);

  useEffect(() => {
    if (!paused) {
      scheduleFlush();
    }
  }, [paused, scheduleFlush]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      pendingEventsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (status !== 'connected') return;

    const unsubscribers = [
      subscribe<Record<string, unknown>>('request', (event) => appendEvent('request', event)),
      subscribe<Record<string, unknown>>('deception', (event) => appendEvent('deception', event)),
      subscribe<Record<string, unknown>>('tarpit', (event) => appendEvent('tarpit', event)),
      subscribe<Record<string, unknown>>('health', (event) => appendEvent('health', event)),
      subscribe<Record<string, unknown>>('webhook', (event) => appendEvent('webhook', event)),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [status, subscribe, appendEvent]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!moduleFilters.has(event.module)) return false;
      if (!severityFilters.has(event.severity)) return false;
      if (sourceIpFilter && !(event.sourceIp ?? '').toLowerCase().includes(sourceIpFilter)) return false;
      if (
        queryFilter &&
        !`${event.title} ${event.summary} ${event.type}`.toLowerCase().includes(queryFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [events, moduleFilters, severityFilters, sourceIpFilter, queryFilter]);

  const visibleEvents = useMemo(
    () => filteredEvents.slice(0, MAX_RENDERED_EVENTS),
    [filteredEvents]
  );
  const selectedEvent = useMemo(() => {
    if (visibleEvents.length === 0) return null;
    if (!selectedId) return visibleEvents[0];
    return visibleEvents.find((event) => event.id === selectedId) ?? visibleEvents[0];
  }, [visibleEvents, selectedId]);
  const selectedVisibleIndex = useMemo(
    () => (selectedEvent ? visibleEvents.findIndex((event) => event.id === selectedEvent.id) : -1),
    [visibleEvents, selectedEvent]
  );

  const counts = useMemo(() => {
    let traffic = 0;
    let defensive = 0;
    let errors = 0;

    for (const event of events) {
      if (event.module === 'traffic') traffic += 1;
      if (event.module === 'defense' || event.module === 'deception') defensive += 1;
      if (event.severity === 'error') errors += 1;
    }

    return {
      traffic,
      defensive,
      errors,
    };
  }, [events]);

  useEffect(() => {
    if (counts.errors > previousErrorCountRef.current) {
      const delta = counts.errors - previousErrorCountRef.current;
      setAnnouncement(
        delta === 1 ? '1 new error event recorded' : `${delta} new error events recorded`
      );
    } else if (events.length === 0) {
      setAnnouncement('Timeline cleared');
    }

    previousErrorCountRef.current = counts.errors;
  }, [counts.errors, events.length]);

  const toggleModule = (module: TimelineModule) => {
    setModuleFilters((previous) => {
      const next = new Set(previous);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const toggleSeverity = (severity: TimelineSeverity) => {
    setSeverityFilters((previous) => {
      const next = new Set(previous);
      if (next.has(severity)) next.delete(severity);
      else next.add(severity);
      return next;
    });
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (visibleEvents.length === 0) return;

    let nextIndex = selectedVisibleIndex >= 0 ? selectedVisibleIndex : 0;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = Math.min(nextIndex + 1, visibleEvents.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = Math.max(nextIndex - 1, 0);
    } else if (event.key === 'Home') {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      nextIndex = visibleEvents.length - 1;
    } else {
      return;
    }

    const nextId = visibleEvents[nextIndex].id;
    setSelectedId(nextId);
    requestAnimationFrame(() => {
      document.getElementById(`incident-event-${nextId}`)?.scrollIntoView({ block: 'nearest' });
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl text-neutral-100 ml-2 type-heading">
            Incident Timeline
          </h1>
          <p className="text-sm text-neutral-400 mt-1 ml-2">
            Unified flight recorder for traffic, defense, deception, webhook, and health events.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant={status === 'connected' ? 'success' : 'warning'} dot>
            {status === 'connected' ? 'Live Connected' : 'Reconnecting'}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPaused((value) => !value)}
            className="h-8 px-3 text-[11px] uppercase tracking-wider"
          >
            {paused ? <Play className="mr-1.5 h-3.5 w-3.5" /> : <Pause className="mr-1.5 h-3.5 w-3.5" />}
            {paused ? 'Resume Feed' : 'Pause Feed'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEvents([])}
            className="h-8 px-3 text-[11px] uppercase tracking-wider"
          >
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        <Card variant="panel" glow="info" className="lg:col-span-8 min-h-0 flex flex-col">
          <CardHeader className="pb-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="relative">
                <label htmlFor="timeline-search" className="sr-only">
                  Search timeline events
                </label>
                <Search className="h-3.5 w-3.5 text-neutral-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="timeline-search"
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search event text..."
                  className="h-8 w-full rounded-sm border border-neutral-700 bg-neutral-900/70 pl-8 pr-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-primary/60"
                />
              </div>
              <label htmlFor="timeline-ip-filter" className="sr-only">
                Filter timeline by source IP
              </label>
              <input
                id="timeline-ip-filter"
                type="text"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                placeholder="Filter by source IP..."
                className="h-8 w-full rounded-sm border border-neutral-700 bg-neutral-900/70 px-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-primary/60"
              />
              <div className="text-xs text-neutral-400 flex items-center justify-start xl:justify-end gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-info-400" />
                  {counts.traffic} traffic
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-warning-400" />
                  {counts.defensive} defensive
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-danger-400" />
                  {counts.errors} errors
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-neutral-800/50 flex flex-col gap-2">
              <div role="group" aria-label="Filter by module" className="flex flex-wrap gap-1.5">
                {MODULE_FILTERS.map((module) => (
                  <button
                    key={module}
                    type="button"
                    onClick={() => toggleModule(module)}
                    aria-pressed={moduleFilters.has(module)}
                    className={cn(
                      'px-2 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors',
                      moduleFilters.has(module)
                        ? 'border-primary/40 bg-primary/12 text-primary-300'
                        : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 hover:text-neutral-300'
                    )}
                  >
                    {module}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Filter by severity" className="flex flex-wrap gap-1.5">
                {SEVERITY_FILTERS.map((severity) => (
                  <button
                    key={severity}
                    type="button"
                    onClick={() => toggleSeverity(severity)}
                    aria-pressed={severityFilters.has(severity)}
                    className={cn(
                      'px-2 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors',
                      severityFilters.has(severity)
                        ? severity === 'error'
                          ? 'border-danger-500/40 bg-danger-500/15 text-danger-300'
                          : severity === 'warn'
                            ? 'border-warning-500/40 bg-warning-500/15 text-warning-300'
                            : 'border-info-500/40 bg-info-500/15 text-info-300'
                        : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 hover:text-neutral-300'
                    )}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 mt-0 flex-1 min-h-0 overflow-hidden">
            <div
              role="listbox"
              aria-label="Incident events"
              aria-controls="event-inspector"
              aria-activedescendant={selectedEvent ? `incident-event-${selectedEvent.id}` : undefined}
              tabIndex={0}
              onKeyDown={handleListboxKeyDown}
              className="h-full overflow-y-auto border border-neutral-800/70 rounded-sm bg-neutral-950/70 divide-y divide-neutral-800/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
            >
              {filteredEvents.length === 0 && (
                <div className="h-full min-h-52 flex items-center justify-center text-sm text-neutral-500">
                  No events match current filters.
                </div>
              )}
              {visibleEvents.map((event) => {
                const isActive = event.id === selectedEvent?.id;
                return (
                  <button
                    key={event.id}
                    id={`incident-event-${event.id}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => setSelectedId(event.id)}
                    className={cn(
                      'w-full px-3 py-2 text-left transition-colors',
                      isActive
                        ? 'bg-primary/10'
                        : 'hover:bg-neutral-900/70'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono text-neutral-400">
                            {formatTime(event.timestamp)}
                          </span>
                          <Badge size="sm" variant={moduleBadgeVariant(event.module)}>
                            {event.module}
                          </Badge>
                          <Badge size="sm" variant={severityBadgeVariant(event.severity)}>
                            {event.severity}
                          </Badge>
                        </div>
                        <div className="text-sm text-neutral-100 mt-1 truncate">{event.title}</div>
                        <div className="text-xs text-neutral-400 mt-1 truncate">{event.summary}</div>
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-600">
                        {event.type}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredEvents.length > visibleEvents.length && (
                <div className="px-3 py-2 text-[11px] text-neutral-500 border-t border-neutral-800/60">
                  Showing newest {visibleEvents.length} of {filteredEvents.length} filtered events.
                </div>
              )}
            </div>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {announcement}
            </div>
          </CardContent>
        </Card>

        <Card variant="panel" className="lg:col-span-4 min-h-0 flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm">Event Inspector</CardTitle>
          </CardHeader>
          <CardContent id="event-inspector" className="pt-0 mt-0 flex-1 min-h-0 overflow-hidden">
            {!selectedEvent && (
              <div className="h-full min-h-52 flex items-center justify-center text-sm text-neutral-500">
                Select an event to inspect metadata.
              </div>
            )}
            {selectedEvent && (
              <div className="h-full overflow-y-auto space-y-3">
                <div className="space-y-1">
                  <div className="text-xs text-neutral-500 uppercase tracking-widest">Title</div>
                  <div className="text-sm text-neutral-100">{selectedEvent.title}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-sm border border-neutral-800 bg-neutral-900/60 p-2">
                    <div className="text-neutral-500 uppercase tracking-wider">Module</div>
                    <div className="text-neutral-100 mt-1">{selectedEvent.module}</div>
                  </div>
                  <div className="rounded-sm border border-neutral-800 bg-neutral-900/60 p-2">
                    <div className="text-neutral-500 uppercase tracking-wider">Severity</div>
                    <div className="text-neutral-100 mt-1">{selectedEvent.severity}</div>
                  </div>
                  <div className="rounded-sm border border-neutral-800 bg-neutral-900/60 p-2">
                    <div className="text-neutral-500 uppercase tracking-wider">Timestamp</div>
                    <div className="text-neutral-100 mt-1">{selectedEvent.timestamp}</div>
                  </div>
                  <div className="rounded-sm border border-neutral-800 bg-neutral-900/60 p-2">
                    <div className="text-neutral-500 uppercase tracking-wider">Source IP</div>
                    <div className="text-neutral-100 mt-1">{selectedEvent.sourceIp ?? 'n/a'}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-neutral-500 uppercase tracking-widest">
                    Raw Metadata
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-sm border border-neutral-800 bg-neutral-950 p-3 text-[11px] leading-relaxed text-neutral-300 font-mono">
                    {JSON.stringify(selectedEvent.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

IncidentTimeline.displayName = 'IncidentTimeline';
