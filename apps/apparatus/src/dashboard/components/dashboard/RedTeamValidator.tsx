import { useState } from 'react';
import { ShieldCheck, ChevronRight, ChevronDown, ChefHat } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useApparatus } from '../../providers/ApparatusProvider';
import { openInCyberChef } from '../../utils/cyberchef';
import { cn } from '../ui/cn';

interface ValidationResult {
  category: string;
  payload: string;
  status: number;
  blocked: boolean;
  duration: number;
  error?: string;
}

interface ValidationResponse {
  target: string;
  summary: {
    total: number;
    blocked: number;
    passed: number;
  };
  details: ValidationResult[];
}

export function RedTeamValidator() {
  const { baseUrl } = useApparatus();
  const [targetPath, setTargetPath] = useState('/echo');
  const [method, setMethod] = useState('GET');
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const runValidation = async () => {
    setIsLoading(true);
    try {
      const url = new URL(`${baseUrl}/redteam/validate`);
      url.searchParams.set('path', targetPath);
      url.searchParams.set('method', method);
      
      const res = await fetch(url.toString());
      const data = await res.json();
      setResult(data);
      
      // Auto-expand categories with passed (vulnerable) payloads
      const newExpanded = new Set<string>();
      data.details.forEach((r: ValidationResult) => {
        if (!r.blocked) newExpanded.add(r.category);
      });
      setExpandedCategories(newExpanded);
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  const groupedResults = result ? result.details.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, ValidationResult[]>) : {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config */}
        <Card variant="glass" glow="primary">
          <CardHeader>
            <CardTitle className="text-sm">Validator Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[10px] font-mono text-neutral-500 uppercase">Target Path</label>
              <input 
                type="text" 
                value={targetPath}
                onChange={e => setTargetPath(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-neutral-500 uppercase">Method</label>
              <select 
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500"
              >
                {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <Button variant="primary" className="w-full" onClick={runValidation} isLoading={isLoading}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Scan Attack Surface
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="lg:col-span-2">
          <Card variant="panel" className="h-full flex flex-col">
            <CardHeader className="border-b border-white/5 bg-white/[0.01]">
              <CardTitle className="text-sm">Validation Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-around p-6">
              {!result ? (
                <div className="text-neutral-600 text-xs font-mono italic">AWAITING_SCAN_INITIALIZATION</div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-3xl font-display font-bold text-white">{result.summary.total}</div>
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Total Payloads</div>
                  </div>
                  <div className="h-12 w-px bg-neutral-800" />
                  <div className="text-center">
                    <div className="text-3xl font-display font-bold text-success-500">{result.summary.blocked}</div>
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Blocked (Secure)</div>
                  </div>
                  <div className="h-12 w-px bg-neutral-800" />
                  <div className="text-center">
                    <div className="text-3xl font-display font-bold text-danger-500">{result.summary.passed}</div>
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Passed (Vulnerable)</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Results */}
      {result && (
        <div className="space-y-3">
          {Object.entries(groupedResults).map(([category, items]) => {
            const isExpanded = expandedCategories.has(category);
            const passedCount = items.filter(i => !i.blocked).length;
            
            return (
              <Card key={category} variant="panel" className={cn("border-l-4", passedCount > 0 ? "border-l-danger-500" : "border-l-success-500")}>
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-neutral-500" /> : <ChevronRight className="h-4 w-4 text-neutral-500" />}
                    <span className="font-bold text-sm text-neutral-200 uppercase tracking-tight">{category.replace('_', ' ')}</span>
                    <Badge variant={passedCount > 0 ? 'danger' : 'success'} size="sm">
                      {passedCount > 0 ? `${passedCount} VULNERABILITIES` : 'SECURE'}
                    </Badge>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-600">{items.length} Payloads</span>
                </button>
                
                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/20 overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-neutral-500">
                          <th className="p-3 pl-12 font-medium uppercase tracking-tighter">Payload</th>
                          <th className="p-3 font-medium uppercase tracking-tighter">Status</th>
                          <th className="p-3 font-medium uppercase tracking-tighter">Result</th>
                          <th className="p-3 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="p-3 pl-12">
                              <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-300">{item.payload}</code>
                            </td>
                            <td className="p-3 text-neutral-400">{item.status}</td>
                            <td className="p-3">
                              <span className={item.blocked ? "text-success-500" : "text-danger-500 font-bold"}>
                                {item.blocked ? 'BLOCKED' : 'BREACHED'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-primary-400"
                                onClick={() => openInCyberChef(item.payload)}
                              >
                                <ChefHat className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
