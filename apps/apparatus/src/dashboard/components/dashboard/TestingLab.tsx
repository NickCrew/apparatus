import { useState } from 'react';
import { FlaskConical, Play, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useEscapeArtist } from '../../hooks/useEscapeArtist';
import { cn } from '../ui/cn';

export function TestingLab() {
  const { runScan, lastResult, isLoading } = useEscapeArtist();
  const [target, setTarget] = useState('');
  const [dlpType, setDlpType] = useState<string>('manual');

  const handleScan = (e: React.FormEvent) => {
      e.preventDefault();
      runScan({ target: target || undefined, dlpType });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 font-mono uppercase">Vulnerability Lab</h1>
        <p className="text-neutral-400 text-sm mt-1">Egress filtering validation and DLP simulation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="space-y-6">
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-primary-500" />
                        Escape Artist
                    </CardTitle>
                    <CardDescription>Configure egress scan parameters.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleScan} className="space-y-4">
                        <div>
                            <label className="text-xs font-mono text-neutral-400 uppercase">Target Host (Optional)</label>
                            <input 
                                type="text" 
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                                placeholder="e.g. evil.com"
                                className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-mono text-neutral-400 uppercase">DLP Payload</label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                {['manual', 'cc', 'ssn', 'email'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setDlpType(type)}
                                        className={cn(
                                            "px-3 py-2 text-xs font-mono rounded-sm border transition-colors",
                                            dlpType === type 
                                                ? "bg-primary-900/30 border-primary-500 text-primary-400" 
                                                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                                        )}
                                    >
                                        {type.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="pt-4">
                            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Scanning...' : 'Run Egress Scan'}
                                {!isLoading && <Play className="h-4 w-4 ml-2" />}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
            <Card variant="panel" className="h-full min-h-[500px] flex flex-col">
                <CardHeader className="flex-none border-b border-neutral-800 pb-3">
                    <CardTitle>Scan Results</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                    {!lastResult ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-600 p-8 text-center space-y-4">
                            <ShieldCheck className="h-16 w-16 opacity-20" />
                            <div className="max-w-xs">
                                <p className="text-sm font-medium text-neutral-400">Ready to Scan</p>
                                <p className="text-xs text-neutral-600 mt-1">
                                    The Escape Artist will attempt to exfiltrate data via DNS, HTTP, ICMP, and raw TCP/UDP sockets to test your firewall rules.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-800/50">
                            {lastResult.checks.map((group, i) => {
                                const checks = group.checks || [group];
                                return (
                                    <div key={i} className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge variant="neutral" className="font-mono">{group.protocol.toUpperCase()}</Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {checks.map((check: any, j: number) => {
                                                const isSuccess = check.status === 'success' || check.status === 'likely_success';
                                                return (
                                                    <div key={j} className="flex items-start gap-3 bg-neutral-900/30 p-2 rounded text-xs font-mono">
                                                        {isSuccess ? (
                                                            <XCircle className="h-4 w-4 text-danger-500 mt-0.5 shrink-0" />
                                                        ) : (
                                                            <CheckCircle2 className="h-4 w-4 text-success-500 mt-0.5 shrink-0" />
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="flex justify-between">
                                                                <span className="text-neutral-300 font-bold">{check.target || 'Egress Check'}</span>
                                                                <span className={isSuccess ? "text-danger-400" : "text-success-400"}>
                                                                    {isSuccess ? 'BREACHED' : 'BLOCKED'}
                                                                </span>
                                                            </div>
                                                            {check.error && (
                                                                <div className="text-neutral-500 mt-1">{check.error}</div>
                                                            )}
                                                            {check.details && (
                                                                <div className="text-neutral-500 mt-1">{check.details}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
