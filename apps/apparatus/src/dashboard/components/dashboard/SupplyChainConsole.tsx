import { RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useDependencyGraph } from '../../hooks/useDependencyGraph';
import { SupplyChainMap } from './SupplyChainMap';

export function SupplyChainConsole() {
  const { graph, injectMalware, resetGraph, isLoading } = useDependencyGraph();

  if (!graph) return <div className="p-8 text-center text-neutral-500">Loading Graph...</div>;

  const nodeList = Object.values(graph.nodes);
  const total = nodeList.length;
  const infected = nodeList.filter(n => n.status === 'infected').length;
  const compromised = nodeList.filter(n => n.status === 'compromised').length;
  const clean = total - infected - compromised;
  const appStatus = graph.nodes['app-root']?.status || 'clean';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Supply Chain Radar</h1>
          <p className="text-neutral-400 text-sm mt-1 ml-2 type-body">Software Bill of Materials (SBOM) Infection Simulator.</p>
        </div>
        <div className="flex gap-4">
            <div className="flex flex-col items-end">
                <span className="text-[10px] type-tag text-neutral-500 uppercase">Health</span>
                <span className="text-xl type-metric text-neutral-300">
                    {Math.round((clean / total) * 100)}%
                </span>
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div className="flex flex-col items-end">
                <span className="text-[10px] type-tag text-neutral-500 uppercase">App Status</span>
                <Badge variant={appStatus === 'clean' ? 'success' : 'danger'} dot>
                    {appStatus.toUpperCase()}
                </Badge>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Graph */}
        <div className="lg:col-span-3">
           <Card variant="panel" className="h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4 z-10">
                  <Button size="sm" variant="secondary" onClick={resetGraph} disabled={isLoading}>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Reset Simulation
                  </Button>
              </div>
              
              <div className="absolute bottom-4 left-4 z-10 bg-black/60 p-2 rounded text-[10px] font-mono text-neutral-400 border border-white/5">
                  <div>Right-click a node to simulate malware injection.</div>
                  <div className="flex gap-2 mt-1">
                      <span className="text-neutral-500">● Clean</span>
                      <span className="text-danger-500">● Infected (Patient 0)</span>
                      <span className="text-warning-500">● Compromised (Upstream)</span>
                  </div>
              </div>

              <div className="flex-1 bg-neutral-950">
                 <SupplyChainMap 
                    nodes={nodeList} 
                    onNodeClick={(node) => {
                        if (confirm(`Inject malware into package '${node.name}'?`)) {
                            injectMalware(node.id);
                        }
                    }} 
                 />
              </div>
           </Card>
        </div>

        {/* Details Sidebar */}
        <Card variant="glass" glow="danger" className="h-full flex flex-col">
            <CardHeader className="flex-none border-b border-white/5 pb-3">
                <CardTitle className="text-sm font-mono uppercase">Impact Analysis</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="p-4 space-y-4">
                    <div className="bg-danger-900/20 border border-danger-900/50 p-3 rounded-sm">
                        <div className="flex items-center gap-2 mb-2 text-danger-400 font-mono text-xs font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            BLAST RADIUS
                        </div>
                        <div className="text-2xl type-metric text-white">{compromised + infected}</div>
                        <div className="text-[10px] text-neutral-400">Total Affected Packages</div>
                    </div>

                    {infected > 0 && (
                        <div>
                            <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-2">Vectors (Patient Zero)</span>
                            <div className="space-y-1">
                                {nodeList.filter(n => n.status === 'infected').map(n => (
                                    <div key={n.id} className="text-xs font-mono text-danger-400 bg-danger-900/10 px-2 py-1 rounded">
                                        {n.name} v{n.version}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {compromised > 0 && (
                        <div>
                            <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-2">Compromised Upstream</span>
                            <div className="space-y-1">
                                {nodeList.filter(n => n.status === 'compromised').map(n => (
                                    <div key={n.id} className="text-xs font-mono text-warning-400">
                                        {n.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {compromised === 0 && infected === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-neutral-600">
                            <ShieldCheck className="h-12 w-12 mb-2 opacity-20" />
                            <span className="text-xs font-mono">Supply Chain Secure</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
