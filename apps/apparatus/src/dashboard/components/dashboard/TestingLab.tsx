import { useState } from 'react';
import { FlaskConical, Play, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useEscapeArtist } from '../../hooks/useEscapeArtist';
import { LivePayloadFuzzer } from './LivePayloadFuzzer';

export function TestingLab() {
  const { runScan, lastResult, isLoading } = useEscapeArtist();

  const [target, setTarget] = useState('');
  const [dlpType, setDlpType] = useState<string>('manual');

  const handleScan = (event: React.FormEvent) => {
    event.preventDefault();
    runScan({ target: target || undefined, dlpType });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 font-mono uppercase">Vulnerability Lab</h1>
        <p className="text-neutral-400 text-sm mt-1">Egress filtering validation, DLP simulation, and live payload fuzzing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card variant="glass" glow="primary">
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
                  <label htmlFor="escape-target" className="text-xs font-mono text-neutral-400 uppercase">
                    Target Host (Optional)
                  </label>
                  <input
                    id="escape-target"
                    type="text"
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    placeholder="e.g. evil.com"
                    className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="dlp-payload" className="text-xs font-mono text-neutral-400 uppercase mb-1 block">
                    DLP Payload
                  </label>
                  <Select value={dlpType} onValueChange={setDlpType}>
                    <SelectTrigger
                      id="dlp-payload"
                      className="w-full bg-neutral-900 border-neutral-800 text-neutral-300 h-9 font-mono text-xs"
                    >
                      <SelectValue placeholder="Select payload type" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800">
                      {['manual', 'cc', 'ssn', 'email'].map((type) => (
                        <SelectItem
                          key={type}
                          value={type}
                          className="text-neutral-300 hover:bg-neutral-800 cursor-pointer font-mono text-xs"
                        >
                          {type.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-4">
                  <Button type="submit" variant="default" className="w-full" isLoading={isLoading}>
                    {isLoading ? 'Scanning...' : 'Run Egress Scan'}
                    {!isLoading && <Play className="h-4 w-4 ml-2" />}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

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
                      The Escape Artist will attempt to exfiltrate data via DNS, HTTP, ICMP, and raw TCP/UDP sockets
                      to test your firewall rules.
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
                          <Badge variant="secondary" className="font-mono">
                            {group.protocol.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {checks.map((check: any, j: number) => {
                            const isSuccess = check.status === 'success' || check.status === 'likely_success';
                            return (
                              <div key={j} className="flex items-start gap-3 bg-neutral-900/30 p-2 rounded text-xs font-mono">
                                {isSuccess ? (
                                  <XCircle className="h-4 w-4 text-destructive-500 mt-0.5 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                )}
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <span className="text-neutral-300 font-bold">{check.target || 'Egress Check'}</span>
                                    <span className={isSuccess ? 'text-destructive-400' : 'text-green-400'}>
                                      {isSuccess ? 'BREACHED' : 'BLOCKED'}
                                    </span>
                                  </div>
                                  {check.error && <div className="text-neutral-500 mt-1">{check.error}</div>}
                                  {check.details && <div className="text-neutral-500 mt-1">{check.details}</div>}
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

      <LivePayloadFuzzer />
    </div>
  );
}
