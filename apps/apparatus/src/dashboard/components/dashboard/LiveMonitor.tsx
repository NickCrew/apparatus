import { useEffect, useRef, useState } from 'react';
import { Wifi, Search, Play, StopCircle, Trash2, ChefHat } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useApparatus } from '../../providers/ApparatusProvider';
import { cn } from '../ui/cn';
import { generateCyberChefUrl } from '../../utils/cyberchef';

interface PacketEvent {
  timestamp: string;
  raw: string;
}

export function LiveMonitor() {
  const { baseUrl } = useApparatus();
  const [packets, setPackets] = useState<PacketEvent[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [filter, setFilter] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  const startMonitor = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    
    const url = new URL(`${baseUrl}/api/forensics/live`);
    if (filter) url.searchParams.append('filter', filter);
    
    const es = new EventSource(url.toString());
    eventSourceRef.current = es;
    setIsLive(true);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPackets(prev => [data, ...prev].slice(0, 100));
    };

    es.onerror = () => {
      stopMonitor();
    };
  };

  const stopMonitor = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsLive(false);
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  return (
    <Card variant="panel" glow="primary" className="h-full flex flex-col">
      <CardHeader className="flex-none border-b border-white/5 bg-white/[0.02] py-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-[11px] font-mono tracking-widest">
            <Wifi className={cn("h-3.5 w-3.5", isLive ? "text-primary animate-pulse" : "text-neutral-500")} />
            Live Packet Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLive ? (
              <Button variant="danger" size="sm" className="h-7 text-[9px]" onClick={stopMonitor}>
                <StopCircle className="h-3 w-3 mr-1.5" />
                STOP_CAPTURE
              </Button>
            ) : (
              <Button variant="primary" size="sm" className="h-7 text-[9px]" onClick={startMonitor}>
                <Play className="h-3 w-3 mr-1.5" />
                INITIALIZE
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-600 hover:text-danger-400" onClick={() => setPackets([])}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="p-3 border-b border-white/5 bg-black/40">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-600" />
          <input 
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Berkeley Packet Filter (e.g. tcp port 80)..."
            className="w-full bg-neutral-900/50 border border-white/10 rounded-sm pl-7 pr-3 py-1.5 text-[10px] font-mono text-primary-400 placeholder:text-neutral-700 focus:outline-none focus:border-primary-500/30"
          />
        </div>
      </div>

      <CardContent className="flex-1 overflow-y-auto p-0 font-mono text-[10px]">
        {packets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-600 italic py-12">
            {isLive ? "[SCANNING_INFRASTRUCTURE...]" : "[AWAITING_INITIALIZATION]"}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {packets.map((p, i) => (
              <div key={i} className="p-2 hover:bg-white/[0.02] transition-colors group relative">
                <div className="flex gap-3 items-start pr-10">
                  <span className="text-neutral-700 font-bold shrink-0">{p.timestamp.split('T')[1].split('.')[0]}</span>
                  <span className="text-neutral-300 break-all leading-relaxed">{p.raw}</span>
                </div>
                <button 
                  onClick={() => window.open(generateCyberChefUrl(p.raw), '_blank', 'noopener')}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded-sm text-primary/60 hover:text-primary"
                  title="Analyze packet in CyberChef"
                >
                  <ChefHat className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <div className="p-2 border-t border-white/5 bg-black/60 flex justify-between items-center px-4">
        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
          {isLive ? "Stream Active" : "Stream Suspended"}
        </div>
        <div className="text-[9px] font-mono text-neutral-500">
          Buffer: {packets.length}/100
        </div>
      </div>
    </Card>
  );
}
