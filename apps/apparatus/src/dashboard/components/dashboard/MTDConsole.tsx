import { useState } from 'react';
import { Shield, RefreshCw, EyeOff, Lock, AlertCircle, Terminal, HelpCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useMTD } from '../../hooks/useMTD';
import { cn } from '../ui/cn';

export function MTDConsole() {
  const { currentPrefix, rotatePrefix, disableMTD, isLoading } = useMTD();
  const [customPrefix, setCustomPrefix] = useState('');

  const isActive = !!currentPrefix;

  const handleRotate = async () => {
      await rotatePrefix(customPrefix || undefined);
      setCustomPrefix('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Moving Target Defense</h1>
          <p className="text-neutral-400 text-sm mt-1 ml-2 type-body">Polymorphic route shifting to hide internal APIs.</p>
        </div>
        <Badge variant={isActive ? 'success' : 'neutral'} dot>
            {isActive ? 'ACTIVE_DEFENSE' : 'MTD_DISABLED'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-2 space-y-6">
           <Card variant="panel" glow="primary" className={cn("transition-colors", isActive ? "border-primary-900/50" : "border-neutral-800")}>
              <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <Shield className={cn("h-4 w-4", isActive ? "text-primary-500" : "text-neutral-500")} />
                    Route Polymorphism
                 </CardTitle>
                 <CardDescription>
                    When active, all requests must be prefixed with a secret rotating token.
                 </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="bg-black/40 rounded-lg p-8 flex flex-col items-center justify-center text-center border border-white/5">
                    {isActive ? (
                        <>
                            <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-4 border border-primary-500/30">
                                <Lock className="h-8 w-8 text-primary-400 animate-pulse" />
                            </div>
                            <span className="text-xs type-tag text-neutral-500 uppercase tracking-widest mb-2">Current Active Prefix</span>
                            <div className="text-4xl type-metric text-white tracking-tighter bg-neutral-900 px-6 py-2 rounded border border-neutral-800 select-all">
                                /{currentPrefix}
                            </div>
                            <p className="mt-4 text-xs text-neutral-400 max-w-sm">
                                All API requests without this prefix will return 404 Not Found.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center mb-4">
                                <EyeOff className="h-8 w-8 text-neutral-600" />
                            </div>
                            <span className="text-xs type-tag text-neutral-500 uppercase tracking-widest mb-2">MTD is currently inactive</span>
                            <p className="text-sm text-neutral-400 max-w-xs">
                                Activate polymorphism to scramble your API surface area.
                            </p>
                        </>
                    )}
                 </div>

                 <div className="flex gap-4">
                    <div className="flex-1">
                        <input 
                            type="text" 
                            value={customPrefix}
                            onChange={e => setCustomPrefix(e.target.value)}
                            placeholder="Optional custom prefix..."
                            className="w-full h-10 px-4 bg-neutral-900 border border-neutral-800 rounded text-sm font-mono text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>
                    <Button variant="primary" onClick={handleRotate} disabled={isLoading}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                        {isActive ? 'Rotate Prefix' : 'Enable MTD'}
                    </Button>
                    {isActive && (
                        <Button variant="outline" onClick={disableMTD} disabled={isLoading}>
                            Disable
                        </Button>
                    )}
                 </div>
              </CardContent>
           </Card>

           {/* Documentation / Code snippet */}
           {isActive && (
               <Card variant="glass">
                  <CardHeader>
                      <CardTitle className="text-xs flex items-center gap-2">
                          <Terminal className="h-3 w-3" />
                          INTEGRATION GUIDE
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="bg-black/60 p-4 rounded font-mono text-[11px] text-neutral-300">
                          <div className="text-neutral-500 mb-2">// Update your client base URL</div>
                          <div className="flex gap-2">
                              <span className="text-primary-400">const</span>
                              <span className="text-white">API_URL = </span>
                              <span className="text-emerald-400">`http://localhost:8090/{currentPrefix}`</span>;
                          </div>
                          <div className="mt-4 text-neutral-500 mb-2">// All future calls:</div>
                          <div className="text-white">fetch(<span className="text-emerald-400">`$&#123;API_URL&#125;/history`</span>);</div>
                      </div>
                  </CardContent>
               </Card>
           )}
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
            <Card variant="panel" className="bg-primary-950/10 border-primary-900/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary-400">
                        <HelpCircle className="h-4 w-4" />
                        What is MTD?
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-neutral-400 space-y-3 leading-relaxed">
                    <p>
                        <strong className="text-neutral-200">Moving Target Defense</strong> shifts the attack surface faster than an adversary can probe it.
                    </p>
                    <p>
                        By constantly changing the valid entry points (routes), automated scanners and static scripts will fail to find your real endpoints.
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-primary-500/5 rounded border border-primary-500/10 text-[10px]">
                        <AlertCircle className="h-3 w-3 text-primary-500 shrink-0 mt-0.5" />
                        <span>This requires client-side synchronization. Your dashboard will attempt to auto-reconnect using the new prefix.</span>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
