import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MainContent } from './components/layout/MainContent';
import { ThemeProvider } from './theme/ThemeProvider';
import { ApparatusProvider } from './providers/ApparatusProvider';
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
import { SettingsConsole } from './components/dashboard/SettingsConsole';
import { ScenarioConsole } from './components/dashboard/ScenarioConsole';

function Layout() {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-primary-500/30 overflow-hidden">
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
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="traffic" element={<TrafficConsole />} />
              <Route path="defense" element={<DefenseConsole />} />
              <Route path="deception" element={<DeceptionConsole />} />
              <Route path="chaos" element={<ChaosConsole />} />
              <Route path="cluster" element={<ClusterConsole />} />
              <Route path="webhooks" element={<WebhooksConsole />} />
              <Route path="mtd" element={<MTDConsole />} />
              <Route path="testing" element={<TestingLab />} />
              <Route path="network" element={<NetworkConsole />} />
              <Route path="scenarios" element={<ScenarioConsole />} />
              <Route path="settings" element={<SettingsConsole />} />
            </Route>
          </Routes>
        </ApparatusProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}