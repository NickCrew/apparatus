import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MainContent } from './components/layout/MainContent';
import { ThemeProvider } from './theme/ThemeProvider';
import { ApparatusProvider, useApparatus } from './providers/ApparatusProvider';
import { DocViewerProvider, useDocViewer } from './providers/DocViewerProvider';
import { Overview } from './components/dashboard/Overview';
import { ChaosConsole } from './components/dashboard/ChaosConsole';
import { DefenseConsole } from './components/dashboard/DefenseConsole';
import { DeceptionConsole } from './components/dashboard/DeceptionConsole';
import { ClusterConsole } from './components/dashboard/ClusterConsole';
import { TrafficConsole } from './components/dashboard/TrafficConsole';
import { WebhooksConsole } from './components/dashboard/WebhooksConsole';
import { MTDConsole } from './components/dashboard/MTDConsole';
import { TestingLab } from './components/dashboard/TestingLab';
import { NetworkConsole } from './components/dashboard/NetworkConsole';
import { IdentityConsole } from './components/dashboard/IdentityConsole';
import { SettingsConsole } from './components/dashboard/SettingsConsole';
import { ScenarioConsole } from './components/dashboard/ScenarioConsole';
import { DrillConsole } from './components/dashboard/DrillConsole';
import { SupplyChainConsole } from './components/dashboard/SupplyChainConsole';
import { AutopilotConsole } from './components/dashboard/AutopilotConsole';
import { GhostConsole } from './components/dashboard/GhostConsole';
import { ListenersConsole } from './components/dashboard/ListenersConsole';
import { IncidentTimeline } from './components/dashboard/IncidentTimeline';
import { FingerprintConsole } from './components/dashboard/FingerprintConsole';
import { CommandPalette } from './components/layout/CommandPalette';
import { HelpSearchModal } from './components/modals/HelpSearchModal';
import { DocViewer } from './components/layout/DocViewer';
import { DocumentationHub } from './components/docs/DocumentationHub';
import { HudOverlayLayer } from './components/hud/HudOverlayLayer';
import { useState, useEffect } from 'react';

function Layout() {
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const { selectedDocId, closeDoc } = useDocViewer();
  const { health } = useApparatus();

  // Geometric Morphing: Radius tightens as health degrades
  const uiRadius = 
    health.status === 'healthy' ? '8px' : 
    health.status === 'degraded' ? '2px' : 
    health.status === 'critical' || health.status === 'unhealthy' ? '0px' :
    '6px'; // checking/unknown

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+? or Ctrl+? opens help modal
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setHelpModalOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      className="flex h-screen bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-primary-500/30 overflow-hidden"
      style={{ '--ui-radius': uiRadius } as React.CSSProperties}
    >
      <CommandPalette />
      <HelpSearchModal
        open={helpModalOpen}
        onOpenChange={setHelpModalOpen}
        onSelectDoc={() => {
          // openDoc is called through context in HelpSearchModal or here
          // Component uses context directly, so we just close the modal
          setHelpModalOpen(false);
        }}
      />
      <DocViewer docId={selectedDocId} onClose={closeDoc} />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative">
        <Header />
        <MainContent>
          <Outlet />
        </MainContent>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/dashboard">
      <ThemeProvider>
        <ApparatusProvider>
          <DocViewerProvider>
            <HudOverlayLayer />
            <Routes>
              <Route path="docs" element={<DocumentationHub />} />
              <Route path="docs/:docId" element={<DocumentationHub />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Overview />} />
                <Route path="traffic" element={<TrafficConsole />} />
                <Route path="timeline" element={<IncidentTimeline />} />
                <Route path="fingerprints" element={<FingerprintConsole />} />
                <Route path="defense" element={<DefenseConsole />} />
                <Route path="deception" element={<DeceptionConsole />} />
                <Route path="chaos" element={<ChaosConsole />} />
                <Route path="cluster" element={<ClusterConsole />} />
                <Route path="webhooks" element={<WebhooksConsole />} />
                <Route path="mtd" element={<MTDConsole />} />
                <Route path="testing" element={<TestingLab />} />
                <Route path="network" element={<NetworkConsole />} />
                <Route path="identity" element={<IdentityConsole />} />
                <Route path="scenarios" element={<ScenarioConsole />} />
                <Route path="drill" element={<DrillConsole />} />
                <Route path="ghosts" element={<GhostConsole />} />
                <Route path="autopilot" element={<AutopilotConsole />} />
                <Route path="settings" element={<SettingsConsole />} />
                <Route path="dependencies" element={<SupplyChainConsole />} />
                <Route path="listeners" element={<ListenersConsole />} />
              </Route>
            </Routes>
          </DocViewerProvider>
        </ApparatusProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
