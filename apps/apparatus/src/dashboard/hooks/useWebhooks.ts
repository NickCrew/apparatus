import { useState, useEffect, useCallback } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';
import { useSSE } from './useSSE';

export interface WebhookRequest {
  id: string;
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  query: any;
  ip: string;
}

export function useWebhooks(hookId: string | null) {
  const { baseUrl } = useApparatus();
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!baseUrl || !hookId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/hooks/${hookId}/inspect`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, hookId]);

  // Initial fetch when hookId changes
  useEffect(() => {
    if (hookId) {
        fetchRequests();
    } else {
        setRequests([]);
    }
  }, [fetchRequests, hookId]);

  // SSE Subscription
  const { subscribe, status } = useSSE(`${baseUrl}/sse`, { enabled: !!baseUrl });

  useEffect(() => {
    if (status !== 'connected' || !hookId) return;

    const unsubscribe = subscribe<{ hookId: string } & WebhookRequest>('webhook', (event) => {
      if (event.hookId === hookId) {
        setRequests(prev => [event, ...prev].slice(0, 50));
      }
    });

    return unsubscribe;
  }, [status, subscribe, hookId]);

  return {
    requests,
    isLoading,
    refresh: fetchRequests,
    isConnected: status === 'connected'
  };
}
