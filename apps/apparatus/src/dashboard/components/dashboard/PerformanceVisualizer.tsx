import { useEffect, useRef, useState, useCallback } from 'react';
import { useTrafficStream } from '../../hooks/useTrafficStream';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Activity, Zap, AlertTriangle, Clock, FlaskConical } from 'lucide-react';
import { useApparatus } from '../../providers/ApparatusProvider';

interface MetricHistory {
  rps: number[];
  latency: number[];
  errors: number[];
}

const MAX_HISTORY = 60; // 60 seconds

export function PerformanceVisualizer() {
  const { events, isConnected } = useTrafficStream(200);
  const { baseUrl } = useApparatus();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [history, setHistory] = useState<MetricHistory>({
    rps: new Array(MAX_HISTORY).fill(0),
    latency: new Array(MAX_HISTORY).fill(0),
    errors: new Array(MAX_HISTORY).fill(0),
  });

  // Fetch initial demo status
  useEffect(() => {
    fetch(`${baseUrl}/_sensor/demo`)
      .then(res => res.json())
      .then(data => setIsDemoMode(data.enabled))
      .catch(() => {});
  }, [baseUrl]);

  const toggleDemoMode = useCallback(async () => {
    setIsToggling(true);
    try {
      const res = await fetch(`${baseUrl}/_sensor/demo/toggle`, { method: 'POST' });
      const data = await res.json();
      setIsDemoMode(data.enabled);
    } catch (err) {
      console.error('Failed to toggle demo mode:', err);
    } finally {
      setIsToggling(false);
    }
  }, [baseUrl]);

  // Update history every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const oneSecondAgo = now - 1000;
      
      const lastSecondEvents = events.filter(e => {
        const ts = new Date(e.timestamp).getTime();
        return ts >= oneSecondAgo && ts < now;
      });

      const rps = lastSecondEvents.length;
      const avgLatency = rps > 0 
        ? lastSecondEvents.reduce((acc, e) => acc + e.latencyMs, 0) / rps 
        : 0;
      const errorCount = lastSecondEvents.filter(e => e.status >= 500).length;
      const errorRate = rps > 0 ? (errorCount / rps) * 100 : 0;

      setHistory(prev => ({
        rps: [...prev.rps.slice(1), rps],
        latency: [...prev.latency.slice(1), avgLatency],
        errors: [...prev.errors.slice(1), errorRate],
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [events]);

  return (
    <Card variant="panel" className="flex flex-col">
      <CardHeader className="flex-none border-b border-neutral-800/30 pb-2 mb-0 bg-neutral-900/30">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-3.5 w-3.5 text-primary-500/70" />
            System Performance Metrics
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-7 px-2 text-[10px] font-mono border border-dashed transition-colors ${
                isDemoMode 
                  ? 'border-warning-500/50 text-warning-500 bg-warning-500/5' 
                  : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
              onClick={toggleDemoMode}
              disabled={isToggling}
            >
              <FlaskConical className={`h-3 w-3 mr-1.5 ${isDemoMode ? 'animate-pulse' : ''}`} />
              {isDemoMode ? 'STOP SYNTHETIC' : 'GENERATE SYNTHETIC'}
            </Button>
            <Badge variant={isConnected ? 'success' : 'neutral'} size="sm" dot>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricChart 
          title="Throughput (RPS)" 
          data={history.rps} 
          color="#0BAEB5" 
          icon={Zap}
          unit="req/s"
        />
        <MetricChart 
          title="Avg Latency" 
          data={history.latency} 
          color="#00FF94" 
          icon={Clock}
          unit="ms"
          max={500}
        />
        <MetricChart 
          title="Error Rate" 
          data={history.errors} 
          color="#FF0055" 
          icon={AlertTriangle}
          unit="%"
          max={100}
        />
      </CardContent>
    </Card>
  );
}

interface MetricChartProps {
  title: string;
  data: number[];
  color: string;
  icon: React.ElementType;
  unit: string;
  max?: number;
}

function MetricChart({ title, data, color, icon: Icon, unit, max: forcedMax }: MetricChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const currentVal = data[data.length - 1];
  const maxVal = forcedMax || Math.max(...data, 10);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      
      const step = width / (data.length - 1);
      data.forEach((val, i) => {
        const x = i * step;
        const y = height - (val / maxVal) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Area fill
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `${color}33`); // 20% opacity
      gradient.addColorStop(1, `${color}00`); // 0% opacity
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        render();
      }
    };

    window.addEventListener('resize', resize);
    resize();
    render();

    return () => window.removeEventListener('resize', resize);
  }, [data, color, maxVal]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <Icon className="h-3 w-3 text-neutral-500" />
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">{title}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-display text-neutral-100" style={{ color }}>
            {typeof currentVal === 'number' ? currentVal.toFixed(title.includes('Rate') ? 1 : 0) : '0'}
          </span>
          <span className="text-[9px] font-mono text-neutral-600 uppercase">{unit}</span>
        </div>
      </div>
      <div className="h-24 w-full bg-black/20 rounded-sm border border-white/[0.03] overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
}
