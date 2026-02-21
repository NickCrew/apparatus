import { useApparatus } from '../../providers/ApparatusProvider';
import { Bell, Search, Terminal, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

interface HeaderProps {
  title?: string;
  onHelpClick?: () => void;
}

export function Header({ onHelpClick }: HeaderProps) {
  const { health } = useApparatus();
  const isHealthy = health.status === 'healthy';

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
        {/* Quick Search */}
        <div className="relative hidden md:block group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-600 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="SYSTEM_SEARCH..."
            className="h-8 w-52 bg-neutral-900/60 border border-neutral-700 rounded-sm pl-8 pr-12 text-[10px] font-mono text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-primary/50 focus:bg-neutral-900/80 transition-all uppercase tracking-widest"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 h-[18px] inline-flex items-center gap-0.5 rounded-[1px] border border-white/10 bg-black px-1 font-mono text-[9px] text-neutral-500">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </div>

        <div className="h-5 w-px bg-white/5 mx-1" />

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

        <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-primary transition-all h-8 w-8">
          <Bell className="h-3.5 w-3.5" />
        </Button>

        <Button
            onClick={onHelpClick}
            variant="ghost"
            size="icon"
            className="text-neutral-600 hover:text-primary h-8 w-8"
            title="Open help (⌘?)"
          >
            <HelpCircle className="h-3.5 w-3.5" />
        </Button>

        <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-primary transition-all h-8 w-8">
          <Terminal className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}

Header.displayName = 'Header';
