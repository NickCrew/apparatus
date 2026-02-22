import { useApparatus } from '../../providers/ApparatusProvider';
import { Bell, Terminal, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

interface HeaderProps {
  title?: string;
  onHelpClick?: () => void;
  onCommandClick?: () => void;
}

export function Header({ onHelpClick, onCommandClick }: HeaderProps) {
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

        <Button
          variant="ghost"
          size="icon"
          className="text-neutral-600 hover:text-primary transition-all h-8 w-8"
          title="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
        </Button>

        <Button
          onClick={onCommandClick}
          variant="ghost"
          size="icon"
          className="text-neutral-600 hover:text-primary h-8 w-8"
          title="Commands (⌘K)"
        >
          <Terminal className="h-3.5 w-3.5" />
        </Button>

        <Button
          onClick={onHelpClick}
          variant="ghost"
          size="icon"
          className="text-neutral-600 hover:text-primary h-8 w-8"
          title="Help (⌘?)"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}

Header.displayName = 'Header';
