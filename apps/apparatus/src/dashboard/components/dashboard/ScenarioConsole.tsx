import { DragEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Plus, Save } from 'lucide-react';
import { addEdge, ReactFlowInstance, useEdgesState, useNodesState, type Connection, type Edge } from 'reactflow';
import { Button } from '../ui/Button';
import { useScenarios, Scenario, type ScenarioRunStatus } from '../../hooks/useScenarios';
import { ScenarioBuilderCanvas } from '../scenarios/ScenarioBuilderCanvas';
import { ScenarioBuilderConfigPanel } from '../scenarios/ScenarioBuilderConfigPanel';
import { ScenarioBuilderPalette } from '../scenarios/ScenarioBuilderPalette';
import {
  ScenarioAction,
  ScenarioBuilderNode,
  ScenarioBuilderPayload,
  ScenarioBuilderNodeData,
  createNodeDataForAction,
  createScenarioSnapshot,
  createNodeFromAction,
  getNextNodeFallbackPosition,
  graphToScenarioPayload,
  isScenarioAction,
  validateNodeParameters,
  validateScenarioNodeParams,
  scenarioPayloadToGraph,
  validateScenarioGraph,
} from '../scenarios/scenarioBuilder';

const DEFAULT_SCENARIO: ScenarioBuilderPayload = {
  name: 'New Attack Plan',
  description: 'Describe your attack sequence...',
  steps: [
    { id: 'step-1', action: 'chaos.cpu', params: { duration: 5000 }, delayMs: 1000 },
    { id: 'step-2', action: 'cluster.attack', params: { target: 'http://example.com', rate: 50 }, delayMs: 0 },
  ],
};

const DND_MIME = 'application/apparatus-scenario-action';
const RUN_STATUS_POLL_INTERVAL_MS = 1_500;
const RUN_NODE_HIGHLIGHT_STYLES = {
  running: {
    borderColor: 'rgba(56, 189, 248, 0.95)',
    boxShadow: '0 0 0 2px rgba(56, 189, 248, 0.6), 0 0 28px rgba(56, 189, 248, 0.35)',
  },
  completed: {
    borderColor: 'rgba(34, 197, 94, 0.95)',
    boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.6), 0 0 28px rgba(34, 197, 94, 0.35)',
  },
  failed: {
    borderColor: 'rgba(244, 63, 94, 0.95)',
    boxShadow: '0 0 0 2px rgba(244, 63, 94, 0.6), 0 0 28px rgba(244, 63, 94, 0.35)',
  },
} as const;

