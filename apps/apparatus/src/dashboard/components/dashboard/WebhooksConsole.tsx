import { useState, useEffect } from 'react';
import { Webhook, Copy, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useWebhooks, WebhookRequest } from '../../hooks/useWebhooks';
import { cn } from '../ui/cn';
import { useApparatus } from '../../providers/ApparatusProvider';

export function WebhooksConsole() {
  const { baseUrl } = useApparatus();
  const [hookId, setHookId] = useState<string>('');
  const [activeHookId, setActiveHookId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null);
  
  const { requests, isConnected } = useWebhooks(activeHookId);

  // Generate random ID on mount if none
  useEffect(() => {
      if (!activeHookId) {
          const randomId = Math.random().toString(36).substring(2, 10);
          setHookId(randomId);
          setActiveHookId(randomId);
      }
  }, []);

  const handleCopyUrl = () => {
      if (!baseUrl || !activeHookId) return;
      navigator.clipboard.writeText(`${baseUrl}/hooks/${activeHookId}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 font-mono uppercase">Webhook Inspector</h1>
          <p className="text-neutral-400 text-sm mt-1">Capture and inspect HTTP callbacks.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-1 pr-3 gap-2">
                <div className="px-3 py-1.5 bg-neutral-800 rounded text-xs font-mono text-neutral-300">
                    POST {baseUrl}/hooks/
                </div>
                <input 
                    type="text" 
                    value={hookId}
                    onChange={(e) => setHookId(e.target.value)}
                    className="bg-transparent border-none text-white font-mono text-sm w-32 focus:outline-none"
                    placeholder="hook-id"
                />
                <Button size="sm" variant="ghost" onClick={() => setActiveHookId(hookId)}>
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Request List */}
        <Card variant="panel" className="flex flex-col h-full border-l-4 border-l-primary-500">
            <CardHeader className="flex-none border-b border-neutral-800 pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-mono uppercase">Captured Requests</CardTitle>
                    <Badge variant={isConnected ? 'success' : 'neutral'} dot>
                        {isConnected ? 'LIVE' : 'OFFLINE'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                {requests.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-500 p-8 text-center">
                        <Webhook className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-sm">Waiting for requests...</p>
                        <p className="text-xs font-mono mt-2 bg-neutral-900 p-2 rounded">
                            curl -X POST {baseUrl}/hooks/{activeHookId} -d '{`{"hello":"world"}`}'
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-800/50">
                        {requests.map((req, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedRequest(req)}
                                className={cn(
                                    "w-full text-left p-4 hover:bg-neutral-900/50 transition-colors flex flex-col gap-2 border-l-2",
                                    selectedRequest === req ? "border-primary-500 bg-neutral-900/80" : "border-transparent"
                                )}
                            >
                                <div className="flex justify-between items-center w-full">
                                    <Badge size="sm" variant={req.method === 'POST' ? 'info' : 'success'}>
                                        {req.method}
                                    </Badge>
                                    <span className="text-[10px] font-mono text-neutral-500">
                                        {new Date(req.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="text-xs font-mono text-neutral-300 truncate w-full">
                                    {req.ip}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Request Detail */}
        <Card variant="glass" className="lg:col-span-2 h-full flex flex-col">
            <CardHeader className="flex-none border-b border-white/5 pb-3">
                <CardTitle className="text-sm font-mono uppercase">Request Payload</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 flex flex-col">
                {selectedRequest ? (
                    <div className="flex flex-col h-full">
                        {/* Meta */}
                        <div className="grid grid-cols-2 gap-4 p-6 border-b border-white/5 bg-black/20">
                            <div>
                                <label className="text-[10px] font-mono text-neutral-500 uppercase block">Timestamp</label>
                                <span className="text-sm font-mono text-neutral-200">{selectedRequest.timestamp}</span>
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-neutral-500 uppercase block">Source IP</label>
                                <span className="text-sm font-mono text-primary-400">{selectedRequest.ip}</span>
                            </div>
                        </div>

                        {/* Headers */}
                        <div className="p-6 border-b border-white/5">
                            <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-2">Headers</label>
                            <div className="bg-black/40 rounded p-3 font-mono text-xs text-neutral-300 overflow-x-auto">
                                {Object.entries(selectedRequest.headers).map(([k, v]) => (
                                    <div key={k} className="flex gap-2">
                                        <span className="text-neutral-500">{k}:</span>
                                        <span className="text-emerald-400">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 p-6">
                            <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-2">Body</label>
                            <pre className="bg-black/40 rounded p-4 font-mono text-xs text-neutral-300 overflow-x-auto h-full border border-white/5">
                                {typeof selectedRequest.body === 'object' 
                                    ? JSON.stringify(selectedRequest.body, null, 2) 
                                    : selectedRequest.body}
                            </pre>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-neutral-600 text-sm font-mono uppercase tracking-widest">
                        Select a request to inspect
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
