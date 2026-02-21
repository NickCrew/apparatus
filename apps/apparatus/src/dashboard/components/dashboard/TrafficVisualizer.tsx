import { useEffect, useRef } from 'react';
import { useTrafficStream, TrafficEvent } from '../../hooks/useTrafficStream';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Activity } from 'lucide-react';

export function TrafficVisualizer() {
  const { events, isConnected } = useTrafficStream(100);

  return (
    <Card variant="panel" className="h-80 flex flex-col">
      <CardHeader className="flex-none border-b border-neutral-800/30 pb-2 mb-0 bg-neutral-900/30">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-3.5 w-3.5 text-primary-500/70" />
            Live Traffic Feed
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant={isConnected ? 'success' : 'neutral'} size="sm" dot>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </Badge>
            <span className="text-[10px] font-mono text-neutral-700">
              {events.length} events
            </span>
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 relative overflow-hidden bg-neutral-950">
        <CanvasWaterfall events={events} />
      </div>
    </Card>
  );
}

function CanvasWaterfall({ events }: { events: TrafficEvent[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;

    const render = () => {
      if (document.hidden) {
        animationFrame = requestAnimationFrame(render);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Vertical grid
      ctx.strokeStyle = 'rgba(31, 38, 51, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < width; i += 48) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
      }
      ctx.stroke();

      // Horizontal grid + latency labels
      ctx.beginPath();
      const latencySteps = [100, 200, 300, 400];
      for (const ms of latencySteps) {
        const y = height - Math.min((ms / 500) * height, height - 10);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Latency axis labels
      ctx.fillStyle = 'rgba(112, 128, 153, 0.8)';
      ctx.font = '11px JetBrains Mono';
      for (const ms of latencySteps) {
        const y = height - Math.min((ms / 500) * height, height - 10);
        ctx.fillText(`${ms}ms`, 6, y - 4);
      }

      const now = Date.now();
      const timeWindow = 10000;

      eventsRef.current.forEach(ev => {
        const eventTime = new Date(ev.timestamp).getTime();
        const age = now - eventTime;

        if (age > timeWindow) return;

        const x = width - ((age / timeWindow) * width);
        const y = height - Math.min((ev.latencyMs / 500) * height, height - 10);

        // Color by status code
        let color = '#00FF94';
        if (ev.status >= 500) color = '#FF0055';
        else if (ev.status >= 400) color = '#FFB800';
        else if (ev.status >= 300) color = '#00A3FF';

        // Fade based on age
        const alpha = Math.max(0.2, 1 - (age / timeWindow) * 0.7);

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = alpha;

        // Draw packet dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Fresh event label
        if (age < 2500) {
          const labelAlpha = Math.max(0, 1 - age / 2500);
          ctx.font = '11px JetBrains Mono';
          
          // Shadow for contrast
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 4;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${labelAlpha * 0.9})`;
          ctx.fillText(`${ev.method} ${ev.path}`, x + 8, y + 4);
          
          ctx.shadowBlur = 0;
        }
      });

      animationFrame = requestAnimationFrame(render);
    };

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      role="img"
      aria-label={`Live traffic visualization showing ${events.length} recent events`}
    />
  );
}
