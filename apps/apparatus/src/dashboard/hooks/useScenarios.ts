import { useState, useCallback, useEffect } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export interface ScenarioStep {
    id: string;
    action: 'chaos.cpu' | 'chaos.memory' | 'cluster.attack' | 'mtd.rotate' | 'delay';
    params: any;
    delayMs?: number;
}

export interface Scenario {
    id: string;
    name: string;
    description?: string;
    steps: ScenarioStep[];
    createdAt: string;
}

export function useScenarios() {
  const { baseUrl } = useApparatus();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchScenarios = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/scenarios`);
      if (res.ok) {
        const data = await res.json();
        setScenarios(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [baseUrl]);

  const saveScenario = useCallback(async (scenario: Partial<Scenario>) => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
      await fetch(`${baseUrl}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario)
      });
      await fetchScenarios();
    } catch (e) {
      console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [baseUrl, fetchScenarios]);

  const runScenario = useCallback(async (id: string) => {
    if (!baseUrl) return;
    try {
      await fetch(`${baseUrl}/scenarios/${id}/run`, { method: 'POST' });
      // In a real app, we'd subscribe to progress updates
    } catch (e) {
      console.error(e);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  return {
    scenarios,
    saveScenario,
    runScenario,
    isLoading
  };
}
