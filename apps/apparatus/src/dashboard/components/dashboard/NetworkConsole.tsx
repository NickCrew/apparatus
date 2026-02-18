import { Network, Download, Play, FileJson } from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { useForensics } from '../../hooks/useForensics';

export function NetworkConsole() {
  const { startCapture, replayHar, isCapturing, replayResult } = useForensics();
  const [iface, setIface] = useState('eth0');
  const [duration, setDuration] = useState(10);

  const handleCapture = () => {
      startCapture(iface, duration);
  };

  const handleHarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) replayHar(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 font-mono uppercase">Network Forensics</h1>
        <p className="text-neutral-400 text-sm mt-1">Packet capture and traffic replay analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Packet Capture */}
        <Card variant="panel">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-info-500" />
                    PCAP Recorder
                </CardTitle>
                <CardDescription>Capture live traffic to a .pcap file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-mono text-neutral-400 uppercase">Interface</label>
                        <input 
                            type="text" 
                            value={iface}
                            onChange={e => setIface(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-mono text-neutral-400 uppercase">Duration (sec)</label>
                        <input 
                            type="number" 
                            value={duration}
                            onChange={e => setDuration(parseInt(e.target.value))}
                            className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white"
                        />
                    </div>
                </div>
                <Button variant="primary" className="w-full" onClick={handleCapture} disabled={isCapturing}>
                    {isCapturing ? 'Recording...' : 'Start Capture'}
                    {!isCapturing && <Download className="h-4 w-4 ml-2" />}
                </Button>
            </CardContent>
        </Card>

        {/* HAR Replay */}
        <Card variant="panel">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-warning-500" />
                    Traffic Replay
                </CardTitle>
                <CardDescription>Replay requests from a HAR file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-neutral-800 rounded-lg p-8 flex flex-col items-center justify-center hover:border-neutral-700 transition-colors bg-neutral-900/30">
                    <FileJson className="h-8 w-8 text-neutral-600 mb-2" />
                    <label className="cursor-pointer">
                        <span className="text-sm text-primary-400 font-medium hover:underline">Upload HAR File</span>
                        <input type="file" accept=".har,.json" className="hidden" onChange={handleHarUpload} disabled={isCapturing} />
                    </label>
                    <span className="text-xs text-neutral-500 mt-1">or drag and drop</span>
                </div>
                
                {replayResult && (
                    <div className="bg-black/40 p-3 rounded border border-white/5 max-h-32 overflow-y-auto font-mono text-xs">
                        <pre className="text-neutral-300 whitespace-pre-wrap">
                            {JSON.stringify(replayResult, null, 2)}
                        </pre>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
