import { cn } from './cn';

interface KeyboardHintProps {
  keys: string[];
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'muted' | 'subtle';
}

/**
 * Reusable component for displaying keyboard shortcuts with consistent styling
 * Example: <KeyboardHint keys={['⌘', 'K']} label="Command Palette" />
 */
export function KeyboardHint({
  keys,
  label,
  size = 'sm',
  variant = 'default'
}: KeyboardHintProps) {
  const sizeClass = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
    : 'text-xs px-2 py-1 gap-1';

  const variantClass = {
    default: 'bg-neutral-900 border border-neutral-800 text-neutral-300',
    muted: 'bg-neutral-900/50 border border-neutral-800/30 text-neutral-500',
    subtle: 'bg-transparent border border-neutral-700/50 text-neutral-400',
  }[variant];

  return (
    <div className="flex items-center gap-1.5">
      <kbd className={cn(
        'inline-flex items-center rounded-[2px] font-mono',
        sizeClass,
        variantClass
      )}>
        {keys.map((key, idx) => (
          <span key={idx}>{key}</span>
        ))}
      </kbd>
      {label && (
        <span className="text-xs text-neutral-500">{label}</span>
      )}
    </div>
  );
}

KeyboardHint.displayName = 'KeyboardHint';
