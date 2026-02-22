import type { Edge, Node, XYPosition } from 'reactflow';

export type ScenarioAction = 'chaos.cpu' | 'chaos.memory' | 'cluster.attack' | 'mtd.rotate' | 'delay';

export interface ScenarioBuilderStep {
  id: string;
  action: ScenarioAction;
  params: Record<string, unknown>;
  delayMs?: number;
}

export interface ScenarioBuilderPayload {
  id?: string;
  name: string;
  description?: string;
  steps: ScenarioBuilderStep[];
}

export interface ScenarioBuilderNodeData {
  label: string;
  action: ScenarioAction;
  params: Record<string, unknown>;
  delayMs?: number;
}

export type ScenarioBuilderNode = Node<ScenarioBuilderNodeData>;

const NODE_FALLBACK_START = { x: 120, y: 100 };
const NODE_FALLBACK_OFFSET = { x: 26, y: 18 };

interface ActionBlueprint {
  action: ScenarioAction;
  label: string;
  description: string;
  defaults: Record<string, unknown>;
  delayMs?: number;
  className: string;
}

export const SCENARIO_ACTION_BLUEPRINTS: ActionBlueprint[] = [
  {
    action: 'chaos.cpu',
    label: 'Chaos Spike',
    description: 'Trigger a CPU spike for resilience pressure.',
    defaults: { duration: 5_000 },
    delayMs: 1_000,
    className: 'ring-danger-500/30',
  },
  {
    action: 'chaos.memory',
    label: 'Memory Surge',
    description: 'Allocate memory stress in MB.',
    defaults: { mb: 256 },
    delayMs: 1_000,
    className: 'ring-warning-500/30',
  },
  {
    action: 'cluster.attack',
    label: 'Attack Cluster',
    description: 'Coordinate distributed attack traffic.',
    defaults: { target: 'http://example.com', rate: 50 },
    className: 'ring-primary-500/30',
  },
  {
    action: 'mtd.rotate',
    label: 'MTD Rotation',
    description: 'Rotate moving-target defense controls.',
    defaults: {},
    className: 'ring-info-500/30',
  },
  {
    action: 'delay',
    label: 'Network Delay',
    description: 'Insert a pause between scenario steps.',
    defaults: { duration: 1_000 },
    className: 'ring-neutral-500/40',
  },
];

export function isScenarioAction(value: string): value is ScenarioAction {
  return SCENARIO_ACTION_BLUEPRINTS.some((blueprint) => blueprint.action === value);
}

export function getNextNodeFallbackPosition(nodeCount: number): XYPosition {
  return {
    x: NODE_FALLBACK_START.x + nodeCount * NODE_FALLBACK_OFFSET.x,
    y: NODE_FALLBACK_START.y + nodeCount * NODE_FALLBACK_OFFSET.y,
  };
}

export function getEdgeSignature(edges: Array<Pick<Edge, 'source' | 'target'>>): string {
  return edges
    .map((edge) => `${edge.source}->${edge.target}`)
    .sort()
    .join('|');
}

export function createScenarioSnapshot(payload: ScenarioBuilderPayload, edges: Array<Pick<Edge, 'source' | 'target'>>): string {
  return JSON.stringify({
    payload,
    edgeSignature: getEdgeSignature(edges),
  });
}

const NODE_BASE_STYLE = {
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(148, 163, 184, 0.4)',
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  color: 'rgba(226, 232, 240, 1)',
  padding: '8px 10px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '11px',
  minWidth: 170,
  boxShadow: '0 0 0 1px rgba(14, 116, 144, 0.1), 0 10px 20px -15px rgba(14, 116, 144, 0.6)',
} as const;

function makeNodeId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getBlueprint(action: ScenarioAction) {
  return SCENARIO_ACTION_BLUEPRINTS.find((entry) => entry.action === action);
}

