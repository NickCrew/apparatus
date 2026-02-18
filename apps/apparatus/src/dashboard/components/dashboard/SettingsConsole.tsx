import { useState } from 'react';
import { Settings, Save, Power } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { useApparatus } from '../../providers/ApparatusProvider';
import { useTheme } from '../../theme/ThemeProvider';

export function SettingsConsole() {
  const { baseUrl, setBaseUrl, isConnected, health } = useApparatus();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [urlInput, setUrlInput] = useState(baseUrl);

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      setBaseUrl(urlInput);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 font-mono uppercase">System Settings</h1>
        <p className="text-neutral-400 text-sm mt-1">Dashboard configuration and connection preferences.</p>
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
                        <label className="text-xs font-mono text-neutral-400 uppercase">Base URL</label>
                        <input 
                            type="url" 
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success-500' : 'bg-danger-500'}`} />
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
