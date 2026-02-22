import { FileJson } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';

interface ScenarioBuilderConfigPanelProps {
  scenarioName: string;
  scenarioDescription: string;
  validationErrors: string[];
  jsonPreview: string;
  onScenarioNameChange: (value: string) => void;
  onScenarioDescriptionChange: (value: string) => void;
}

export function ScenarioBuilderConfigPanel({
  scenarioName,
  scenarioDescription,
  validationErrors,
  jsonPreview,
  onScenarioNameChange,
  onScenarioDescriptionChange,
}: ScenarioBuilderConfigPanelProps) {
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
