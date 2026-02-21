import { useState, useEffect, useRef, useCallback } from 'react';

export type SSEStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseSSEOptions {
  enabled?: boolean;
  maxRetries?: number;
  onOpen?: () => void;
  onError?: (event: Event) => void;
  onMaxRetriesExceeded?: () => void;
}

interface UseSSEReturn {
  status: SSEStatus;
  retryCount: number;
  subscribe: <T>(eventType: string, callback: (data: T) => void) => () => void;
  close: () => void;
}

const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export function useSSE(url: string, options: UseSSEOptions = {}): UseSSEReturn {
  const {
    enabled = true,
    maxRetries = 5,
    onOpen,
    onError,
    onMaxRetriesExceeded,
  } = options;

  const [status, setStatus] = useState<SSEStatus>('disconnected');
  const [retryCount, setRetryCount] = useState(0);

  // Refs for callbacks to avoid dependency cycles
  const onOpenRef = useRef(onOpen);
  const onErrorRef = useRef(onError);
  const onMaxRetriesExceededRef = useRef(onMaxRetriesExceeded);

  useEffect(() => {
    onOpenRef.current = onOpen;
    onErrorRef.current = onError;
    onMaxRetriesExceededRef.current = onMaxRetriesExceeded;
  }, [onOpen, onError, onMaxRetriesExceeded]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const closeConnection = useCallback(() => {
    clearReconnectTimeout();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus('disconnected');
  }, [clearReconnectTimeout]);

  const subscribe = useCallback(<T,>(eventType: string, callback: (data: T) => void) => {
    const listeners = listenersRef.current;
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
      
      // If already connected, add the native listener
      if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
          const handler = (event: MessageEvent) => {
             try {
                 const data = JSON.parse(event.data);
                 listeners.get(eventType)?.forEach(cb => cb(data));
             } catch (e) {
                 console.error(`Failed to parse SSE event "${eventType}"`, e);
             }
          };
          // Store handler reference if we needed to remove it later, 
          // but here we just rely on the map lookup in a single handler per type
          eventSourceRef.current.addEventListener(eventType, handler);
      }
    }

    listeners.get(eventType)!.add(callback as (data: any) => void);

    return () => {
      const set = listeners.get(eventType);
      if (set) {
        set.delete(callback as (data: any) => void);
        if (set.size === 0) {
          listeners.delete(eventType);
          // We don't remove the native listener here to simplify logic,
          // it will be cleaned up on reconnection/unmount
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!url || !enabled) {
      closeConnection();
      return;
    }

    // Don't reconnect if we are just incrementing retry count but maxed out?
    // Actually, retryCount changes trigger this effect.
    if (retryCount > maxRetries) {
        setStatus('error');
        onMaxRetriesExceededRef.current?.();
        return;
    }

    // Wait for backoff if this is a retry
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const connect = () => {
        closeConnection(); // Ensure clean slate
        setStatus('connecting');
        
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
            console.log(`[SSE] Connected to ${url}`);
            setStatus('connected');
            setRetryCount(0);
            onOpenRef.current?.();
            
            // Re-attach listeners
            listenersRef.current.forEach((set, type) => {
                es.addEventListener(type, (event: MessageEvent) => {
                    try {
                        const data = JSON.parse(event.data);
                        set.forEach(cb => cb(data));
                    } catch (e) {
                        console.error(`[SSE] Parse Error for ${type}`, e);
                    }
                });
            });
        };

        es.onerror = (event) => {
            console.error(`[SSE] Connection Error for ${url}`, event);
            setStatus('error');
            onErrorRef.current?.(event);
            es.close();
            
            // Trigger retry logic
            setRetryCount(prev => prev + 1); 
        };
    };

    if (retryCount > 0) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCount - 1), MAX_DELAY);
        timeoutId = setTimeout(connect, delay);
    } else {
        connect();
    }

    return () => {
        if (timeoutId) clearTimeout(timeoutId);
        closeConnection();
    };
  }, [url, enabled, retryCount, maxRetries, closeConnection]);

  return { status, retryCount, subscribe, close: closeConnection };
}