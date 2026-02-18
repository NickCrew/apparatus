import { useState, useEffect, useCallback } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export function useMTD() {
  const { baseUrl } = useApparatus();
  const [currentPrefix, setCurrentPrefix] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrefix = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/mtd`);
      if (res.ok) {
        const data = await res.json();
        setCurrentPrefix(data.currentPrefix || null);
      }
    } catch (e) {
      console.error(e);
    }
  }, [baseUrl]);

  const rotatePrefix = useCallback(async (customPrefix?: string) => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/mtd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: customPrefix })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentPrefix(data.prefix);
        return data.prefix;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  const disableMTD = useCallback(async () => {
      // In current backend, setting empty prefix disables it
      await rotatePrefix("");
  }, [rotatePrefix]);

  useEffect(() => {
    fetchPrefix();
  }, [fetchPrefix]);

  return {
    currentPrefix,
    isLoading,
    rotatePrefix,
    disableMTD,
    refresh: fetchPrefix
  };
}