export function ScenarioConsole() {
  const { scenarios, saveScenario, runScenario, getScenarioRunStatus, isLoading } = useScenarios();
  const initialGraph = useMemo(() => scenarioPayloadToGraph(DEFAULT_SCENARIO), []);
  const initialPayload = useMemo(
    () =>
      graphToScenarioPayload({
        name: DEFAULT_SCENARIO.name,
        description: DEFAULT_SCENARIO.description,
        nodes: initialGraph.nodes,
        edges: initialGraph.edges,
      }),
    [initialGraph.edges, initialGraph.nodes]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<ScenarioBuilderNodeData>(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState(DEFAULT_SCENARIO.name);
  const [scenarioDescription, setScenarioDescription] = useState(DEFAULT_SCENARIO.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeRunScenarioId, setActiveRunScenarioId] = useState<string | null>(null);
  const [activeRunStatus, setActiveRunStatus] = useState<ScenarioRunStatus | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<ScenarioBuilderNodeData> | null>(null);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    createScenarioSnapshot(initialPayload, initialGraph.edges)
  );

  const payload = useMemo(
    () =>
      graphToScenarioPayload({
        id: selectedId ?? undefined,
        name: scenarioName,
        description: scenarioDescription,
        nodes,
        edges,
      }),
    [edges, nodes, scenarioDescription, scenarioName, selectedId]
  );
  const currentSnapshot = useMemo(() => createScenarioSnapshot(payload, edges), [edges, payload]);
  const hasUnsavedChanges = currentSnapshot !== baselineSnapshot;
  const jsonPreview = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected), [nodes]);
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const hasMultiSelection = selectedNodes.length > 1;
  const selectedNodeId = selectedNode?.id ?? null;
  const selectedNodeData = selectedNode?.data;
  const selectedNodeErrors = useMemo(() => {
    if (!selectedNodeData) return [];
    return validateNodeParameters(selectedNodeData.action, selectedNodeData.params, selectedNodeData.delayMs);
  }, [selectedNodeData]);
  const runtimeDecoratedNodes = useMemo(() => {
    if (!activeRunStatus?.currentStepId) return nodes;
    const highlight = RUN_NODE_HIGHLIGHT_STYLES[activeRunStatus.status];
    return nodes.map((node) => {
      if (node.id !== activeRunStatus.currentStepId) return node;
      return {
        ...node,
        style: {
          ...node.style,
          ...highlight,
        },
      };
    });
  }, [nodes, activeRunStatus]);

  const flowValidationErrors = useMemo(() => validateScenarioGraph(nodes, edges), [edges, nodes]);
  const paramValidationErrors = useMemo(() => validateScenarioNodeParams(nodes), [nodes]);
  const validationErrors = useMemo(() => {
    const issues: string[] = [];
    if (!scenarioName.trim()) issues.push('Scenario name is required.');
    if (nodes.length === 0) issues.push('Add at least one tool block to the canvas.');
    issues.push(...flowValidationErrors);
    issues.push(...paramValidationErrors);
    return issues;
  }, [flowValidationErrors, nodes, paramValidationErrors, scenarioName]);

  const confirmDiscardChanges = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    return window.confirm('Discard unsaved scenario builder changes?');
  }, [hasUnsavedChanges]);

  const applyBuilderState = useCallback((args: {
    selectedId: string | null;
    payload: ScenarioBuilderPayload;
    nodes: ScenarioBuilderNode[];
    edges: Edge[];
  }) => {
    setSelectedId(args.selectedId);
    setScenarioName(args.payload.name);
    setScenarioDescription(args.payload.description ?? '');
    setNodes(args.nodes);
    setEdges(args.edges);
    setBaselineSnapshot(createScenarioSnapshot(args.payload, args.edges));
    setActiveRunScenarioId(null);
    setActiveRunStatus(null);
    setError(null);
    setSuccess(null);
  }, [setEdges, setNodes]);

  const addNode = useCallback(
    (action: ScenarioAction, position?: { x: number; y: number }) => {
      setNodes((currentNodes) => [
        ...currentNodes,
        createNodeFromAction(action, position ?? getNextNodeFallbackPosition(currentNodes.length)),
      ]);
    },
    [setNodes]
  );

  const resetBuilder = useCallback(() => {
    if (!confirmDiscardChanges()) return;
    const graph = scenarioPayloadToGraph(DEFAULT_SCENARIO);
    const baselinePayload = graphToScenarioPayload({
      name: DEFAULT_SCENARIO.name,
      description: DEFAULT_SCENARIO.description,
      nodes: graph.nodes,
      edges: graph.edges,
    });
    applyBuilderState({
      selectedId: null,
      payload: baselinePayload,
      nodes: graph.nodes,
      edges: graph.edges,
    });
  }, [applyBuilderState, confirmDiscardChanges]);

  const handleSave = useCallback(async () => {
    setError(null);
    setSuccess(null);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }
    try {
      const savedScenario = await saveScenario(payload);
      const savedId = savedScenario?.id ?? payload.id;
      if (savedId) {
        setSelectedId(savedId);
      }
      setBaselineSnapshot(createScenarioSnapshot({ ...payload, id: savedId }, edges));
      setSuccess('Scenario saved successfully.');
    } catch (saveError) {
      console.error(saveError);
      setError('Failed to save scenario.');
    }
  }, [edges, payload, saveScenario, scenarioDescription, scenarioName, validationErrors]);

  const handleRun = useCallback(async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      const start = await runScenario(id);
      const scenarioNameFromLibrary = scenarios.find((scenario) => scenario.id === id)?.name ?? scenarioName;
      setActiveRunScenarioId(id);
      setActiveRunStatus({
        executionId: start.executionId,
        scenarioId: id,
        scenarioName: scenarioNameFromLibrary,
        status: 'running',
        startedAt: new Date().toISOString(),
      });
      setSuccess(`Scenario started (${start.executionId}). Tracking execution graph.`);
    } catch (runError) {
      console.error(runError);
      setError('Failed to start scenario.');
    }
  }, [runScenario, scenarioName, scenarios]);

  const handleRunSelected = useCallback(() => {
    if (!selectedId) {
      setError('Save and select a scenario from the library before running.');
      return;
    }
    void handleRun(selectedId);
  }, [handleRun, selectedId]);

  const loadScenario = useCallback((s: Scenario) => {
    if (!confirmDiscardChanges()) return;
    try {
      const incomingPayload: ScenarioBuilderPayload = {
        id: s.id,
        name: s.name.trim(),
        description: s.description?.trim() || undefined,
        steps: s.steps,
      };
      const graph = scenarioPayloadToGraph(incomingPayload);
      applyBuilderState({
        selectedId: s.id,
        payload: incomingPayload,
        nodes: graph.nodes,
        edges: graph.edges,
      });
    } catch (loadError) {
      console.error(loadError);
      setError('Failed to load scenario graph. The saved payload may be malformed.');
    }
  }, [applyBuilderState, confirmDiscardChanges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: 'rgba(56, 189, 248, 0.75)', strokeWidth: 1.5 },
          },
          currentEdges
        )
      );
    },
    [setEdges]
  );

  const updateSelectedNode = useCallback(
    (updater: (node: ScenarioBuilderNode) => ScenarioBuilderNode) => {
      if (!selectedNodeId) return;
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== selectedNodeId) return node;
          return updater(node);
        })
      );
    },
    [selectedNodeId, setNodes]
  );

  const handleSelectedActionChange = useCallback(
    (action: ScenarioAction) => {
      updateSelectedNode((node) => {
        const nextData = createNodeDataForAction(action);
        return {
          ...node,
          data: {
            ...nextData,
            delayMs: node.data.delayMs ?? nextData.delayMs,
          },
        };
      });
    },
    [updateSelectedNode]
  );

  const handleSelectedDelayMsChange = useCallback(
    (value: number) => {
      updateSelectedNode((node) => ({
        ...node,
        data: {
          ...node.data,
          delayMs: Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0,
        },
      }));
    },
    [updateSelectedNode]
  );

  const handleSelectedParamChange = useCallback(
    (key: string, value: string | number) => {
      updateSelectedNode((node) => {
        const nextParams = { ...node.data.params };
        if (key === 'prefix' && typeof value === 'string' && value.trim().length === 0) {
          delete nextParams.prefix;
        } else {
          const normalizedValue =
            typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : value;
          nextParams[key] = normalizedValue;
        }
        return {
          ...node,
          data: {
            ...node.data,
            params: nextParams,
          },
        };
      });
    },
    [updateSelectedNode]
  );

  const handleSelectedMemoryModeChange = useCallback(
    (mode: 'allocate' | 'clear') => {
      updateSelectedNode((node) => ({
        ...node,
        data: {
          ...node.data,
          params:
            mode === 'clear'
              ? { action: 'clear' }
              : {
                  action: 'allocate',
                  amount: typeof node.data.params.amount === 'number' ? node.data.params.amount : 100,
                },
        },
      }));
    },
    [updateSelectedNode]
  );

  const handlePaletteDragStart = useCallback((event: DragEvent<HTMLDivElement>, action: ScenarioAction) => {
    event.dataTransfer.setData(DND_MIME, action);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleCanvasDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleCanvasDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const droppedAction = event.dataTransfer.getData(DND_MIME);
      if (!isScenarioAction(droppedAction) || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(droppedAction, position);
    },
    [addNode, reactFlowInstance]
  );

  useEffect(() => {
    if (!activeRunScenarioId || !activeRunStatus || activeRunStatus.status !== 'running') return;
    const { executionId } = activeRunStatus;

    let isStopped = false;
    const pollRunStatus = async () => {
      try {
        const nextStatus = await getScenarioRunStatus(activeRunScenarioId, executionId);
        if (!isStopped) {
          setActiveRunStatus(nextStatus);
        }
      } catch (pollError) {
        console.error(pollError);
        if (isStopped) return;
        setActiveRunStatus((current) =>
          current
            ? {
                ...current,
                status: 'failed',
                error: 'Status polling failed before execution reached a terminal state.',
              }
            : current
        );
      }
    };

    void pollRunStatus();
    const pollTimer = window.setInterval(() => {
      void pollRunStatus();
    }, RUN_STATUS_POLL_INTERVAL_MS);

    return () => {
      isStopped = true;
      window.clearInterval(pollTimer);
    };
  }, [activeRunScenarioId, activeRunStatus?.executionId, activeRunStatus?.status, getScenarioRunStatus]);

  useEffect(() => {
    if (!activeRunStatus || activeRunStatus.status === 'running') return;
    if (activeRunStatus.status === 'completed') {
      setSuccess(
        `Scenario completed (${activeRunStatus.executionId})${activeRunStatus.currentStepId ? ` at ${activeRunStatus.currentStepId}` : ''}.`
      );
      return;
    }
    setError(
      activeRunStatus.error
        ? `Scenario failed (${activeRunStatus.executionId}): ${activeRunStatus.error}`
        : `Scenario failed (${activeRunStatus.executionId}).`
    );
  }, [activeRunStatus]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Scenario Engine</h1>
        <p className="text-neutral-400 text-sm mt-1 ml-2">Visual Attack/Chaos Architect for drag-and-drop scenario design.</p>
        {error && (
          <div role="alert" aria-live="assertive" className="mt-2 text-danger-400 text-xs font-mono bg-danger-900/20 p-2 rounded border border-danger-900/50">
            {error}
          </div>
        )}
        {success && (
          <div role="alert" aria-live="polite" className="mt-2 text-success-400 text-xs font-mono bg-success-900/20 p-2 rounded border border-success-900/50">
            {success}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={resetBuilder}>
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
        <Button size="sm" variant="primary" onClick={() => void handleSave()} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button size="sm" variant="secondary" onClick={handleRunSelected} disabled={!selectedId}>
          <Play className="h-4 w-4 mr-2" />
          Run Selected
        </Button>
      </div>
      {!selectedId && <div className="text-[11px] text-neutral-500 font-mono">Save and select a scenario from the library to enable running.</div>}
      {hasUnsavedChanges && <div className="text-[11px] text-warning-400 font-mono">Unsaved changes in builder.</div>}
      {activeRunStatus && (
        <div
          role={activeRunStatus.status === 'failed' ? 'alert' : 'status'}
          aria-live={activeRunStatus.status === 'running' ? 'polite' : 'assertive'}
          className={
            activeRunStatus.status === 'failed'
              ? 'text-[11px] text-danger-300 font-mono bg-danger-900/20 p-2 rounded border border-danger-900/50'
              : activeRunStatus.status === 'completed'
                ? 'text-[11px] text-success-300 font-mono bg-success-900/20 p-2 rounded border border-success-900/50'
                : 'text-[11px] text-primary-300 font-mono bg-primary-900/20 p-2 rounded border border-primary-900/50'
          }
        >
          <div>
            Execution `{activeRunStatus.executionId}` for {activeRunStatus.scenarioName}: {activeRunStatus.status}
          </div>
          {activeRunStatus.currentStepId && <div>Current step: {activeRunStatus.currentStepId}</div>}
          {activeRunStatus.error && <div>Error: {activeRunStatus.error}</div>}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
        <ScenarioBuilderPalette
          scenarios={scenarios}
          selectedId={selectedId}
          onSelectScenario={loadScenario}
          onRunScenario={handleRun}
          onAddNode={addNode}
          onPaletteDragStart={handlePaletteDragStart}
        />
        <ScenarioBuilderCanvas
          nodes={runtimeDecoratedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onInit={setReactFlowInstance}
          hasValidationErrors={flowValidationErrors.length > 0}
        />
        <ScenarioBuilderConfigPanel
          scenarioName={scenarioName}
          scenarioDescription={scenarioDescription}
          validationErrors={validationErrors}
          jsonPreview={jsonPreview}
          selectedNode={selectedNode}
          hasMultiSelection={hasMultiSelection}
          selectedNodeErrors={selectedNodeErrors}
          onScenarioNameChange={setScenarioName}
          onScenarioDescriptionChange={setScenarioDescription}
          onSelectedActionChange={handleSelectedActionChange}
          onSelectedDelayMsChange={handleSelectedDelayMsChange}
          onSelectedParamChange={handleSelectedParamChange}
          onSelectedMemoryModeChange={handleSelectedMemoryModeChange}
        />
      </div>
    </div>
  );
}
