import { Terminal, Ghost, ShieldAlert, Trash2, Eye, ExternalLink, Unlock, ChefHat } from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useDeception, DeceptionEvent } from '../../hooks/useDeception';
import { cn } from '../ui/cn';
import { openInCyberChef } from '../../utils/cyberchef';

export function DeceptionConsole() {
  const { events, trappedIps, releaseIp, clearHistory, isConnected } = useDeception();
  const [selectedEvent, setSelectedEvent] = useState<DeceptionEvent | null>(null);

  const handleClearLogs = () => {
      if (confirm('Are you sure you want to clear all deception logs? This action cannot be undone.')) {
          clearHistory();
      }
  };

  const getEventKey = (ev: DeceptionEvent, idx: number) => `${ev.timestamp}-${ev.ip}-${idx}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Deception Engine</h1>
          <p className="text-neutral-400 text-sm mt-1 ml-2">Live honeypot activity and intruder analysis.</p>
        </div>
        <div className="flex gap-2">
           <Badge variant={isConnected ? 'success' : 'neutral'} dot>
              {isConnected ? 'FORENSICS_LIVE' : 'OFFLINE'}
           </Badge>
           <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-danger-400" onClick={handleClearLogs}>
              <Trash2 className="h-3 w-3 mr-2" />
              Clear Logs
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Deception Feed */}
        <div className="lg:col-span-2 space-y-4">
           <Card variant="panel" glow="warning" className="flex flex-col h-[600px]">
              <CardHeader className="flex-none border-b border-neutral-800 pb-4">
                 <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Ghost className="h-4 w-4 text-primary-500" />
                        Capture Feed
                    </CardTitle>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{events.length} Events Recorded</span>
                 </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0 font-mono text-xs">
                 {events.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-neutral-600 italic">
                        [WAITING_FOR_INTERCEPTION]
                    </div>
                 ) : (
                    <div className="divide-y divide-neutral-800/50">
                        {events.map((ev, idx) => {
                            const isSelected = selectedEvent && 
                                selectedEvent.timestamp === ev.timestamp && 
                                selectedEvent.ip === ev.ip && 
                                selectedEvent.type === ev.type; // Better identity check (still proxy)
                            
                            return (
                                <button 
                                    key={getEventKey(ev, idx)} 
                                    onClick={() => setSelectedEvent(ev)}
                                    aria-label={`Event: ${ev.type} from ${ev.ip} at ${ev.route}`}
                                    className={cn(
                                        "w-full text-left p-3 transition-colors flex items-center gap-4 group border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                                        isSelected ? "border-primary bg-primary/[0.08]" :
                                        ev.type === 'shell_command' ? "border-warning/20 bg-warning/[0.03] hover:bg-warning/[0.06]" :
                                        ev.type === 'sqli_probe' ? "border-danger/20 bg-danger/[0.03] hover:bg-danger/[0.06]" :
                                        "border-transparent hover:bg-neutral-900/50"
                                    )}
                                >
                                    <div className="text-neutral-500 text-[10px] w-16 tabular-nums font-bold">
                                        {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}
                                    </div>
                                    <div className="w-24 overflow-hidden">
                                        <Badge variant={ev.type === 'shell_command' ? 'warning' : ev.type === 'sqli_probe' ? 'danger' : 'primary'} size="sm">
                                            {ev.type.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="flex-1 truncate">
                                        <span className={cn(
                                            "font-bold mr-2",
                                            isSelected ? "text-primary" : "text-neutral-300"
                                        )}>{ev.ip}</span>
                                        <span className="text-neutral-600 font-medium">@</span>
                                        <span className="text-neutral-400 ml-2 italic">{ev.route}</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                        <Eye className="h-3 w-3 text-primary/60" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                 )}
              </CardContent>
           </Card>
        </div>

        {/* Right Sidebar: Tarpit & Inspector */}
        <div className="space-y-6">
            {/* Tarpit Status */}
            <Card variant="panel" glow="danger" className="border-danger-900/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-danger-400">
                        <ShieldAlert className="h-4 w-4" />
                        Tarpit Monitor
                    </CardTitle>
                    <CardDescription>IPs currently trapped in slow-responses.</CardDescription>
                </CardHeader>
                <CardContent className="max-h-48 overflow-y-auto space-y-2">
                    {trappedIps.length === 0 ? (
                        <div className="text-center py-4 text-neutral-600 text-xs font-mono border border-dashed border-neutral-800 rounded-sm">
                            NO ACTIVE THREATS
                        </div>
                    ) : (
                        trappedIps.map(trap => (
                            <div key={trap.ip} className="flex items-center justify-between p-2 bg-danger-900/10 border border-danger-900/20 rounded-sm">
                                <div className="flex flex-col">
                                    <span className="text-xs font-mono font-bold text-neutral-200">{trap.ip}</span>
                                    <span className="text-[10px] font-mono text-danger-500 uppercase">Trapped {trap.duration}s ago</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-success-400" onClick={() => releaseIp(trap.ip)}>
                                    <Unlock className="h-3 w-3" />
                                </Button>
                            </div>
                        ))
                    )}
                </CardContent>
                {trappedIps.length > 0 && (
                    <CardFooter className="pt-2">
                        <Button variant="outline" size="sm" className="w-full text-[10px]" onClick={() => releaseIp()}>
                            RELEASE ALL
                        </Button>
                    </CardFooter>
                )}
            </Card>

            {/* Event Inspector */}
            <Card variant="glass" glow="warning" className="flex flex-col min-h-[300px]">
                <CardHeader className="border-b border-white/5 pb-3">
                    <CardTitle className="text-xs">Event Inspector</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 flex flex-col">
                    {selectedEvent ? (
                        <div className="flex-1 flex flex-col">
                            <div className="p-4 bg-black/40 font-mono text-[10px] space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">ORIGIN_IP</span>
                                    <span className="text-primary-400">{selectedEvent.ip}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">TIMESTAMP</span>
                                    <span className="text-neutral-300">{selectedEvent.timestamp}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">SESSION_ID</span>
                                    <span className="text-neutral-300 truncate ml-4">{selectedEvent.sessionId || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="flex-1 p-4 font-mono text-[11px]">
                                <span className="text-neutral-500 block mb-2 uppercase tracking-tighter border-b border-white/5 pb-1">Payload / Details</span>
                                <pre className="text-neutral-300 whitespace-pre-wrap break-all bg-black/20 p-2 rounded-sm border border-white/5 max-h-64 overflow-y-auto">
                                    {JSON.stringify(selectedEvent.details, null, 2).slice(0, 10000)}
                                    {JSON.stringify(selectedEvent.details).length > 10000 && "\n...[TRUNCATED]..."}
                                </pre>
                            </div>
                            <div className="p-4 mt-auto border-t border-white/5 space-y-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full text-primary-400 border-primary-500/20 hover:bg-primary-500/5 group"
                                    onClick={() => selectedEvent.details && openInCyberChef(selectedEvent.details)}
                                >
                                    <ChefHat className="h-3 w-3 mr-2" />
                                    Analyze in CyberChef
                                    <ExternalLink className="h-3 w-3 ml-auto opacity-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </Button>
                                {selectedEvent.type === 'shell_command' && (
                                    <Button variant="neon" size="sm" className="w-full group" onClick={() => window.open('/console', '_blank', 'noopener')}>
                                        <Terminal className="h-3 w-3" />
                                        Intervene in Session
                                        <ExternalLink className="h-3 w-3 ml-auto opacity-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-neutral-600 text-xs font-mono uppercase">
                            Select an event to inspect
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
