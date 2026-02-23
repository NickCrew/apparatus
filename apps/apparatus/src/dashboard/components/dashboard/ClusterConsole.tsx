import { useState, type FormEvent, useMemo } from 'react';
import { Globe, Zap, Wifi, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useCluster, ClusterNode } from '../../hooks/useCluster';
import { cn } from '../ui/cn';
import { ClusterMap } from './ClusterMap';
import { Slider } from '../ui/slider';

// Simple validator for private IP ranges (RFC 1918) and localhost
const isPrivateIp = (hostname: string) => {
    // Check localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    
    // Check private ranges (10.x.x.x, 172.16.x.x-172.31.x.x, 192.168.x.x)
    // Simplified regex check
    if (/^10\./.test(hostname)) return true;
    if (/^192\.168\./.test(hostname)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return true;
    
    return false;
};

export function ClusterConsole() {
  const { nodes, triggerAttack, isLoading, isAttacking } = useCluster();
  const [target, setTarget] = useState('http://example.com');
  const [rate, setRate] = useState(10);

  // Mock nodes for visualization if we only have 1 (self) in dev
  const displayNodes = useMemo(() => {
      if (nodes.length !== 1) return nodes;
      return [
          ...nodes,
          { ip: '10.0.0.2', role: 'peer', status: 'active', lastSeen: Date.now() },
          { ip: '10.0.0.3', role: 'peer', status: 'active', lastSeen: Date.now() },
          { ip: '10.0.0.4', role: 'peer', status: 'active', lastSeen: Date.now() },
          { ip: '10.0.0.5', role: 'peer', status: 'active', lastSeen: Date.now() },
      ] as ClusterNode[];
  }, [nodes]);

  const handleAttack = (e: FormEvent) => {
      e.preventDefault();
      
      try {
          const url = new URL(target);
          if (isPrivateIp(url.hostname)) {
              alert("Safety Block: Targeting localhost or private IP ranges is restricted in the dashboard.");
              return;
          }
      } catch (e) {
          // Invalid URL, let backend handle or browser validation catch it
      }

      if (!confirm(`Confirm Distributed Load Test?\n\nTarget: ${target}\nRate: ${rate} req/s/node\n\nEnsure authorization before proceeding.`)) {
          return;
      }
      triggerAttack(target, rate);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Cluster Operations</h1>
          <p className="text-neutral-400 text-sm mt-1 ml-2 type-body">Distributed command & control network.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <span className="text-[10px] type-tag text-neutral-500 uppercase">Active Nodes</span>
                <span className="text-xl type-metric text-primary-400">{nodes.length} NODES</span>
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div className="flex flex-col items-end">
                <span className="text-[10px] type-tag text-neutral-500 uppercase">Status</span>
                <Badge variant={isAttacking ? 'warning' : 'success'} dot>
                    {isAttacking ? 'RUNNING' : 'IDLE'}
                </Badge>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Map */}
        <div className="lg:col-span-2">
           <Card variant="panel" glow="info" className="h-[500px] flex flex-col">
              <CardHeader className="flex-none border-b border-neutral-800 pb-2 mb-0">
                 <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-info-500" />
                    Network Topology
                 </CardTitle>
              </CardHeader>
              <div className="flex-1 relative bg-neutral-950 overflow-hidden">
                 {/* Hex Grid Background */}
                 <div className="absolute inset-0 opacity-20" style={{
                     backgroundImage: 'radial-gradient(#1f2633 1px, transparent 1px)',
                     backgroundSize: '20px 20px'
                 }} />
                 
                 <ClusterMap nodes={displayNodes} isAttacking={isAttacking} />
              </div>
           </Card>
        </div>

        {/* Control Panel */}
        <div className="space-y-6">
            <Card variant="glass" glow="primary">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary-500" />
                        Test Configuration
                    </CardTitle>
                    <CardDescription>Configure distributed load test parameters.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAttack} className="space-y-4">
                        <div>
                            <label htmlFor="target-url" className="text-xs font-mono text-neutral-400 uppercase">Target Endpoint</label>
                            <input 
                                id="target-url"
                                type="url" 
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="attack-rate" className="text-xs font-mono text-neutral-400 uppercase flex justify-between mb-2">
                                <span>Requests Per Node / sec</span>
                                <span className="text-primary-400">{rate} RPS</span>
                            </label>
                            <Slider
                                id="attack-rate"
                                min={1}
                                max={100}
                                step={1}
                                value={[rate]}
                                onValueChange={(val: number[]) => setRate(val[0])}
                                aria-label="Requests per node per second"
                            />
                        </div>
                        
                        <div className="pt-4">
                            <Button 
                                type="submit" 
                                variant={isAttacking ? 'secondary' : 'default'}
                                className="w-full h-12 text-sm tracking-widest relative overflow-hidden group"
                                disabled={isLoading || isAttacking}
                            >
                                {isAttacking ? (
                                    <>
                                        <Zap className="h-4 w-4 mr-2 animate-pulse text-warning-500" />
                                        TEST RUNNING...
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] bg-[position:-100%_0,0_0] bg-no-repeat transition-[background-position_0s] duration-0 group-hover:bg-[position:200%_0,0_0] group-hover:duration-[1500ms]" />
                                        <Zap className="h-4 w-4 mr-2" />
                                        START LOAD TEST
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card variant="panel" className="flex flex-col min-h-0">
                <CardHeader className="flex-none pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest text-neutral-500">Node Cluster Status</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0 min-h-0">
                    <div className="divide-y divide-neutral-800/50">
                        {displayNodes.map((node, i) => {
                            const isDown = node.status === 'dead';
                            return (
                                <div key={node.ip + i} className={cn(
                                    "flex items-center justify-between p-3 transition-colors",
                                    isDown ? "bg-danger/5" : "hover:bg-neutral-900/30"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            isDown ? "bg-danger shadow-[0_0_8px_rgba(225,29,72,0.6)]" :
                                            node.role === 'self' ? "bg-primary shadow-[0_0_8px_rgba(0,196,167,0.6)]" : 
                                            "bg-success shadow-[0_0_8px_rgba(0,255,148,0.4)]"
                                        )} />
                                        <div className="flex flex-col">
                                            <span className={cn(
                                                "text-xs font-mono",
                                                isDown ? "text-danger font-bold" : "text-neutral-300"
                                            )}>{node.ip}</span>
                                            <span className="text-[10px] text-neutral-500 uppercase">{node.role}</span>
                                        </div>
                                    </div>
                                    {isDown ? (
                                        <Badge variant="danger" size="sm" dot>DOWN</Badge>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-neutral-600">
                                                {Math.floor(Math.random() * 50) + 10}ms
                                            </span>
                                            <Wifi className={cn("h-3.5 w-3.5", isAttacking ? "text-primary animate-pulse" : "text-neutral-600")} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

// End of ClusterConsole component
