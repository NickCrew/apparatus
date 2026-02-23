import { Cpu, HardDrive, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { useChaos } from '../../hooks/useChaos';

export function ChaosConsole() {
  const { triggerCpuSpike, triggerMemorySpike, triggerCrash, isLoading, result } = useChaos();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Chaos Laboratory</h1>
        <p className="text-neutral-400 text-sm mt-1 ml-2">Inject faults to test system resilience.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPU Spike */}
        <Card variant="panel" glow="warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-warning-500" />
              CPU Stress
            </CardTitle>
            <CardDescription>Lock main thread with empty loop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => triggerCpuSpike(5000)} disabled={isLoading}>
                    5s Spike
                </Button>
                <Button variant="secondary" size="sm" onClick={() => triggerCpuSpike(15000)} disabled={isLoading}>
                    15s Spike
                </Button>
             </div>
          </CardContent>
        </Card>

        {/* Memory Leak */}
        <Card variant="panel" glow="warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary-500" />
              Memory Leak
            </CardTitle>
            <CardDescription>Allocate Buffer chunks to heap</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => triggerMemorySpike(100)} disabled={isLoading}>
                    +100 MB
                </Button>
                <Button variant="secondary" size="sm" onClick={() => triggerMemorySpike(500)} disabled={isLoading}>
                    +500 MB
                </Button>
             </div>
             <Button variant="outline" size="sm" className="w-full" onClick={() => triggerMemorySpike(0, 'clear')} disabled={isLoading}>
                Clear / GC
             </Button>
          </CardContent>
        </Card>

        {/* Process Crash */}
        <Card variant="panel" glow="danger">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-danger-400">
              <AlertTriangle className="h-4 w-4" />
              Process Failure
            </CardTitle>
            <CardDescription>Force exit the node process</CardDescription>
          </CardHeader>
          <CardContent>
             <Button variant="danger" className="w-full" onClick={triggerCrash} disabled={isLoading}>
                KILL PROCESS
             </Button>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card variant="glass" className="font-mono text-xs">
           <CardContent className="p-4 flex justify-between items-center">
              <span>{result}</span>
              <Button variant="ghost" size="sm" onClick={() => location.reload()}>Refresh</Button>
           </CardContent>
        </Card>
      )}
    </div>
  );
}
