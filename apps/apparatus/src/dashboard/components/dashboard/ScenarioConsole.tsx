import { DragEvent, useCallback, useMemo, useRef, useState } from 'react';
import { FileJson, Play, Plus, Save } from 'lucide-react';
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
  type Connection,
} from 'reactflow';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useScenarios, Scenario } from '../../hooks/useScenarios';
import { cn } from '../ui/cn';
import { Input } from '../ui/Input';
import {
  SCENARIO_ACTION_BLUEPRINTS,
  ScenarioAction,
  ScenarioBuilderPayload,
  ScenarioBuilderNodeData,
  createNodeFromAction,
  graphToScenarioPayload,
  isScenarioAction,
  scenarioPayloadToGraph,
} from '../scenarios/scenarioBuilder';
import 'reactflow/dist/style.css';

const DEFAULT_SCENARIO: ScenarioBuilderPayload = {
  name: 'New Attack Plan',
  description: 'Describe your attack sequence...',
  steps: [
    { id: 'step-1', action: 'chaos.cpu', params: { duration: 5000 }, delayMs: 1000 },
    { id: 'step-2', action: 'cluster.attack', params: { target: 'http://example.com', rate: 50 }, delayMs: 0 },
  ],
};

const DND_MIME = 'application/apparatus-scenario-action';

function getEdgeSignature(edges: { source: string; target: string }[]) {
  return edges
    .map((edge) => `${edge.source}->${edge.target}`)
    .sort()
    .join('|');
}

