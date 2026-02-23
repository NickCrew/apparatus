import { Shield, Plus, Trash2, Lock } from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useDefense } from '../../hooks/useDefense';

export function DefenseConsole() {
  const { rules, addRule, deleteRule, isLoading } = useDefense();
  const [newPattern, setNewPattern] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPattern) return;
      
      // Client-side ReDoS / Syntax validation
      try {
          new RegExp(newPattern);
      } catch (e) {
          setError("Invalid Regex Pattern");
          return;
      }
      
      setError(null);
      await addRule(newPattern, 'block');
      setNewPattern('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Active Defense</h1>
        <p className="text-neutral-400 text-sm mt-1 ml-2">Configure WAF rules and traffic filtering.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules List */}
        <div className="lg:col-span-2 space-y-4">
           <Card variant="panel" glow="primary">
              <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-success-500" />
                        Sentinel Rules
                    </CardTitle>
                    <CardDescription>Active regex patterns blocking requests</CardDescription>
                 </div>
                 <Badge variant="neutral">{rules.length} Active</Badge>
              </CardHeader>
              <CardContent>
                 <div className="space-y-2">
                    {rules.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500 text-sm font-mono">
                            No active rules. System is open.
                        </div>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded-sm group hover:border-neutral-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Lock className="h-3 w-3 text-success-500" />
                                    <code className="text-xs font-mono text-neutral-200 bg-neutral-800 px-1.5 py-0.5 rounded">
                                        {rule.pattern}
                                    </code>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={rule.action === 'block' ? 'danger' : 'warning'} size="sm">
                                        {rule.action}
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-500 hover:text-danger-400" onClick={() => deleteRule(rule.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Add Rule Form */}
        <div>
            <Card variant="glass" glow="primary">
                <CardHeader>
                    <CardTitle>Add Block Rule</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="space-y-3">
                        <div>
                            <label htmlFor="regex-pattern" className="text-xs font-mono text-neutral-400">Regex Pattern</label>
                            <input 
                                id="regex-pattern"
                                type="text" 
                                value={newPattern}
                                onChange={e => {
                                    setNewPattern(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="e.g. \/admin|drop tables"
                                className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500"
                            />
                            {error && <span className="text-xs text-danger-500 mt-1 block">{error}</span>}
                        </div>
                        <Button type="submit" variant="primary" className="w-full" disabled={isLoading || !newPattern}>
                            <Plus className="h-4 w-4" />
                            Deploy Rule
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-neutral-800">
                        <h4 className="text-xs font-mono text-neutral-400 mb-3">Quick Presets</h4>
                        <div className="space-y-2">
                            <Button variant="secondary" size="sm" className="w-full justify-start font-mono text-xs" onClick={() => addRule('(?i)(union|select|insert|delete|update)', 'block')}>
                                SQL Injection
                            </Button>
                            <Button variant="secondary" size="sm" className="w-full justify-start font-mono text-xs" onClick={() => addRule('<script>|javascript:', 'block')}>
                                XSS Vectors
                            </Button>
                            <Button variant="secondary" size="sm" className="w-full justify-start font-mono text-xs" onClick={() => addRule('\/(\.git|\.env|config)', 'block')}>
                                Sensitive Files
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
