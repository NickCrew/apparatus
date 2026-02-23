import { useState, useMemo, useRef, useEffect } from 'react';
import { Pause, Play, ChefHat } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { TrafficGenerator } from './TrafficGenerator';
import { useTrafficStream, TrafficEvent } from '../../hooks/useTrafficStream';
import { cn } from '../ui/cn';
import { openInCyberChef } from '../../utils/cyberchef';

export function TrafficConsole() {
  const { events } = useTrafficStream(500); // Larger buffer for full view
  const [isPaused, setIsPaused] = useState(false);
  const [filters, setFilters] = useState<Set<string>>(new Set(['2xx', '3xx', '4xx', '5xx']));
  const [liveFeedAutoScroll, setLiveFeedAutoScroll] = useState(true);
  const liveFeedScrollerRef = useRef<HTMLDivElement | null>(null);

  const toggleFilter = (category: string) => {
      const next = new Set(filters);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      setFilters(next);
  };

  const filteredEvents = useMemo(() => {
      return events.filter(ev => {
          const cat = `${Math.floor(ev.status / 100)}xx`;
          return filters.has(cat);
      });
  }, [events, filters]);

  // Derived Stats
  const stats = useMemo(() => {
      const total = events.length;
      if (total === 0) return { rps: 0, errorRate: 0, avgLatency: 0 };
      
      const errors = events.filter(e => e.status >= 400).length;
      const latencySum = events.reduce((acc, e) => acc + (e.latencyMs || 0), 0);
      
      // Rough RPS estimation based on timestamp spread of buffer
      const newest = new Date(events[0].timestamp).getTime();
      const oldest = new Date(events[events.length - 1].timestamp).getTime();
      const durationSec = Math.max((newest - oldest) / 1000, 1);
      
      return {
          rps: Math.round(total / durationSec),
          errorRate: Math.round((errors / total) * 100),
          avgLatency: Math.round(latencySum / total)
      };
  }, [events]);

  const latestLiveEventId = filteredEvents[0]?.id;

  useEffect(() => {
      if (!liveFeedAutoScroll) return;
      const scroller = liveFeedScrollerRef.current;
      if (!scroller) return;
      // Feed is newest-first, so top is the latest entry.
      scroller.scrollTop = 0;
  }, [liveFeedAutoScroll, latestLiveEventId]);

  const toggleLiveFeedAutoScroll = () => {
      setLiveFeedAutoScroll((current) => {
          const next = !current;
          if (next && liveFeedScrollerRef.current) {
              liveFeedScrollerRef.current.scrollTop = 0;
          }
          return next;
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      {/* Header / Stats Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Traffic Monitor</h1>
          <p className="text-neutral-400 text-sm mt-1 ml-2 type-body">Real-time HTTP telemetry and latency analysis.</p>
        </div>
        
        <div className="flex gap-6 items-center bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
            <div className="text-right">
                <span className="text-[10px] text-neutral-500 uppercase block type-tag">Throughput</span>
                <span className="text-xl text-primary-400 type-metric">{stats.rps} RPS</span>
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div className="text-right">
                <span className="text-[10px] text-neutral-500 uppercase block type-tag">Error Rate</span>
                <span className={cn("text-xl type-metric", stats.errorRate > 5 ? "text-danger-500" : "text-success-500")}>
                    {stats.errorRate}%
                </span>
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div className="text-right">
                <span className="text-[10px] text-neutral-500 uppercase block type-tag">Avg Latency</span>
                <span className="text-xl text-warning-400 type-metric">{stats.avgLatency}ms</span>
            </div>
        </div>
      </div>

      {/* Synthetic Controls */}
      <div className="flex-none h-[320px] lg:h-[340px]">
        <TrafficGenerator />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Main Visualizer */}
        <div className="lg:col-span-8 h-full flex flex-col gap-4 min-h-0">
           <Card variant="panel" glow="info" kinetic={true} className="flex-1 relative overflow-hidden flex flex-col min-h-0">
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                  {(['2xx', '3xx', '4xx', '5xx'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleFilter(cat)}
                        aria-pressed={filters.has(cat)}
                        aria-label={`Filter ${cat} responses`}
                        className={cn(
                            "px-2 py-1 text-[10px] type-tag rounded border transition-all",
                            filters.has(cat) 
                                ? cat === '2xx' ? "bg-success-900/30 border-success-500 text-success-400"
                                : cat === '3xx' ? "bg-info-900/30 border-info-500 text-info-400"
                                : cat === '4xx' ? "bg-warning-900/30 border-warning-500 text-warning-400"
                                : "bg-danger-900/30 border-danger-500 text-danger-400"
                                : "bg-transparent border-neutral-800 text-neutral-600"
                        )}
                      >
                          {cat.toUpperCase()}
                      </button>
                  ))}
                  <div className="w-px h-6 bg-neutral-800 mx-2" />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setIsPaused(!isPaused)}
                    aria-label={isPaused ? 'Resume traffic stream' : 'Pause traffic stream'}
                  >
                      {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  </Button>
              </div>
              
              <TrafficWaterfall events={isPaused ? [] : filteredEvents} paused={isPaused} />
           </Card>
        </div>

        {/* Live List */}
        <Card variant="glass" className="lg:col-span-4 h-full flex flex-col min-h-0">
            <CardHeader className="flex-none border-b border-white/5 pb-3">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xs">Live Feed</CardTitle>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={toggleLiveFeedAutoScroll}
                        aria-pressed={liveFeedAutoScroll}
                        className="h-7 px-2 text-[10px]"
                    >
                        {liveFeedAutoScroll ? (
                            <>
                                <Pause className="h-3 w-3 mr-1" />
                                Stop Auto-Scrolling
                            </>
                        ) : (
                            <>
                                <Play className="h-3 w-3 mr-1" />
                                Resume Auto-Scrolling
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent ref={liveFeedScrollerRef} className="flex-1 overflow-y-auto p-0 min-h-0">
                <div className="text-[11px] type-data">
                    {filteredEvents.slice(0, 50).map((ev) => {
                        const isError = ev.status >= 500;
                        const isWarning = ev.status >= 400 && ev.status < 500;
                        
                        return (
                            <div 
                                key={ev.id} 
                                className={cn(
                                    "p-3 flex justify-between items-center group transition-colors relative border-b border-white/5 last:border-b-0",
                                    isError ? "bg-danger/5 hover:bg-danger/10" :
                                    isWarning ? "bg-warning/5 hover:bg-warning/10" :
                                    "hover:bg-neutral-900/50"
                                )}
                            >
                                <div className="flex flex-col gap-1 overflow-hidden pr-8">
                                    <div className="flex items-center gap-2">
                                        <Badge size="sm" variant={
                                            isError ? 'danger' :
                                            isWarning ? 'warning' :
                                            ev.status >= 300 ? 'info' : 'success'
                                        }>
                                            {ev.method} {ev.status}
                                        </Badge>
                                        <span className="text-neutral-400 font-medium">{ev.latencyMs}ms</span>
                                    </div>
                                    <span className="text-neutral-200 truncate font-medium" title={ev.path}>{ev.path}</span>
                                </div>
                                <button 
                                    onClick={() => openInCyberChef(ev)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded-sm text-primary/60 hover:text-primary outline-none focus:ring-2 focus:ring-primary/50"
                                    title="Analyze request in CyberChef"
                                    aria-label={`Analyze request ${ev.id} in CyberChef`}
                                >
                                    <ChefHat className="h-3 w-3" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

const MAX_LATENCY_MS = 1000;
const TIME_WINDOW_MS = 10_000;
const LABEL_FADE_MS = 2000;

function TrafficWaterfall({ events, paused }: { events: TrafficEvent[], paused: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const eventsRef = useRef(events);

    useEffect(() => { eventsRef.current = events; }, [events]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        
        const resize = () => {
            if (canvas.parentElement) {
                const { clientWidth: w, clientHeight: h } = canvas.parentElement;
                canvas.width = w * dpr;
                canvas.height = h * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
        };
        window.addEventListener('resize', resize);
        resize();

        let frameId: number;
        
        const render = () => {
            if (document.hidden) return;

            if (paused) {
                // One-time clear when paused to avoid ghosting
                // Or just don't request next frame, but ensure current frame is clean or frozen correctly.
                // The review suggested clearing or keeping data.
                // If we want to "freeze", we should stop updating eventsRef but keep rendering? 
                // But the prop `events` becomes [] when paused in the parent.
                // If events is [], we should probably clear the canvas.
            }

            if (!canvas.parentElement) return;
            const width = canvas.parentElement.clientWidth;
            const height = canvas.parentElement.clientHeight;

            // Full clear instead of fade for performance and to fix ghosting
            ctx.clearRect(0, 0, width, height);

            // Draw Grid & Labels
            ctx.strokeStyle = 'rgba(31, 38, 51, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const latencySteps = [200, 400, 600, 800];
            for (const ms of latencySteps) {
                const y = height - Math.min((ms / MAX_LATENCY_MS) * height, height - 20);
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();

            ctx.fillStyle = 'rgba(112, 128, 153, 0.8)';
            ctx.font = '11px JetBrains Mono';
            for (const ms of latencySteps) {
                const y = height - Math.min((ms / MAX_LATENCY_MS) * height, height - 20);
                ctx.fillText(`${ms}ms`, 8, y - 6);
            }

            const now = Date.now();

            // Optimize loop: events are sorted by time (newest first)
            // But newest first means we start with small 'age'.
            // We want to stop when age > TIME_WINDOW_MS.
            for (const ev of eventsRef.current) {
                const eventTime = new Date(ev.timestamp).getTime();
                const age = now - eventTime;
                
                // Since events are newest first, age increases as we iterate.
                // Once age > TIME_WINDOW_MS, all subsequent events are also too old.
                if (age > TIME_WINDOW_MS) break;

                const x = width - ((age / TIME_WINDOW_MS) * width);
                const y = height - Math.min((ev.latencyMs / MAX_LATENCY_MS) * height, height - 20);

                let color = '#00FF94';
                if (ev.status >= 500) color = '#FF0055';
                else if (ev.status >= 400) color = '#FFB800';
                else if (ev.status >= 300) color = '#00A3FF';

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();

                // Draw Label for recent events
                if (age < LABEL_FADE_MS) {
                    const opacity = 1 - (age / LABEL_FADE_MS);
                    ctx.font = '11px JetBrains Mono';
                    
                    // Shadow for readability
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.fillText(`${ev.method} ${ev.path}`, x + 8, y + 4);
                    
                    ctx.shadowBlur = 0;
                }
            }

            if (!paused) {
                frameId = requestAnimationFrame(render);
            }
        };

        // If paused, render once to clear/state update, then stop.
        // If not paused, start loop.
        render();

        return () => {
            window.removeEventListener('resize', resize);
            if (frameId) cancelAnimationFrame(frameId);
        };
    }, [paused]); // Re-run when paused changes

    return <canvas 
        ref={canvasRef} 
        className="w-full h-full block" 
        role="img"
        aria-label={`Traffic waterfall chart showing ${events.length} requests over the last ${TIME_WINDOW_MS/1000} seconds`}
    />;
}
