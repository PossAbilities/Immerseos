import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export function GlassPanel({
  className,
  edge,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { edge?: boolean }) {
  return (
    <div
      className={cn('glass rounded-xl', edge && 'glass-edge', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-label-sm uppercase tracking-widest text-on-surface-variant">
      {children}
    </h3>
  );
}

export function StatusPill({
  label,
  tone = 'live',
}: {
  label: string;
  tone?: 'live' | 'idle' | 'warn';
}) {
  const dot =
    tone === 'live'
      ? 'bg-secondary'
      : tone === 'warn'
        ? 'bg-error'
        : 'bg-outline';
  const text =
    tone === 'live'
      ? 'text-secondary'
      : tone === 'warn'
        ? 'text-error'
        : 'text-on-surface-variant';
  return (
    <div className="glass flex items-center gap-sm rounded-full px-sm py-xs">
      <span className={cn('h-2 w-2 rounded-full', dot, tone === 'live' && 'animate-pulse')} />
      <span className={cn('text-label-sm uppercase tracking-widest', text)}>
        {label}
      </span>
    </div>
  );
}

export function PrimaryButton({
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'btn-bloom rounded-lg bg-primary px-md py-md text-label-md font-semibold text-on-primary transition-all duration-200 active:scale-[0.98] disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  name,
  filled,
  className,
  ...rest
}: { name: string; filled?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'glass flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10',
        className,
      )}
      {...rest}
    >
      <Icon name={name} filled={filled} />
    </button>
  );
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary',
        className,
      )}
    />
  );
}
