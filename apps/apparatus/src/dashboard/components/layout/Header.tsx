import { useApparatus } from '../../providers/ApparatusProvider';
import { HelpCircle, Terminal } from 'lucide-react';
import { cn } from '../ui/cn';

export function Header() {
  const { health } = useApparatus();
  const isHealthy = health.status === 'healthy';
  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('apparatus:open-command-palette'));
  };
  const handleOpenHelp = () => {
    window.dispatchEvent(new CustomEvent('apparatus:open-help-modal'));
  };

  return (
    <header className="h-12 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-5 z-10 sticky top-0">
      {/* Left: Breadcrumb */}
      <div className="hidden md:flex items-center gap-2 text-[11px] font-mono tracking-wider">
        <div className={cn(
            "w-2.5 h-2.5 rounded-[1px] transition-all duration-1000",
            isHealthy ? "bg-primary shadow-[0_0_12px_rgba(0,196,167,0.8)]" :
            health.status === 'checking' ? "bg-warning animate-pulse" :
            "bg-danger shadow-[0_0_12px_rgba(225,29,72,0.8)]"
        )} />
        <span className="text-neutral-500 uppercase">System</span>
        <span className="text-neutral-700">/</span>
        <span className="text-neutral-100 uppercase font-bold tracking-widest">
            {window.location.pathname.split('/').pop()?.toUpperCase() || 'OVERVIEW'}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">

        {/* Telemetry Status */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono text-neutral-600 uppercase leading-none">Status</span>
            <span className={cn(
                "text-[10px] font-mono font-bold leading-none mt-1 uppercase",
                isHealthy ? "text-primary" : "text-danger"
            )}>
                {health.status === 'healthy' ? 'NOMINAL' : health.status.toUpperCase()}
            </span>
          </div>
          
          {health.latencyMs !== undefined && (
            <div className="flex flex-col items-end border-l border-white/5 pl-3">
              <span className="text-[9px] font-mono text-neutral-600 uppercase leading-none">Latency</span>
              <span className="text-[10px] font-mono text-neutral-400 leading-none mt-1 font-bold">
                {health.latencyMs}ms
              </span>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-white/5 mx-1" />

        <button
          type="button"
          onClick={handleOpenCommandPalette}
          className="inline-flex items-center gap-2 rounded-sm border border-neutral-800/80 bg-neutral-900/60 px-2.5 py-1.5 text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
          title="Open command palette (Cmd+K)"
          aria-label="Open command palette"
        >
          <Terminal className="h-3.5 w-3.5" />
          <span className="hidden lg:inline text-[10px] font-mono uppercase tracking-widest">Commands</span>
          <kbd className="rounded-[2px] border border-neutral-700 bg-neutral-950 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={handleOpenHelp}
          className="inline-flex items-center gap-2 rounded-sm border border-neutral-800/80 bg-neutral-900/60 px-2.5 py-1.5 text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
          title="Open help (Cmd+?)"
          aria-label="Open help"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="hidden lg:inline text-[10px] font-mono uppercase tracking-widest">Help</span>
          <kbd className="rounded-[2px] border border-neutral-700 bg-neutral-950 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400">
            ⌘?
          </kbd>
        </button>

      </div>
    </header>
  );
}

Header.displayName = 'Header';
