import { useState, useCallback, useEffect } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export interface PackageNode {
    id: string;
    name: string;
    version: string;
    type: 'app' | 'lib' | 'dev';
    status: 'clean' | 'infected' | 'compromised';
    dependencies: string[];
    dependents: string[];
    // UI state (will be populated by layout engine)
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
}

export interface DependencyGraph {
    nodes: Record<string, PackageNode>;
}

export function useDependencyGraph() {
  const { baseUrl } = useApparatus();
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGraph = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/api/simulator/dependencies`);
      if (res.ok) {
        const data = await res.json();
        setGraph(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [baseUrl]);

  const injectMalware = useCallback(async (id: string) => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
      await fetch(`${baseUrl}/api/simulator/dependencies/infect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      await fetchGraph();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, fetchGraph]);

  const resetGraph = useCallback(async () => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
      await fetch(`${baseUrl}/api/simulator/dependencies/reset`, { method: 'POST' });
      await fetchGraph();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, fetchGraph]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return {
    graph,
    injectMalware,
    resetGraph,
    isLoading
  };
}
