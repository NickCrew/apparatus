import type { DragEvent } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
} from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import type { ScenarioBuilderNodeData } from './scenarioBuilder';
import 'reactflow/dist/style.css';

const MINIMAP_NODE_COLOR = () => 'rgba(56, 189, 248, 0.9)';

interface ScenarioBuilderCanvasProps {
  nodes: Node<ScenarioBuilderNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onInit: (instance: ReactFlowInstance<ScenarioBuilderNodeData>) => void;
}

export function ScenarioBuilderCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  onInit,
}: ScenarioBuilderCanvasProps) {
  return (
    <Card variant="glass" glow="primary" className="xl:col-span-6 flex flex-col min-h-0">
      <CardHeader className="flex-none border-b border-white/5 pb-3">
        <CardTitle className="flex items-center gap-2">Attack/Chaos Architect Canvas</CardTitle>
      </CardHeader>
      <CardContent className="mt-0 p-0 flex-1 min-h-0">
        <div
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
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={onInit}
            fitView
          >
            <Background color="rgba(148,163,184,0.25)" gap={20} size={1} />
            <MiniMap
              pannable
              zoomable
              nodeColor={MINIMAP_NODE_COLOR}
              style={{ background: 'rgba(2, 6, 23, 0.85)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
            />
            <Controls />
          </ReactFlow>
        </div>
        <div className="px-3 py-2 text-[11px] text-neutral-500 font-mono border-t border-neutral-800/60">
          Tip: select a node or edge and press <span className="text-neutral-300">Delete</span> to remove it.
        </div>
      </CardContent>
    </Card>
  );
}
