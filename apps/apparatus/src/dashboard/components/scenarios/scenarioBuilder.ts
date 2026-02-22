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
    defaults: { action: 'allocate', amount: 100 },
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

export const SCENARIO_PARAMETER_LIMITS = {
  postStepDelayMs: { min: 0, max: 120_000 },
  chaosCpuDurationMs: { min: 250, max: 120_000 },
  chaosMemoryAmountMb: { min: 1, max: 4096 },
  clusterAttackRate: { min: 1, max: 2000 },
  delayDurationMs: { min: 10, max: 120_000 },
  mtdPrefixMaxLength: 48,
} as const;

export function isScenarioAction(value: string): value is ScenarioAction {
  return SCENARIO_ACTION_BLUEPRINTS.some((blueprint) => blueprint.action === value);
}

export function createNodeDataForAction(action: ScenarioAction): ScenarioBuilderNodeData {
  const blueprint = SCENARIO_ACTION_BLUEPRINTS.find((entry) => entry.action === action);
  return {
    action,
    label: blueprint?.label ?? action,
    params: { ...(blueprint?.defaults ?? {}) },
    delayMs: blueprint?.delayMs,
  };
}

export function normalizeNodeParams(action: ScenarioAction, params: Record<string, unknown>): Record<string, unknown> {
  if (action === 'chaos.memory') {
    const mode = params.action === 'clear' ? 'clear' : 'allocate';
    if (mode === 'clear') return { action: 'clear' };

    const parsedAmount = parseNumber(params.amount ?? params.mb);
    const amountCandidate = parsedAmount !== null ? Math.trunc(parsedAmount) : 100;
    return {
      action: 'allocate',
      amount: amountCandidate,
    };
  }

  if (action === 'mtd.rotate') {
    if (typeof params.prefix === 'string') {
      const trimmedPrefix = params.prefix.trim();
      if (trimmedPrefix.length === 0) {
        const { prefix: _ignoredPrefix, ...rest } = params;
        return rest;
      }
      return {
        ...params,
        prefix: trimmedPrefix,
      };
    }
    if (params.prefix !== undefined) {
      const { prefix: _invalidPrefix, ...rest } = params;
      return rest;
    }
  }

  return { ...params };
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

export function validateScenarioGraph(nodes: ScenarioBuilderNode[], edges: Edge[]): string[] {
  if (nodes.length === 0) return [];

  const errors = new Set<string>();
  const nodeIds = new Set(nodes.map((node) => node.id));
  const incoming = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  let validEdgesCount = 0;

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.add('Graph contains invalid edge references.');
      continue;
    }
    validEdgesCount += 1;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }

  const incomingOverLimit = Array.from(incoming.values()).some((count) => count > 1);
  if (incomingOverLimit) {
    errors.add('Sequential mode allows only one incoming edge per step.');
  }

  const outgoingOverLimit = Array.from(outgoing.values()).some((targets) => targets.length > 1);
  if (outgoingOverLimit) {
    errors.add('Sequential mode allows only one outgoing edge per step.');
  }

  const startNodes = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0);
  if (startNodes.length !== 1) {
    errors.add('Graph must have exactly one starting step.');
  }

  if (validEdgesCount !== nodes.length - 1) {
    errors.add('Graph must connect all steps in a single execution chain.');
  }

  const traversed = new Set<string>();
  const inStack = new Set<string>();
  const visitForCycle = (nodeId: string): boolean => {
    if (inStack.has(nodeId)) return true;
    if (traversed.has(nodeId)) return false;
    traversed.add(nodeId);
    inStack.add(nodeId);
    const nextTargets: string[] = outgoing.get(nodeId) ?? [];
    for (const nextTargetId of nextTargets) {
      if (visitForCycle(nextTargetId)) return true;
    }
    inStack.delete(nodeId);
    return false;
  };
  const hasCycle = nodes.some((node) => visitForCycle(node.id));
  if (hasCycle) {
    errors.add('Graph cannot contain execution cycles.');
  }

  // Traversal assumes a single entrypoint chain. Multiple/no starts already emit validation errors above.
  if (startNodes.length === 1) {
    const visited = new Set<string>();
    let cursorId: string | undefined = startNodes[0].id;

    while (cursorId) {
      if (visited.has(cursorId)) break;
      visited.add(cursorId);
      const nextTargets: string[] = outgoing.get(cursorId) ?? [];
      cursorId = nextTargets[0];
    }

    if (visited.size !== nodes.length) {
      errors.add('Graph contains disconnected steps.');
    }
  }

  return Array.from(errors);
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isIntegerInRange(value: unknown, min: number, max: number): boolean {
  const parsed = parseNumber(value);
  return parsed !== null && Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateNodeParameters(
  action: ScenarioAction,
  params: Record<string, unknown>,
  delayMs?: number
): string[] {
  const normalizedParams = normalizeNodeParams(action, params);
  const errors: string[] = [];

  if (
    delayMs !== undefined &&
    !isIntegerInRange(delayMs, SCENARIO_PARAMETER_LIMITS.postStepDelayMs.min, SCENARIO_PARAMETER_LIMITS.postStepDelayMs.max)
  ) {
    errors.push(
      `Post-step delay must be an integer between ${SCENARIO_PARAMETER_LIMITS.postStepDelayMs.min} and ${SCENARIO_PARAMETER_LIMITS.postStepDelayMs.max} ms.`
    );
  }

  switch (action) {
    case 'chaos.cpu':
      if (
        !isIntegerInRange(
          normalizedParams.duration,
          SCENARIO_PARAMETER_LIMITS.chaosCpuDurationMs.min,
          SCENARIO_PARAMETER_LIMITS.chaosCpuDurationMs.max
        )
      ) {
        errors.push(
          `CPU duration must be an integer between ${SCENARIO_PARAMETER_LIMITS.chaosCpuDurationMs.min} and ${SCENARIO_PARAMETER_LIMITS.chaosCpuDurationMs.max} ms.`
        );
      }
      break;
    case 'chaos.memory': {
      const mode = normalizedParams.action === 'clear' ? 'clear' : 'allocate';
      if (
        mode === 'allocate' &&
        !isIntegerInRange(
          normalizedParams.amount,
          SCENARIO_PARAMETER_LIMITS.chaosMemoryAmountMb.min,
          SCENARIO_PARAMETER_LIMITS.chaosMemoryAmountMb.max
        )
      ) {
        errors.push(
          `Memory amount must be an integer between ${SCENARIO_PARAMETER_LIMITS.chaosMemoryAmountMb.min} and ${SCENARIO_PARAMETER_LIMITS.chaosMemoryAmountMb.max} MB.`
        );
      }
      break;
    }
    case 'cluster.attack':
      if (!isHttpUrl(normalizedParams.target)) {
        errors.push('Cluster target must be a valid http/https URL.');
      }
      if (
        !isIntegerInRange(
          normalizedParams.rate,
          SCENARIO_PARAMETER_LIMITS.clusterAttackRate.min,
          SCENARIO_PARAMETER_LIMITS.clusterAttackRate.max
        )
      ) {
        errors.push(
          `Cluster rate must be an integer between ${SCENARIO_PARAMETER_LIMITS.clusterAttackRate.min} and ${SCENARIO_PARAMETER_LIMITS.clusterAttackRate.max}.`
        );
      }
      break;
    case 'mtd.rotate':
      if (normalizedParams.prefix !== undefined) {
        if (typeof normalizedParams.prefix !== 'string' || normalizedParams.prefix.trim().length === 0) {
          errors.push('MTD prefix must be a non-empty string when provided.');
        } else if (normalizedParams.prefix.length > SCENARIO_PARAMETER_LIMITS.mtdPrefixMaxLength) {
          errors.push(`MTD prefix must be at most ${SCENARIO_PARAMETER_LIMITS.mtdPrefixMaxLength} characters.`);
        }
      }
      break;
    case 'delay':
      if (
        !isIntegerInRange(
          normalizedParams.duration,
          SCENARIO_PARAMETER_LIMITS.delayDurationMs.min,
          SCENARIO_PARAMETER_LIMITS.delayDurationMs.max
        )
      ) {
        errors.push(
          `Delay duration must be an integer between ${SCENARIO_PARAMETER_LIMITS.delayDurationMs.min} and ${SCENARIO_PARAMETER_LIMITS.delayDurationMs.max} ms.`
        );
      }
      break;
    default:
      break;
  }

  return errors;
}

export function validateScenarioNodeParams(nodes: ScenarioBuilderNode[]): string[] {
  const errors: string[] = [];
  for (const node of nodes) {
    const nodeErrors = validateNodeParameters(node.data.action, node.data.params, node.data.delayMs);
    for (const error of nodeErrors) {
      errors.push(`${node.data.label} (${node.id}): ${error}`);
    }
  }
  return errors;
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
  return {
    id: makeNodeId(),
    type: 'default',
    position,
    data: createNodeDataForAction(action),
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
      params: normalizeNodeParams(step.action, step.params),
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
