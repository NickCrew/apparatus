import { FileJson } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import type { ScenarioAction, ScenarioBuilderNode } from './scenarioBuilder';
import { SCENARIO_ACTION_BLUEPRINTS, SCENARIO_PARAMETER_LIMITS, isScenarioAction } from './scenarioBuilder';

const FIELD_CLASSES =
  'w-full rounded-sm border border-neutral-700/80 bg-neutral-950/70 p-2 text-xs text-neutral-200 font-mono focus:outline-none focus:ring-1 focus:ring-primary-500/60';

interface ScenarioBuilderConfigPanelProps {
  scenarioName: string;
  scenarioDescription: string;
  validationErrors: string[];
  jsonPreview: string;
  selectedNode: ScenarioBuilderNode | null;
  hasMultiSelection: boolean;
  selectedNodeErrors: string[];
  onScenarioNameChange: (value: string) => void;
  onScenarioDescriptionChange: (value: string) => void;
  onSelectedActionChange: (action: ScenarioAction) => void;
  onSelectedDelayMsChange: (value: number) => void;
  onSelectedParamChange: (key: string, value: string | number) => void;
  onSelectedMemoryModeChange: (mode: 'allocate' | 'clear') => void;
}

export function ScenarioBuilderConfigPanel({
  scenarioName,
  scenarioDescription,
  validationErrors,
  jsonPreview,
  selectedNode,
  hasMultiSelection,
  selectedNodeErrors,
  onScenarioNameChange,
  onScenarioDescriptionChange,
  onSelectedActionChange,
  onSelectedDelayMsChange,
  onSelectedParamChange,
  onSelectedMemoryModeChange,
}: ScenarioBuilderConfigPanelProps) {
  const selectedAction = selectedNode?.data.action;
  const selectedParams = selectedNode?.data.params ?? {};

  return (
    <Card variant="panel" glow="none" className="xl:col-span-3 flex flex-col min-h-0">
      <CardHeader className="flex-none border-b border-neutral-800 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileJson className="h-4 w-4 text-primary-500" />
          Scenario Config + JSON
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-0 p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-2">
          <label htmlFor="scenario-name" className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">
            Scenario Name
          </label>
          <Input id="scenario-name" value={scenarioName} onChange={(event) => onScenarioNameChange(event.target.value)} placeholder="Scenario name" />
        </div>
        <div className="space-y-2">
          <label htmlFor="scenario-description" className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">
            Description
          </label>
          <textarea
            id="scenario-description"
            aria-label="Scenario description"
            className="w-full min-h-[72px] rounded-sm border border-neutral-700/80 bg-neutral-950/70 p-2 text-xs text-neutral-200 font-mono focus:outline-none focus:ring-1 focus:ring-primary-500/60"
            value={scenarioDescription}
            onChange={(event) => onScenarioDescriptionChange(event.target.value)}
            placeholder="Describe this scenario"
          />
        </div>

        <div className="space-y-2 border border-neutral-800/70 rounded-sm p-3 bg-neutral-950/40">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">Selected Step</div>
          {hasMultiSelection && (
            <div role="status" aria-live="polite" className="text-[11px] text-warning-400">
              Multiple nodes selected. Select one node to edit parameters.
            </div>
          )}
          {!hasMultiSelection && !selectedNode && (
            <div role="status" aria-live="polite" className="text-[11px] text-neutral-500">
              Select a node on the canvas to edit its parameters.
            </div>
          )}
          {selectedNode && (
            <div className="space-y-3">
              <div className="text-xs text-neutral-300 font-mono">{selectedNode.data.label} · {selectedNode.id}</div>

              <div className="space-y-1">
                <label htmlFor="selected-node-action" className="text-[11px] text-neutral-500 font-mono">Action</label>
                <select
                  id="selected-node-action"
                  className={FIELD_CLASSES}
                  value={selectedAction}
                  onChange={(event) => {
                    const nextAction = event.target.value;
                    if (isScenarioAction(nextAction)) {
                      onSelectedActionChange(nextAction);
                    }
                  }}
                >
                  {SCENARIO_ACTION_BLUEPRINTS.map((blueprint) => (
                    <option key={blueprint.action} value={blueprint.action}>
                      {blueprint.label} ({blueprint.action})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="selected-node-delay-ms" className="text-[11px] text-neutral-500 font-mono">Post-Step Delay (ms)</label>
                <input
                  id="selected-node-delay-ms"
                  type="number"
                  min={SCENARIO_PARAMETER_LIMITS.postStepDelayMs.min}
                  max={SCENARIO_PARAMETER_LIMITS.postStepDelayMs.max}
                  value={Number(selectedNode.data.delayMs ?? 0)}
                  className={FIELD_CLASSES}
                  onChange={(event) => onSelectedDelayMsChange(Number(event.target.value))}
                />
              </div>

              {selectedAction === 'chaos.cpu' && (
                <div className="space-y-1">
                  <label htmlFor="selected-node-cpu-duration" className="text-[11px] text-neutral-500 font-mono">CPU Duration (ms)</label>
                  <input
                    id="selected-node-cpu-duration"
                    type="number"
                    min={SCENARIO_PARAMETER_LIMITS.chaosCpuDurationMs.min}
                    max={SCENARIO_PARAMETER_LIMITS.chaosCpuDurationMs.max}
                    value={Number(selectedParams.duration ?? 5000)}
                    className={FIELD_CLASSES}
                    onChange={(event) => onSelectedParamChange('duration', Number(event.target.value))}
                  />
                </div>
              )}

              {selectedAction === 'chaos.memory' && (
                <>
                  <div className="space-y-1">
                    <label htmlFor="selected-node-memory-mode" className="text-[11px] text-neutral-500 font-mono">Memory Mode</label>
                    <select
                      id="selected-node-memory-mode"
                      className={FIELD_CLASSES}
                      value={selectedParams.action === 'clear' ? 'clear' : 'allocate'}
                      onChange={(event) => onSelectedMemoryModeChange(event.target.value === 'clear' ? 'clear' : 'allocate')}
                    >
                      <option value="allocate">allocate</option>
                      <option value="clear">clear</option>
                    </select>
                  </div>
                  {selectedParams.action !== 'clear' && (
                    <div className="space-y-1">
                      <label htmlFor="selected-node-memory-amount" className="text-[11px] text-neutral-500 font-mono">Memory Amount (MB)</label>
                      <input
                        id="selected-node-memory-amount"
                        type="number"
                        min={SCENARIO_PARAMETER_LIMITS.chaosMemoryAmountMb.min}
                        max={SCENARIO_PARAMETER_LIMITS.chaosMemoryAmountMb.max}
                        value={Number(selectedParams.amount ?? 100)}
                        className={FIELD_CLASSES}
                        onChange={(event) => onSelectedParamChange('amount', Number(event.target.value))}
                      />
                    </div>
                  )}
                </>
              )}

              {selectedAction === 'cluster.attack' && (
                <>
                  <div className="space-y-1">
                    <label htmlFor="selected-node-cluster-target" className="text-[11px] text-neutral-500 font-mono">Target URL</label>
                    <input
                      id="selected-node-cluster-target"
                      type="url"
                      value={String(selectedParams.target ?? '')}
                      className={FIELD_CLASSES}
                      onChange={(event) => onSelectedParamChange('target', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="selected-node-cluster-rate" className="text-[11px] text-neutral-500 font-mono">Rate</label>
                    <input
                      id="selected-node-cluster-rate"
                      type="number"
                      min={SCENARIO_PARAMETER_LIMITS.clusterAttackRate.min}
                      max={SCENARIO_PARAMETER_LIMITS.clusterAttackRate.max}
                      value={Number(selectedParams.rate ?? 100)}
                      className={FIELD_CLASSES}
                      onChange={(event) => onSelectedParamChange('rate', Number(event.target.value))}
                    />
                  </div>
                </>
              )}

              {selectedAction === 'mtd.rotate' && (
                <div className="space-y-1">
                  <label htmlFor="selected-node-prefix" className="text-[11px] text-neutral-500 font-mono">Prefix (optional)</label>
                  <input
                    id="selected-node-prefix"
                    type="text"
                    maxLength={SCENARIO_PARAMETER_LIMITS.mtdPrefixMaxLength}
                    value={String(selectedParams.prefix ?? '')}
                    className={FIELD_CLASSES}
                    onChange={(event) => onSelectedParamChange('prefix', event.target.value)}
                  />
                </div>
              )}

              {selectedAction === 'delay' && (
                <div className="space-y-1">
                  <label htmlFor="selected-node-delay-duration" className="text-[11px] text-neutral-500 font-mono">Delay Duration (ms)</label>
                  <input
                    id="selected-node-delay-duration"
                    type="number"
                    min={SCENARIO_PARAMETER_LIMITS.delayDurationMs.min}
                    max={SCENARIO_PARAMETER_LIMITS.delayDurationMs.max}
                    value={Number(selectedParams.duration ?? 1000)}
                    className={FIELD_CLASSES}
                    onChange={(event) => onSelectedParamChange('duration', Number(event.target.value))}
                  />
                </div>
              )}

              {selectedNodeErrors.length > 0 && (
                <div className="space-y-1" aria-live="polite">
                  {selectedNodeErrors.map((error, index) => (
                    <div key={`${index}-${error}`} className="text-[11px] text-danger-400">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2" aria-live="polite">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">Validation</div>
          {validationErrors.length === 0 && <div className="text-[11px] text-success-400">Ready to save.</div>}
          {validationErrors.map((issue, index) => (
            <div key={`${index}-${issue}`} className="text-[11px] text-danger-400">
              {issue}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono">Live JSON Preview</div>
          <pre
            aria-label="Scenario JSON preview"
            className="rounded-sm border border-neutral-800 bg-black/50 p-3 text-[11px] text-neutral-200 overflow-auto max-h-[320px]"
          >
            {jsonPreview}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