export function ScenarioConsole() {
  const { scenarios, saveScenario, runScenario, isLoading } = useScenarios();
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
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<ScenarioBuilderNodeData> | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    JSON.stringify({
      payload: initialPayload,
      edgeSignature: getEdgeSignature(initialGraph.edges),
    })
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
  const edgeSignature = useMemo(() => getEdgeSignature(edges), [edges]);
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        payload,
        edgeSignature,
      }),
    [edgeSignature, payload]
  );
  const hasUnsavedChanges = currentSnapshot !== baselineSnapshot;
  const jsonPreview = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const validationErrors = useMemo(() => {
    const issues: string[] = [];
    if (!scenarioName.trim()) issues.push('Scenario name is required.');
    if (nodes.length === 0) issues.push('Add at least one tool block to the canvas.');
    return issues;
  }, [nodes, scenarioName]);

  const confirmDiscardChanges = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    return window.confirm('Discard unsaved scenario builder changes?');
  }, [hasUnsavedChanges]);

  const addNode = useCallback(
    (action: ScenarioAction, position?: { x: number; y: number }) => {
      setNodes((currentNodes) => [
        ...currentNodes,
        createNodeFromAction(action, position ?? { x: 120 + currentNodes.length * 26, y: 100 + currentNodes.length * 18 }),
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
    setSelectedId(null);
    setScenarioName(DEFAULT_SCENARIO.name);
    setScenarioDescription(DEFAULT_SCENARIO.description ?? '');
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setBaselineSnapshot(
      JSON.stringify({
        payload: baselinePayload,
        edgeSignature: getEdgeSignature(graph.edges),
      })
    );
    setError(null);
    setSuccess(null);
  }, [confirmDiscardChanges, setEdges, setNodes]);

  const handleSave = async () => {
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
      setBaselineSnapshot(
        JSON.stringify({
          payload: {
            ...payload,
            id: savedId,
          },
          edgeSignature,
        })
      );
      setSuccess('Scenario saved successfully.');
    } catch (saveError) {
      console.error(saveError);
      setError('Failed to save scenario.');
    }
  };

  const handleRun = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await runScenario(id);
      setSuccess('Scenario started! Monitor logs for progress.');
    } catch (runError) {
      console.error(runError);
      setError('Failed to start scenario.');
    }
  };

  const handleRunSelected = () => {
    if (!selectedId) {
      setError('Save and select a scenario from the library before running.');
      return;
    }
    void handleRun(selectedId);
  };

  const loadScenario = (s: Scenario) => {
    if (!confirmDiscardChanges()) return;
    try {
      const incomingPayload: ScenarioBuilderPayload = {
        id: s.id,
        name: s.name.trim(),
        description: s.description?.trim() || undefined,
        steps: s.steps,
      };
      const graph = scenarioPayloadToGraph(incomingPayload);
      setSelectedId(s.id);
      setScenarioName(incomingPayload.name);
      setScenarioDescription(incomingPayload.description ?? '');
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setBaselineSnapshot(
        JSON.stringify({
          payload: incomingPayload,
          edgeSignature: getEdgeSignature(graph.edges),
        })
      );
      setError(null);
      setSuccess(null);
    } catch (loadError) {
      console.error(loadError);
      setError('Failed to load scenario graph. The saved payload may be malformed.');
    }
  };

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 font-mono">Scenario Engine</h1>
        <p className="text-neutral-400 text-sm mt-1">Visual Attack/Chaos Architect for drag-and-drop scenario design.</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
        <Card variant="panel" glow="primary" className="flex flex-col xl:col-span-3 min-h-0">
          <CardHeader className="flex-none border-b border-neutral-800 pb-3">
            <CardTitle className="text-sm font-mono">Library + Tool Blocks</CardTitle>
          </CardHeader>
          <CardContent className="mt-0 p-0 flex-1 overflow-y-auto">
            <div className="p-4 border-b border-neutral-800/80 space-y-3">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">Palette</div>
              <div className="space-y-2">
                {SCENARIO_ACTION_BLUEPRINTS.map((blueprint) => (
                  <div
                    key={blueprint.action}
                    draggable
                    onDragStart={(event) => handlePaletteDragStart(event, blueprint.action)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Drag or add ${blueprint.label}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        addNode(blueprint.action);
                      }
                    }}
                    className={cn(
                      'rounded-sm border border-neutral-700/80 bg-neutral-900/70 p-3 cursor-grab active:cursor-grabbing hover:border-primary-500/60 transition-colors',
                      blueprint.className
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-neutral-200 font-mono">{blueprint.label}</div>
                        <div className="text-[11px] text-neutral-500 mt-1">{blueprint.description}</div>
                        <div className="text-[10px] text-primary-400 mt-2 font-mono">{blueprint.action}</div>
                      </div>
                      <Button size="sm" variant="ghost" aria-label={`Add ${blueprint.label} block`} onClick={() => addNode(blueprint.action)}>
                        Add
                      </Button>
                    </div>
                </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-neutral-800/50">
              {scenarios.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'p-4 hover:bg-neutral-900/50 flex justify-between items-center group cursor-pointer transition-colors border-l-2',
                    selectedId === s.id ? 'bg-neutral-900/80 border-primary-500' : 'border-transparent'
                  )}
                  onClick={() => loadScenario(s)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      loadScenario(s);
                    }
                  }}
                >
                  <div className="flex-1">
                    <div className={cn('font-bold text-sm', selectedId === s.id ? 'text-primary-400' : 'text-neutral-300')}>{s.name}</div>
                    <div className="text-xs text-neutral-500">{s.steps.length} steps</div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleRun(s.id);
                    }}
                  >
                    <Play className="h-4 w-4 text-success-500" />
                  </Button>
                </div>
              ))}
              {scenarios.length === 0 && <div className="p-8 text-center text-neutral-500 text-xs font-mono">No scenarios saved.</div>}
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" glow="primary" className="xl:col-span-6 flex flex-col min-h-0">
          <CardHeader className="flex-none border-b border-white/5 pb-3">
            <CardTitle className="flex items-center gap-2">
              Attack/Chaos Architect Canvas
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-0 p-0 flex-1 min-h-0">
            <div
              ref={flowWrapperRef}
              role="region"
              aria-label="Scenario flow canvas"
              aria-roledescription="Drag-and-drop scenario builder canvas"
              className="w-full h-full min-h-[420px] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_rgba(2,6,23,0.95)_52%)]"
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={handleCanvasDrop}
                onDragOver={handleCanvasDragOver}
                onInit={setReactFlowInstance}
                fitView
              >
                <Background color="rgba(148,163,184,0.25)" gap={20} size={1} />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={() => 'rgba(56, 189, 248, 0.9)'}
                  style={{ background: 'rgba(2, 6, 23, 0.85)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                />
                <Controls />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        <Card variant="panel" glow="none" className="xl:col-span-3 flex flex-col min-h-0">
          <CardHeader className="flex-none border-b border-neutral-800 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileJson className="h-4 w-4 text-primary-500" />
              Scenario Config + JSON
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-0 p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-2">
              <label htmlFor="scenario-name" className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">Scenario Name</label>
              <Input id="scenario-name" value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder="Scenario name" />
            </div>
            <div className="space-y-2">
              <label htmlFor="scenario-description" className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">Description</label>
              <textarea
                id="scenario-description"
                aria-label="Scenario description"
                className="w-full min-h-[72px] rounded-sm border border-neutral-700/80 bg-neutral-950/70 p-2 text-xs text-neutral-200 font-mono focus:outline-none focus:ring-1 focus:ring-primary-500/60"
                value={scenarioDescription}
                onChange={(event) => setScenarioDescription(event.target.value)}
                placeholder="Describe this scenario"
              />
            </div>

            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">Validation</div>
              {validationErrors.length === 0 && <div className="text-[11px] text-success-400">Ready to save.</div>}
              {validationErrors.map((issue) => (
                <div key={issue} className="text-[11px] text-danger-400">
                  {issue}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">Live JSON Preview</div>
              <pre className="rounded-sm border border-neutral-800 bg-black/50 p-3 text-[11px] text-neutral-200 overflow-auto max-h-[320px]">
                {jsonPreview}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
