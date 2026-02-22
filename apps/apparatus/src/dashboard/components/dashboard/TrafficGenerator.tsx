import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Slider } from '../ui/slider';
import { Zap, AlertTriangle, Clock, FlaskConical, Play, Square, Settings2, Target, Waves } from 'lucide-react';
import { useApparatus } from '../../providers/ApparatusProvider';
import { cn } from '../ui/cn';

interface DemoConfig {
  enabled: boolean;
  intensity: number;
  errorRate: number;
  latencyBase: number;
  attackFrequency: number;
  pattern: 'steady' | 'sine' | 'spiky';
  targetPath: string | null;
}

const PRESETS = [
    { name: 'Steady', intensity: 10, errorRate: 1, latencyBase: 50, attackFrequency: 2, pattern: 'steady' as const, targetPath: null },
    { name: 'Heavy Load', intensity: 80, errorRate: 2, latencyBase: 120, attackFrequency: 5, pattern: 'steady' as const, targetPath: null },
    { name: 'Degraded', intensity: 20, errorRate: 35, latencyBase: 450, attackFrequency: 10, pattern: 'sine' as const, targetPath: null },
    { name: 'DDoS Attack', intensity: 100, errorRate: 5, latencyBase: 800, attackFrequency: 80, pattern: 'spiky' as const, targetPath: '/api/v1/auth' },
];

export function TrafficGenerator() {
  const { baseUrl } = useApparatus();
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${baseUrl}/_sensor/demo`);
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Failed to fetch demo config:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [baseUrl]);

  const updateConfig = async (updates: Partial<DemoConfig>) => {
    if (!config) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${baseUrl}/_sensor/demo/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Failed to update demo config:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleDemo = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${baseUrl}/_sensor/demo/toggle`, { method: 'POST' });
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Failed to toggle demo mode:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!config) return null;

  return (
    <Card variant="panel" className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex-none border-b border-neutral-800/30 pb-3 mb-0 bg-neutral-900/30">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest font-mono">
            <FlaskConical className={cn("h-4 w-4", config.enabled ? "text-warning-500 animate-pulse" : "text-neutral-500")} />
            Synthetic Traffic Engine
          </CardTitle>
          <Button 
            variant={config.enabled ? 'danger' : 'primary'} 
            size="sm" 
            className="h-7 px-4 font-mono text-[10px]"
            onClick={toggleDemo}
            disabled={isUpdating}
          >
            {config.enabled ? <Square className="h-3 w-3 mr-2" /> : <Play className="h-3 w-3 mr-2" />}
            {config.enabled ? 'TERMINATE' : 'INITIALIZE'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Presets */}
        <div className="space-y-3">
          <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-2">
            <Settings2 className="h-3 w-3" />
            Generation Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(p => (
              <Button
                key={p.name}
                type="button"
                onClick={() => updateConfig(p)}
                variant={config.intensity === p.intensity && config.pattern === p.pattern ? 'outline' : 'secondary'}
                size="sm"
                className={cn(
                  "h-auto justify-start px-3 py-2 text-left text-[11px] font-mono",
                  config.intensity === p.intensity && config.pattern === p.pattern
                    ? "text-primary-400"
                    : "text-neutral-400"
                )}
              >
                {p.name.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Pattern Selection */}
        <div className="space-y-3">
          <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-2">
            <Waves className="h-3 w-3" />
            Traffic Pattern
          </label>
          <Select value={config.pattern} onValueChange={(value) => updateConfig({ pattern: value as DemoConfig['pattern'] })}>
            <SelectTrigger className="h-9 border-neutral-700 bg-neutral-900/60 text-[11px] uppercase text-neutral-200">
              <SelectValue placeholder="Select pattern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="steady">STEADY</SelectItem>
              <SelectItem value="sine">SINE</SelectItem>
              <SelectItem value="spiky">SPIKY</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Targeting */}
        <div className="space-y-3">
          <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-2">
            <Target className="h-3 w-3" />
            Target Endpoint
          </label>
          <div className="relative">
            <Input
              type="text"
              value={config.targetPath || ''}
              placeholder="Random endpoints (default)"
              onChange={(event) => setConfig({ ...config, targetPath: event.target.value || null })}
              onBlur={() => updateConfig({ targetPath: config.targetPath })}
              className="h-9 border-neutral-700 bg-neutral-900/60 text-[11px] text-primary-400 placeholder:text-neutral-600"
            />
            {config.targetPath && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => updateConfig({ targetPath: null })}
                className="absolute right-1 top-1/2 h-6 -translate-y-1/2 px-2 text-[9px] text-neutral-600 hover:text-danger-400"
              >
                CLEAR
              </Button>
            )}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary-500" />
                Throughput Intensity
              </span>
              <span className="text-primary-400">{config.intensity}%</span>
            </div>
            <Slider 
                value={[config.intensity]} 
                min={1} 
                max={100} 
                step={1} 
                onValueChange={([val]) => setConfig({ ...config, intensity: val })}
                onValueCommit={([val]) => updateConfig({ intensity: val })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-danger-500" />
                Error Probability
              </span>
              <span className="text-danger-400">{config.errorRate}%</span>
            </div>
            <Slider 
                value={[config.errorRate]} 
                min={0} 
                max={100} 
                step={1} 
                onValueChange={([val]) => setConfig({ ...config, errorRate: val })}
                onValueCommit={([val]) => updateConfig({ errorRate: val })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-3 w-3 text-warning-500" />
                Latency Base
              </span>
              <span className="text-warning-400">{config.latencyBase}ms</span>
            </div>
            <Slider 
                value={[config.latencyBase]} 
                min={10} 
                max={2000} 
                step={10} 
                onValueChange={([val]) => setConfig({ ...config, latencyBase: val })}
                onValueCommit={([val]) => updateConfig({ latencyBase: val })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-3 w-3 text-info-500" />
                Attack Frequency
              </span>
              <span className="text-info-400">{config.attackFrequency}%</span>
            </div>
            <Slider 
                value={[config.attackFrequency]} 
                min={0} 
                max={100} 
                step={1} 
                onValueChange={([val]) => setConfig({ ...config, attackFrequency: val })}
                onValueCommit={([val]) => updateConfig({ attackFrequency: val })}
            />
          </div>
        </div>
      </CardContent>
      
      <div className="p-4 border-t border-neutral-800 bg-black/20">
        <div className="text-[10px] font-mono text-neutral-600 uppercase leading-relaxed">
            Traffic Generator affects all SSE streams and dashboard telemetry.
            Mode: <span className="text-primary-400">{config.pattern}</span>
            {config.targetPath && <span className="ml-2">Target: <span className="text-warning-400">{config.targetPath}</span></span>}
        </div>
      </div>
    </Card>
  );
}
