import { describe, expect, it } from 'vitest';
import type { Edge } from 'reactflow';
import {
  createNodeDataForAction,
  graphToScenarioPayload,
  normalizeNodeParams,
  scenarioPayloadToGraph,
  type ScenarioAction,
  type ScenarioBuilderNode,
  type ScenarioBuilderPayload,
  validateNodeParameters,
  validateScenarioGraph,
  validateScenarioNodeParams,
} from '../src/dashboard/components/scenarios/scenarioBuilder.js';

function makeNode(args: { id: string; x: number; y: number; action?: ScenarioAction }): ScenarioBuilderNode {
  return {
    id: args.id,
    type: 'default',
    position: { x: args.x, y: args.y },
    data: {
      label: args.id,
      action: args.action ?? 'delay',
      params: {},
    },
  };
}

describe('scenarioBuilder graph mapping', () => {
  it('uses connected edge topology to determine step order', () => {
    const nodes: ScenarioBuilderNode[] = [
      makeNode({ id: 'b', x: 80, y: 30, action: 'chaos.memory' }),
      makeNode({ id: 'a', x: 400, y: 30, action: 'chaos.cpu' }),
      makeNode({ id: 'c', x: 240, y: 30, action: 'cluster.attack' }),
    ];
    const edges: Edge[] = [
      { id: 'e-a-c', source: 'a', target: 'c' },
      { id: 'e-c-b', source: 'c', target: 'b' },
    ];

    const payload = graphToScenarioPayload({
      name: 'Ordered Chain',
      description: 'Edge-first',
      nodes,
      edges,
    });

    expect(payload.steps.map((step) => step.id)).toEqual(['a', 'c', 'b']);
  });

  it('falls back to x/y position ordering when no edges exist', () => {
    const nodes: ScenarioBuilderNode[] = [
      makeNode({ id: 'right', x: 400, y: 10 }),
      makeNode({ id: 'left-high', x: 50, y: 90 }),
      makeNode({ id: 'left-low', x: 50, y: 20 }),
    ];

    const payload = graphToScenarioPayload({
      name: 'Fallback',
      description: 'Position sort',
      nodes,
      edges: [],
    });

    expect(payload.steps.map((step) => step.id)).toEqual(['left-low', 'left-high', 'right']);
  });

  it('keeps disconnected nodes deterministically after traversed chains', () => {
    const nodes: ScenarioBuilderNode[] = [
      makeNode({ id: 'chain-start', x: 200, y: 10 }),
      makeNode({ id: 'chain-end', x: 350, y: 10 }),
      makeNode({ id: 'orphan', x: 80, y: 10 }),
    ];
    const edges: Edge[] = [{ id: 'e-start-end', source: 'chain-start', target: 'chain-end' }];

    const payload = graphToScenarioPayload({
      name: 'Mixed',
      description: 'Chain + orphan',
      nodes,
      edges,
    });

    expect(payload.steps.map((step) => step.id)).toEqual(['orphan', 'chain-start', 'chain-end']);
  });

  it('builds a sequential graph from scenario payload steps', () => {
    const payload: ScenarioBuilderPayload = {
      id: 'sc-1',
      name: 'Round Trip',
      description: 'Graph builder',
      steps: [
        { id: 's1', action: 'chaos.cpu', params: { duration: 1000 } },
        { id: 's2', action: 'delay', params: { duration: 500 } },
        { id: 's3', action: 'cluster.attack', params: { target: 'http://example.com', rate: 12 } },
      ],
    };

    const graph = scenarioPayloadToGraph(payload);
    expect(graph.nodes.map((node) => node.id)).toEqual(['s1', 's2', 's3']);
    expect(graph.edges.map((edge) => `${edge.source}->${edge.target}`)).toEqual(['s1->s2', 's2->s3']);
  });

  it('validates and rejects branching graph layouts', () => {
    const nodes: ScenarioBuilderNode[] = [
      makeNode({ id: 'root', x: 10, y: 10 }),
      makeNode({ id: 'left', x: 120, y: 10 }),
      makeNode({ id: 'right', x: 120, y: 90 }),
    ];
    const edges: Edge[] = [
      { id: 'e-root-left', source: 'root', target: 'left' },
      { id: 'e-root-right', source: 'root', target: 'right' },
    ];

    const errors = validateScenarioGraph(nodes, edges);
    expect(errors).toContain('Sequential mode allows only one outgoing edge per step.');
  });

  it('validates and rejects disconnected graphs', () => {
    const nodes: ScenarioBuilderNode[] = [
      makeNode({ id: 'a', x: 10, y: 10 }),
      makeNode({ id: 'b', x: 120, y: 10 }),
      makeNode({ id: 'orphan', x: 240, y: 10 }),
    ];
    const edges: Edge[] = [{ id: 'e-a-b', source: 'a', target: 'b' }];

    const errors = validateScenarioGraph(nodes, edges);
    expect(errors).toContain('Graph must have exactly one starting step.');
    expect(errors).toContain('Graph must connect all steps in a single execution chain.');
  });

  it('validates and rejects execution cycles', () => {
    const nodes: ScenarioBuilderNode[] = [
      makeNode({ id: 'a', x: 10, y: 10 }),
      makeNode({ id: 'b', x: 120, y: 10 }),
      makeNode({ id: 'c', x: 240, y: 10 }),
    ];
    const edges: Edge[] = [
      { id: 'e-a-b', source: 'a', target: 'b' },
      { id: 'e-b-c', source: 'b', target: 'c' },
      { id: 'e-c-a', source: 'c', target: 'a' },
    ];

    const errors = validateScenarioGraph(nodes, edges);
    expect(errors).toContain('Graph must have exactly one starting step.');
    expect(errors).toContain('Graph cannot contain execution cycles.');
  });

  it('accepts a valid linear execution chain', () => {
    const nodes: ScenarioBuilderNode[] = [
      makeNode({ id: 'a', x: 10, y: 10 }),
      makeNode({ id: 'b', x: 120, y: 10 }),
      makeNode({ id: 'c', x: 240, y: 10 }),
    ];
    const edges: Edge[] = [
      { id: 'e-a-b', source: 'a', target: 'b' },
      { id: 'e-b-c', source: 'b', target: 'c' },
    ];

    const errors = validateScenarioGraph(nodes, edges);
    expect(errors).toEqual([]);
  });

  it('rejects edges referencing missing nodes', () => {
    const nodes: ScenarioBuilderNode[] = [makeNode({ id: 'a', x: 10, y: 10 })];
    const edges: Edge[] = [{ id: 'e-invalid', source: 'a', target: 'ghost' }];

    const errors = validateScenarioGraph(nodes, edges);
    expect(errors).toContain('Graph contains invalid edge references.');
  });

  it('rejects convergent fan-in edges', () => {
    const nodes: ScenarioBuilderNode[] = [
      makeNode({ id: 'a', x: 10, y: 10 }),
      makeNode({ id: 'b', x: 120, y: 10 }),
      makeNode({ id: 'c', x: 240, y: 10 }),
    ];
    const edges: Edge[] = [
      { id: 'e-a-c', source: 'a', target: 'c' },
      { id: 'e-b-c', source: 'b', target: 'c' },
    ];

    const errors = validateScenarioGraph(nodes, edges);
    expect(errors).toContain('Sequential mode allows only one incoming edge per step.');
  });

  it('accepts a single-node graph with no edges', () => {
    const nodes: ScenarioBuilderNode[] = [makeNode({ id: 'solo', x: 10, y: 10 })];
    const errors = validateScenarioGraph(nodes, []);
    expect(errors).toEqual([]);
  });

  it('rejects self-loop edges', () => {
    const nodes: ScenarioBuilderNode[] = [makeNode({ id: 'a', x: 10, y: 10 })];
    const edges: Edge[] = [{ id: 'e-self', source: 'a', target: 'a' }];

    const errors = validateScenarioGraph(nodes, edges);
    expect(errors).toContain('Graph cannot contain execution cycles.');
  });

  it('accepts empty graph input (handled by higher-level required-node validation)', () => {
    const errors = validateScenarioGraph([], []);
    expect(errors).toEqual([]);
  });

  it('provides action defaults for node data creation', () => {
    const memoryNodeData = createNodeDataForAction('chaos.memory');
    expect(memoryNodeData.params).toEqual({ action: 'allocate', amount: 100 });
    expect(memoryNodeData.delayMs).toBe(1000);
  });

  it('validates cluster attack node parameters', () => {
    const errors = validateNodeParameters(
      'cluster.attack',
      { target: 'ftp://example.com', rate: 0 },
      -3
    );
    expect(errors).toContain('Cluster target must be a valid http/https URL.');
    expect(errors).toContain('Cluster rate must be an integer between 1 and 2000.');
    expect(errors).toContain('Post-step delay must be an integer between 0 and 120000 ms.');
  });

  it('accepts valid chaos.cpu parameters', () => {
    const errors = validateNodeParameters('chaos.cpu', { duration: 5000 });
    expect(errors).toEqual([]);
  });

  it('accepts chaos.cpu duration at configured boundaries', () => {
    expect(validateNodeParameters('chaos.cpu', { duration: 250 })).toEqual([]);
    expect(validateNodeParameters('chaos.cpu', { duration: 120000 })).toEqual([]);
  });

  it('accepts valid cluster.attack and delay parameters', () => {
    const clusterValid = validateNodeParameters('cluster.attack', { target: 'https://example.com', rate: 200 });
    expect(clusterValid).toEqual([]);

    const delayValid = validateNodeParameters('delay', { duration: 5000 });
    expect(delayValid).toEqual([]);
  });

  it('rejects delay duration values below the minimum bound', () => {
    const errors = validateNodeParameters('delay', { duration: 5 });
    expect(errors).toContain('Delay duration must be an integer between 10 and 120000 ms.');
  });

  it('validates chaos.memory allocate mode amount bounds and allows clear mode', () => {
    const invalidAllocate = validateNodeParameters('chaos.memory', { action: 'allocate', amount: 0 });
    expect(invalidAllocate).toContain('Memory amount must be an integer between 1 and 4096 MB.');

    const clearMode = validateNodeParameters('chaos.memory', { action: 'clear' });
    expect(clearMode).toEqual([]);
  });

  it('accepts empty mtd.rotate prefix as an unset value', () => {
    const noPrefixErrors = validateNodeParameters('mtd.rotate', { prefix: '' });
    expect(noPrefixErrors).toEqual([]);
  });

  it('validates mtd.rotate prefix max length and valid values', () => {
    const tooLong = validateNodeParameters('mtd.rotate', { prefix: 'a'.repeat(49) });
    expect(tooLong).toContain('MTD prefix must be at most 48 characters.');

    const valid = validateNodeParameters('mtd.rotate', { prefix: 'api-v2' });
    expect(valid).toEqual([]);
  });

  it('migrates legacy chaos.memory mb field into amount when loading scenarios', () => {
    const payload: ScenarioBuilderPayload = {
      name: 'Legacy Memory',
      steps: [{ id: 'mem-legacy', action: 'chaos.memory', params: { mb: 256 } }],
    };
    const graph = scenarioPayloadToGraph(payload);
    expect(graph.nodes[0].data.params).toEqual({ action: 'allocate', amount: 256 });
  });

  it('normalizes string memory amount values to integers', () => {
    const payload: ScenarioBuilderPayload = {
      name: 'String Amount',
      steps: [{ id: 'mem-1', action: 'chaos.memory', params: { amount: '512.8' } }],
    };
    const graph = scenarioPayloadToGraph(payload);
    expect(graph.nodes[0].data.params).toEqual({ action: 'allocate', amount: 512 });
  });

  it('normalizes memory params directly for legacy and clear-mode shapes', () => {
    expect(normalizeNodeParams('chaos.memory', { mb: 200 })).toEqual({
      action: 'allocate',
      amount: 200,
    });
    expect(normalizeNodeParams('chaos.memory', { action: 'clear', amount: 300 })).toEqual({
      action: 'clear',
    });
  });

  it('defaults invalid non-numeric memory amount values during normalization', () => {
    const payload: ScenarioBuilderPayload = {
      name: 'Invalid Amount',
      steps: [{ id: 'mem-bad', action: 'chaos.memory', params: { amount: 'not-a-number' } }],
    };
    const graph = scenarioPayloadToGraph(payload);
    expect(graph.nodes[0].data.params).toEqual({ action: 'allocate', amount: 100 });
  });

  it('trims mtd.rotate prefix values during normalization', () => {
    const payload: ScenarioBuilderPayload = {
      name: 'Trim Prefix',
      steps: [{ id: 'mtd-1', action: 'mtd.rotate', params: { prefix: '  edge  ' } }],
    };
    const graph = scenarioPayloadToGraph(payload);
    expect(graph.nodes[0].data.params).toEqual({ prefix: 'edge' });
  });

  it('passes through params for actions without special normalization rules', () => {
    expect(normalizeNodeParams('chaos.cpu', { duration: 5000 })).toEqual({ duration: 5000 });
  });

  it('aggregates node parameter errors with node context', () => {
    const badCpuNode = makeNode({ id: 'cpu-1', x: 0, y: 0, action: 'chaos.cpu' });
    badCpuNode.data = {
      ...badCpuNode.data,
      params: { duration: 12 },
    };
    const nodes: ScenarioBuilderNode[] = [badCpuNode];

    const errors = validateScenarioNodeParams(nodes);
    expect(errors.some((error) => error.includes('cpu-1'))).toBe(true);
    expect(errors.some((error) => error.includes('CPU duration'))).toBe(true);
  });
});
