import { cn } from './cn';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

type AccentColor = 'primary' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ElementType;
  accent?: AccentColor;
  className?: string;
  chart?: React.ReactNode;
}

const accentColors: Record<AccentColor, string> = {
  primary: 'bg-primary',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
};

const accentGlows: Record<AccentColor, string> = {
  primary: 'shadow-[0_0_8px_rgba(0,240,255,0.3)]',
  success: 'shadow-[0_0_8px_rgba(0,255,148,0.3)]',
  warning: 'shadow-[0_0_8px_rgba(255,184,0,0.3)]',
  danger: 'shadow-[0_0_8px_rgba(255,0,85,0.3)]',
};

const iconColors: Record<AccentColor, string> = {
  primary: 'text-primary/60',
  success: 'text-success-500/60',
  warning: 'text-warning-500/60',
  danger: 'text-danger-500/60',
};

export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  accent = 'primary',
  className,
  chart,
}: StatCardProps) {
  const isPositive = trend?.direction === 'up';
  const isNeutral = trend?.direction === 'neutral';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[3px]',
        'bg-neutral-900/70 border border-neutral-800/60',
        'shadow-inner-glow',
        'group',
        className
      )}
    >
      {/* Left accent bar */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-[2px]',
        accentColors[accent],
        accentGlows[accent],
      )} />

      <div className="p-4 pl-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <span className="text-label font-display text-neutral-600 uppercase block">
              {label}
            </span>
            <div className="text-display-md font-display text-neutral-100">
              {value}
            </div>
          </div>

          {Icon && (
            <Icon size={28} className={cn(iconColors[accent], 'flex-shrink-0')} strokeWidth={1.25} />
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          {trend ? (
            <div className={cn(
              "flex items-center gap-1 text-[11px] font-mono",
              isPositive ? "text-success-500/80" : isNeutral ? "text-neutral-400" : "text-danger-400/80"
            )}>
              {isPositive ? (
                <ArrowUpRight size={12} />
              ) : isNeutral ? (
                <Minus size={12} />
              ) : (
                <ArrowDownRight size={12} />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-neutral-700">—</div>
          )}

          {chart && <div className="h-8 w-24">{chart}</div>}
        </div>
      </div>
    </div>
  );
}
