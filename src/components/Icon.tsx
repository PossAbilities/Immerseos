import { cn } from '@/lib/cn';

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
  style?: React.CSSProperties;
}

/** Material Symbols Outlined icon with optional fill. */
export function Icon({ name, className, filled, size, style }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined leading-none', className)}
      style={{
        fontSize: size ? `${size}px` : undefined,
        fontVariationSettings: filled ? "'FILL' 1" : undefined,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
