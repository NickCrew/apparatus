import { useState, useEffect } from 'react';
import { Settings, Save, Power, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { useApparatus } from '../../providers/ApparatusProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge } from '../ui/Badge';

export function SettingsConsole() {
  const { baseUrl, setBaseUrl, isConnected, health } = useApparatus();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [urlInput, setUrlInput] = useState(baseUrl);
  const [demoMode, setDemoMode] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Fetch initial demo state
  useEffect(() => {
      if (!baseUrl) return;
      fetch(`${baseUrl}/_sensor/demo`)
        .then(res => res.json())
        .then(data => setDemoMode(data.enabled))
        .catch(() => {});
  }, [baseUrl]);

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      setBaseUrl(urlInput);
  };

  const toggleDemo = async () => {
      if (!baseUrl) return;
      setLoadingDemo(true);
      try {
          const res = await fetch(`${baseUrl}/_sensor/demo/toggle`, { method: 'POST' });
          const data = await res.json();
          setDemoMode(data.enabled);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingDemo(false);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl text-neutral-100 ml-2 type-heading">System Settings</h1>
        <p className="text-neutral-400 text-sm mt-1 ml-2">Dashboard configuration and connection preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Settings */}
        <Card variant="panel">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Power className="h-4 w-4 text-primary-500" />
                    Connection
                </CardTitle>
                <CardDescription>Configure the Apparatus backend URL.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-xs font-mono text-neutral-400">Base URL</label>
                        <input 
                            type="url" 
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success-500' : 'bg-danger-500'}`} aria-hidden="true" />
                            <span className="text-xs font-mono text-neutral-300">
                                {isConnected ? `CONNECTED (v${health.version || '?'})` : 'DISCONNECTED'}
                            </span>
                        </div>
                        <Button type="submit" variant="secondary" size="sm">
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>

        {/* Demo Mode */}
        <Card variant="panel" className={demoMode ? "border-warning-500/50" : ""}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-warning-500" />
                    Simulation Mode
                </CardTitle>
                <CardDescription>Generate synthetic traffic and events.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-sm border border-neutral-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-neutral-200">Demo Traffic</span>
                            {demoMode && <Badge variant="warning" dot>ACTIVE</Badge>}
                        </div>
                        <p className="text-xs text-neutral-500">
                            Automatically generates HTTP requests, honeypot hits, and webhooks for demonstration.
                        </p>
                    </div>
                    <Button 
                        variant={demoMode ? "destructive" : "default"} 
                        size="sm" 
                        onClick={toggleDemo}
                        isLoading={loadingDemo}
                    >
                        {demoMode ? "Stop Simulation" : "Start Simulation"}
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* Appearance */}
        <Card variant="panel">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-neutral-400" />
                    Appearance
                </CardTitle>
                <CardDescription>Customize the dashboard look and feel.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-sm border border-neutral-800">
                    <span className="text-sm text-neutral-300">Theme Mode</span>
                    <Button variant="outline" size="sm" onClick={toggleTheme}>
                        {resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}