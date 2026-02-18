import { useState, useCallback } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export interface ScanResult {
  timestamp: string;
  payload_type: string;
  checks: {
    protocol: string;
    status?: string;
    checks?: Array<{
      target?: string;
      status: 'success' | 'likely_success' | 'blocked' | 'failed';
      error?: string;
      details?: string;
    }>;
  }[];
}

export function useEscapeArtist() {
  const { baseUrl } = useApparatus();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  const runScan = useCallback(async (options: { target?: string, dlpType?: string }) => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/escape/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setLastResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  return {
    runScan,
    lastResult,
    isLoading
  };
}
