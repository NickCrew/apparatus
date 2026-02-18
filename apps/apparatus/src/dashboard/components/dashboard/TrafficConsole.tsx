import { useState, useMemo, useRef, useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTrafficStream, TrafficEvent } from '../../hooks/useTrafficStream';
import { cn } from '../ui/cn';

export function TrafficConsole() {
  const { events } = useTrafficStream(500); // Larger buffer for full view
  const [isPaused, setIsPaused] = useState(false);
  const [filters, setFilters] = useState<Set<string>>(new Set(['2xx', '3xx', '4xx', '5xx']));

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
      const durationSec = (newest - oldest) / 1000 || 1;
      
      return {
          rps: Math.round(total / durationSec),
          errorRate: Math.round((errors / total) * 100),
          avgLatency: Math.round(latencySum / total)
      };
  }, [events]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      {/* Header / Stats Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 font-mono uppercase">Traffic Monitor</h1>
          <p className="text-neutral-400 text-sm mt-1">Real-time HTTP telemetry and latency analysis.</p>
        </div>
        
        <div className="flex gap-6 items-center bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
            <div className="text-right">
                <span className="text-[10px] text-neutral-500 uppercase block">Throughput</span>
                <span className="text-xl font-mono text-primary-400 font-bold">{stats.rps} RPS</span>
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div className="text-right">
                <span className="text-[10px] text-neutral-500 uppercase block">Error Rate</span>
                <span className={cn("text-xl font-mono font-bold", stats.errorRate > 5 ? "text-danger-500" : "text-success-500")}>
                    {stats.errorRate}%
                </span>
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div className="text-right">
                <span className="text-[10px] text-neutral-500 uppercase block">Avg Latency</span>
                <span className="text-xl font-mono text-warning-400 font-bold">{stats.avgLatency}ms</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Main Visualizer */}
        <div className="lg:col-span-3 h-full flex flex-col gap-4">
           <Card variant="panel" className="flex-1 relative overflow-hidden flex flex-col">
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                  {(['2xx', '3xx', '4xx', '5xx'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleFilter(cat)}
                        className={cn(
                            "px-2 py-1 text-[10px] font-mono rounded border transition-all",
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
                  <Button size="sm" variant="ghost" onClick={() => setIsPaused(!isPaused)}>
                      {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  </Button>
              </div>
              
              <TrafficWaterfall events={isPaused ? [] : filteredEvents} paused={isPaused} />
           </Card>
        </div>

        {/* Live List */}
        <Card variant="glass" className="h-full flex flex-col">
            <CardHeader className="flex-none border-b border-white/5 pb-3">
                <CardTitle className="text-xs">Live Feed</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="divide-y divide-white/5 font-mono text-[10px]">
                    {filteredEvents.slice(0, 50).map((ev, i) => (
                        <div key={i} className="p-3 hover:bg-white/5 flex justify-between items-center group">
                            <div className="flex flex-col gap-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <Badge size="sm" variant={
                                        ev.status >= 500 ? 'danger' :
                                        ev.status >= 400 ? 'warning' :
                                        ev.status >= 300 ? 'info' : 'success'
                                    }>
                                        {ev.method} {ev.status}
                                    </Badge>
                                    <span className="text-neutral-500">{ev.latencyMs}ms</span>
                                </div>
                                <span className="text-neutral-300 truncate" title={ev.path}>{ev.path}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Inline canvas component for now (similar to ClusterMap but specialized for Waterfall)
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
            if (document.hidden || paused) {
                if (!paused) frameId = requestAnimationFrame(render);
                return;
            }

            if (!canvas.parentElement) return;
            const width = canvas.parentElement.clientWidth;
            const height = canvas.parentElement.clientHeight;

            // Fade effect
            ctx.fillStyle = 'rgba(10, 12, 17, 0.2)';
            ctx.fillRect(0, 0, width, height);

            const now = Date.now();
            const timeWindow = 10000; // 10s view

            eventsRef.current.forEach(ev => {
                const eventTime = new Date(ev.timestamp).getTime();
                const age = now - eventTime;
                if (age > timeWindow) return;

                const x = width - ((age / timeWindow) * width);
                const y = height - Math.min((ev.latencyMs / 1000) * height, height - 20);

                let color = '#00FF94';
                if (ev.status >= 500) color = '#FF0055';
                else if (ev.status >= 400) color = '#FFB800';
                else if (ev.status >= 300) color = '#00A3FF';

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            });

            frameId = requestAnimationFrame(render);
        };

        render();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(frameId);
        };
    }, [paused]);

    return <canvas ref={canvasRef} className="w-full h-full block" />;
}
