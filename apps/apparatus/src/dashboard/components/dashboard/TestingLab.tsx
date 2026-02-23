import { useState, useEffect } from 'react';
import { FlaskConical, Play, CheckCircle2, XCircle, ShieldCheck, Zap, ShieldAlert, Loader2, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../ui/cn';
import { useEscapeArtist } from '../../hooks/useEscapeArtist';
import { useLabTools, LabToolOption } from '../../hooks/useLabTools';
import { LivePayloadFuzzer } from './LivePayloadFuzzer';
import { RedTeamValidator } from './RedTeamValidator';

export function TestingLab() {
  const { runScan, lastResult, isLoading: escapeLoading } = useEscapeArtist();
  const { listK6Scenarios, listNucleiTemplates, runK6, runNuclei, isLoading: labLoading, result: labResult, error: labError } = useLabTools();

  const [escapeTarget, setEscapeTarget] = useState('');
  const dlpType = 'manual';

  // Scanner State
  const [k6Scenarios, setK6Scenarios] = useState<LabToolOption[]>([]);
  const [nucleiTemplates, setNucleiTemplates] = useState<LabToolOption[]>([]);
  const [selectedK6, setSelectedK6] = useState('');
  const [selectedNuclei, setSelectedNuclei] = useState('');
  const scanTarget = 'http://localhost:8090';

  useEffect(() => {
    listK6Scenarios().then(setK6Scenarios).catch(err => console.error(err));
    listNucleiTemplates().then(setNucleiTemplates).catch(err => console.error(err));
  }, [listK6Scenarios, listNucleiTemplates]);

  const handleEscapeScan = (event: React.FormEvent) => {
    event.preventDefault();
    runScan({ target: escapeTarget || undefined, dlpType });
  };

  const handleK6Run = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedK6) return;
    runK6({ script: selectedK6, vus: 10, duration: '10s', target: scanTarget });
  };

  const handleNucleiRun = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedNuclei) return;
    runNuclei({ template: selectedNuclei, target: scanTarget });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl text-neutral-100 type-heading flex items-center gap-2 ml-2">
          <FlaskConical className="h-6 w-6 text-primary-400" />
          Vulnerability Lab
        </h1>
        <p className="text-neutral-400 text-sm mt-1 ml-2">Egress filtering validation, load testing, and automated security scanning.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configs */}
        <div className="space-y-6">
          {/* Escape Artist */}
          <Card variant="glass" glow="primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldAlert className="h-4 w-4 text-danger-400" />
                Escape Artist
              </CardTitle>
              <CardDescription>Egress channel validation.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEscapeScan} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase">Target Host</label>
                  <input
                    type="text"
                    value={escapeTarget}
                    onChange={(e) => setEscapeTarget(e.target.value)}
                    placeholder="e.g. evil.com"
                    className="w-full mt-1 px-3 py-2 bg-neutral-900/60 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500/40"
                  />
                </div>
                <div className="pt-2">
                  <Button type="submit" variant="default" className="w-full h-9" isLoading={escapeLoading}>
                    <Play className="h-3.5 w-3.5 mr-2" />
                    Run Egress Scan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Load Testing (K6) */}
          <Card variant="glass" glow="warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-warning-400" />
                Load Lab (k6)
              </CardTitle>
              <CardDescription>Simulate high-concurrency traffic.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleK6Run} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase">Scenario</label>
                  <Select value={selectedK6} onValueChange={setSelectedK6}>
                    <SelectTrigger className="w-full mt-1 bg-neutral-900 border-neutral-800 text-neutral-300 h-9 font-mono text-xs">
                      <SelectValue placeholder="Select script" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800">
                      {k6Scenarios.map((s) => (
                        <SelectItem key={s.name} value={s.name} className="font-mono text-xs">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <Button type="submit" variant="primary" className="w-full h-9" disabled={!selectedK6} isLoading={labLoading}>
                    <Play className="h-3.5 w-3.5 mr-2" />
                    Initialize Load
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Scanning (Nuclei) */}
          <Card variant="glass" glow="danger">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary-400" />
                Vulnerability Scan (Nuclei)
              </CardTitle>
              <CardDescription>Automated template-based scanning.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNucleiRun} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase">Template</label>
                  <Select value={selectedNuclei} onValueChange={setSelectedNuclei}>
                    <SelectTrigger className="w-full mt-1 bg-neutral-900 border-neutral-800 text-neutral-300 h-9 font-mono text-xs">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800">
                      {nucleiTemplates.map((t) => (
                        <SelectItem key={t.name} value={t.name} className="font-mono text-xs">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <Button type="submit" variant="destructive" className="w-full h-9" disabled={!selectedNuclei} isLoading={labLoading}>
                    <ShieldAlert className="h-3.5 w-3.5 mr-2" />
                    Deploy Scanner
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Unified Results */}
        <div className="lg:col-span-2 space-y-6">
          <Card variant="panel" glow="info" className="min-h-[600px] flex flex-col">
            <CardHeader className="flex-none border-b border-white/5 bg-white/[0.01]">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Lab Operations Output</CardTitle>
                {labLoading && <Loader2 className="h-4 w-4 animate-spin text-primary-400" />}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {!lastResult && !labResult && (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 p-8 text-center space-y-4">
                  <ShieldCheck className="h-16 w-16 opacity-20" />
                  <div className="max-w-sm">
                    <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Awaiting Lab Execution</p>
                    <p className="text-xs text-neutral-600 mt-2 font-mono leading-relaxed">
                      Select a scanner or load scenario from the left panel to begin testing infrastructure resilience and security posture.
                    </p>
                  </div>
                </div>
              )}

              {/* Lab Tool Results (K6/Nuclei) */}
              {labResult && (
                <div className="p-6 font-mono text-xs animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3 mb-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-sm">
                    <div className={cn("w-2 h-2 rounded-full", labResult.status === 'completed' ? "bg-success-500 shadow-glow-success" : "bg-warning-500 animate-pulse")} />
                    <div className="flex-1">
                      <div className="text-primary-400 font-bold uppercase tracking-widest">{labResult.scenarioName} Execution</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">ID: {labResult.executionId} | Status: {labResult.status}</div>
                    </div>
                  </div>
                  
                  {labResult.error ? (
                    <div className="p-4 bg-danger-900/20 border border-danger-900/40 text-danger-400 rounded-sm">
                      <div className="font-bold mb-1">EXECUTION_ERROR</div>
                      {labResult.error}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-black/40 border border-white/5 rounded-sm whitespace-pre-wrap leading-relaxed text-neutral-300">
                        {labResult.status === 'running' ? "[RUNNING_LAB_PROCESS... MONITORING_OUTPUT...]" : "Scan/Load Test completed successfully. Review logs for findings."}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {labError && !labResult && (
                <div className="p-6 font-mono text-xs animate-in slide-in-from-bottom-2">
                  <div className="p-4 bg-danger-900/20 border border-danger-900/40 text-danger-400 rounded-sm">
                    <div className="font-bold mb-1">LAB_ERROR</div>
                    {labError}
                  </div>
                </div>
              )}

              {/* Escape Artist Results */}
              {lastResult && (
                <div className="divide-y divide-white/5 animate-in fade-in">
                  {lastResult.checks.map((group, i) => {
                    const checks = group.checks || [group];
                    return (
                      <div key={i} className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="secondary" className="font-mono text-[10px]">{group.protocol.toUpperCase()}</Badge>
                          <span className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="space-y-3">
                          {checks.map((check: any, j: number) => {
                            const isSuccess = check.status === 'success' || check.status === 'likely_success';
                            return (
                              <div key={j} className="flex items-start gap-4 bg-neutral-900/40 p-3 rounded-sm border border-white/5 group hover:border-white/10 transition-colors">
                                {isSuccess ? (
                                  <XCircle className="h-4 w-4 text-danger-500 mt-0.5 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-success-500 mt-0.5 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-neutral-200 font-bold text-xs truncate">{check.target || 'Egress Channel'}</span>
                                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm", isSuccess ? "bg-danger-500/10 text-danger-400" : "bg-success-500/10 text-success-400")}>
                                      {isSuccess ? 'BREACHED' : 'BLOCKED'}
                                    </span>
                                  </div>
                                  {(check.error || check.details) && (
                                    <div className="text-[10px] text-neutral-500 font-mono mt-1.5 leading-relaxed opacity-80">
                                      {check.error || check.details}
                                    </div>
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

      <div className="space-y-6 mt-12">
        <h2 className="text-xl font-bold text-neutral-100 font-mono flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary-400" />
          Automated Red Team Validator
        </h2>
        <RedTeamValidator />
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-bold text-neutral-100 font-mono flex items-center gap-2 mb-6">
          <Target className="h-5 w-5 text-primary-400" />
          One-Shot Payload Fuzzer
        </h2>
        <LivePayloadFuzzer />
      </div>
    </div>
  );
}
