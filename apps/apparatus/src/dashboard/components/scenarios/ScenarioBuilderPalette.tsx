import type { DragEvent } from 'react';
import { Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';
import type { Scenario } from '../../hooks/useScenarios';
import { SCENARIO_ACTION_BLUEPRINTS, type ScenarioAction } from './scenarioBuilder';

interface ScenarioBuilderPaletteProps {
  scenarios: Scenario[];
  selectedId: string | null;
  onSelectScenario: (scenario: Scenario) => void;
  onRunScenario: (scenarioId: string) => Promise<void>;
  onAddNode: (action: ScenarioAction) => void;
  onPaletteDragStart: (event: DragEvent<HTMLDivElement>, action: ScenarioAction) => void;
}

export function ScenarioBuilderPalette({
  scenarios,
  selectedId,
  onSelectScenario,
  onRunScenario,
  onAddNode,
  onPaletteDragStart,
}: ScenarioBuilderPaletteProps) {
  return (
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
                onDragStart={(event) => onPaletteDragStart(event, blueprint.action)}
                role="button"
                tabIndex={0}
                aria-label={`Drag or add ${blueprint.label}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onAddNode(blueprint.action);
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
                  <Button size="sm" variant="ghost" aria-label={`Add ${blueprint.label} block`} onClick={() => onAddNode(blueprint.action)}>
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-neutral-800/50">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              role="button"
              tabIndex={0}
              className={cn(
                'p-4 hover:bg-neutral-900/50 flex justify-between items-center group cursor-pointer transition-colors border-l-2',
                selectedId === scenario.id ? 'bg-neutral-900/80 border-primary-500' : 'border-transparent'
              )}
              onClick={() => onSelectScenario(scenario)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectScenario(scenario);
                }
              }}
            >
              <div className="flex-1">
                <div className={cn('font-bold text-sm', selectedId === scenario.id ? 'text-primary-400' : 'text-neutral-300')}>{scenario.name}</div>
                <div className="text-xs text-neutral-500">{scenario.steps.length} steps</div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  void onRunScenario(scenario.id);
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
  );
}
