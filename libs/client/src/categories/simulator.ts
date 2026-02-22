/**
 * Simulator API
 * Supply chain attack simulation and dependency graph analysis
 */

import type { HttpClient } from '../http.js';

export interface DependencyNode {
  id: string;
  name: string;
  version: string;
  type: 'app' | 'lib' | 'dev';
  status: 'clean' | 'infected' | 'compromised';
  dependencies: string[];
  dependents: string[];
}

export interface DependencyGraph {
  nodes: Record<string, DependencyNode>;
}

export interface InfectionResult {
  status: string;
  node: DependencyNode;
  impact: number;
}

export interface SupplyChainAttackResult {
  logs: string[];
}

export class SimulatorApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Trigger a simulated supply chain attack
   * POST /api/simulator/supply-chain
   */
  async triggerSupplyChainAttack(target?: string): Promise<SupplyChainAttackResult> {
    return this.http.post<SupplyChainAttackResult>('/api/simulator/supply-chain', {
      target,
    });
  }

  /**
   * Get the current dependency graph
   * GET /api/simulator/dependencies
   */
  async getDependencyGraph(): Promise<DependencyGraph> {
    return this.http.get<DependencyGraph>('/api/simulator/dependencies');
  }

  /**
   * Inject malware into a specific package (simulate infection)
   * POST /api/simulator/dependencies/infect
   */
  async infect(id: string): Promise<InfectionResult> {
    return this.http.post<InfectionResult>('/api/simulator/dependencies/infect', { id });
  }

  /**
   * Reset the dependency graph to clean state
   * POST /api/simulator/dependencies/reset
   */
  async reset(): Promise<DependencyGraph> {
    return this.http.post<DependencyGraph>('/api/simulator/dependencies/reset', {});
  }
}
