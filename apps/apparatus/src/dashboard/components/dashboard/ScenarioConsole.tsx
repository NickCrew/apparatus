import { useState } from 'react';
import { Play, Plus, Save, FileJson } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useScenarios, Scenario } from '../../hooks/useScenarios';
import { cn } from '../ui/cn';

const DEFAULT_SCENARIO = {
    name: "New Attack Plan",
    description: "Describe your attack sequence...",
    steps: [
        { id: "1", action: "chaos.cpu", params: { duration: 5000 }, delayMs: 1000 },
        { id: "2", action: "cluster.attack", params: { target: "http://example.com", rate: 50 }, delayMs: 0 }
    ]
};

export function ScenarioConsole() {
  const { scenarios, saveScenario, runScenario, isLoading } = useScenarios();
  const [editorContent, setEditorContent] = useState(JSON.stringify(DEFAULT_SCENARIO, null, 2));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSave = () => {
      try {
          const json = JSON.parse(editorContent);
          saveScenario(json);
      } catch (e) {
          alert("Invalid JSON");
      }
  };

  const handleRun = (id: string) => {
      runScenario(id);
      alert("Scenario started! Check the logs/traffic.");
  };

  const loadScenario = (s: Scenario) => {
      setSelectedId(s.id);
      setEditorContent(JSON.stringify(s, null, 2));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 font-mono uppercase">Scenario Engine</h1>
        <p className="text-neutral-400 text-sm mt-1">Automated attack sequencing and replay.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Sidebar List */}
        <Card variant="panel" className="flex flex-col">
            <CardHeader className="flex-none border-b border-neutral-800 pb-3">
                <CardTitle className="text-sm font-mono uppercase">Library</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="divide-y divide-neutral-800/50">
                    {scenarios.map(s => (
                        <div 
                            key={s.id} 
                            className={cn(
                                "p-4 hover:bg-neutral-900/50 flex justify-between items-center group cursor-pointer transition-colors border-l-2",
                                selectedId === s.id ? "bg-neutral-900/80 border-primary-500" : "border-transparent"
                            )}
                            onClick={() => loadScenario(s)}
                        >
                            <div className="flex-1">
                                <div className={cn("font-bold text-sm", selectedId === s.id ? "text-primary-400" : "text-neutral-300")}>{s.name}</div>
                                <div className="text-xs text-neutral-500">{s.steps.length} steps</div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRun(s.id); }}>
                                <Play className="h-4 w-4 text-success-500" />
                            </Button>
                        </div>
                    ))}
                    {scenarios.length === 0 && (
                        <div className="p-8 text-center text-neutral-500 text-xs font-mono">
                            No scenarios saved.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
// ... rest of component

        {/* Editor */}
        <Card variant="glass" className="lg:col-span-2 flex flex-col">
            <CardHeader className="flex-none border-b border-white/5 pb-3 flex flex-row justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-primary-500" />
                    Scenario Editor
                </CardTitle>
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditorContent(JSON.stringify(DEFAULT_SCENARIO, null, 2))}>
                        <Plus className="h-4 w-4 mr-2" />
                        New
                    </Button>
                    <Button size="sm" variant="primary" onClick={handleSave} disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <textarea 
                    className="w-full h-full bg-black/40 text-neutral-300 font-mono text-xs p-4 resize-none focus:outline-none border-none"
                    value={editorContent}
                    onChange={e => setEditorContent(e.target.value)}
                    spellCheck={false}
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
