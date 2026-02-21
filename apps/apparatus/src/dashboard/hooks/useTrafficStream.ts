import { useState, useEffect } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';
import { useSSE } from './useSSE';

export interface TrafficEvent {
  id: string;
  method: string;
  path: string;
  status: number;
  ip: string;
  timestamp: string;
  latencyMs: number;
}

export function useTrafficStream(bufferSize = 50) {
  const { baseUrl } = useApparatus();
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  
  const { subscribe, status } = useSSE(`${baseUrl}/sse`, {
      enabled: !!baseUrl,
      maxRetries: 10
  });

  useEffect(() => {
      if (status !== 'connected') return;
      
      const unsubscribe = subscribe<TrafficEvent>('request', (data) => {
          setEvents(prev => {
              const updated = [data, ...prev];
              if (updated.length > bufferSize) {
                  return updated.slice(0, bufferSize);
              }
              return updated;
          });
      });

      return unsubscribe;
  }, [status, subscribe, bufferSize]);

  return { events, isConnected: status === 'connected' };
}