export function createNodeFromAction(action: ScenarioAction, position: XYPosition): ScenarioBuilderNode {
  const blueprint = getBlueprint(action);
  return {
    id: makeNodeId(),
    type: 'default',
    position,
    data: {
      action,
      label: blueprint?.label ?? action,
      params: { ...(blueprint?.defaults ?? {}) },
      delayMs: blueprint?.delayMs,
    },
    style: NODE_BASE_STYLE,
  };
}

export function graphToScenarioPayload(args: {
  id?: string;
  name: string;
  description?: string;
  nodes: ScenarioBuilderNode[];
  edges?: Edge[];
}): ScenarioBuilderPayload {
  const positionSortedNodes = [...args.nodes].sort((left, right) => {
    if (left.position.x !== right.position.x) return left.position.x - right.position.x;
    return left.position.y - right.position.y;
  });

  const nodeById = new Map(positionSortedNodes.map((node) => [node.id, node]));
  const edges = (args.edges ?? []).filter((edge) => nodeById.has(edge.source) && nodeById.has(edge.target));

  const incomingCounts = new Map<string, number>(positionSortedNodes.map((node) => [node.id, 0]));
  const outgoingBySource = new Map<string, string[]>();
  for (const edge of edges) {
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
    const outgoingTargets = outgoingBySource.get(edge.source) ?? [];
    outgoingTargets.push(edge.target);
    outgoingBySource.set(edge.source, outgoingTargets);
  }

  for (const [source, targets] of outgoingBySource.entries()) {
    targets.sort((leftId, rightId) => {
      const left = nodeById.get(leftId);
      const right = nodeById.get(rightId);
      if (!left || !right) return 0;
      if (left.position.x !== right.position.x) return left.position.x - right.position.x;
      return left.position.y - right.position.y;
    });
    outgoingBySource.set(source, targets);
  }

  const orderedNodes: ScenarioBuilderNode[] = [];
  const visited = new Set<string>();

  const startNodeIds = positionSortedNodes
    .map((node) => node.id)
    .filter((id) => (incomingCounts.get(id) ?? 0) === 0);
  const traversalStarts = startNodeIds.length > 0 ? startNodeIds : positionSortedNodes.map((node) => node.id);

  for (const startId of traversalStarts) {
    let cursorId: string | undefined = startId;
    while (cursorId && !visited.has(cursorId)) {
      const node = nodeById.get(cursorId);
      if (!node) break;
      orderedNodes.push(node);
      visited.add(cursorId);

      const nextTargets: string[] = outgoingBySource.get(cursorId) ?? [];
      cursorId = nextTargets.find((targetId: string) => !visited.has(targetId));
    }
  }

  for (const node of positionSortedNodes) {
    if (!visited.has(node.id)) {
      orderedNodes.push(node);
      visited.add(node.id);
    }
  }

  return {
    id: args.id,
    name: args.name.trim(),
    description: args.description?.trim() || undefined,
    steps: orderedNodes.map((node) => ({
      id: node.id,
      action: node.data.action,
      params: node.data.params,
      delayMs: node.data.delayMs,
    })),
  };
}

export function scenarioPayloadToGraph(payload: ScenarioBuilderPayload): {
  nodes: ScenarioBuilderNode[];
  edges: Edge[];
} {
  const nodes: ScenarioBuilderNode[] = payload.steps.map((step, index) => ({
    id: step.id,
    type: 'default',
    position: {
      x: 90 + index * 220,
      y: 120 + (index % 2) * 100,
    },
    data: {
      action: step.action,
      label: getBlueprint(step.action)?.label ?? step.action,
      params: step.params,
      delayMs: step.delayMs,
    },
    style: NODE_BASE_STYLE,
  }));

  const edges: Edge[] = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    edges.push({
      id: `e-${nodes[index].id}-${nodes[index + 1].id}`,
      source: nodes[index].id,
      target: nodes[index + 1].id,
      animated: true,
      style: { stroke: 'rgba(0, 170, 255, 0.7)' },
    });
  }

  return { nodes, edges };
}
