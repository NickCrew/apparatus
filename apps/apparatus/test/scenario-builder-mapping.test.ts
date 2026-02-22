import { describe, expect, it } from 'vitest';
import type { Edge } from 'reactflow';
import {
  graphToScenarioPayload,
  scenarioPayloadToGraph,
  type ScenarioAction,
  type ScenarioBuilderNode,
  type ScenarioBuilderPayload,
  validateScenarioGraph,
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
});
