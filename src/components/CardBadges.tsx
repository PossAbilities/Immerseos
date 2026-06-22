import { Icon } from './Icon';
import { cn } from '@/lib/cn';
import type { ContentType, Experience } from '@/lib/types';

const TYPE_COLOR: Record<ContentType, string> = {
  Interactive: 'bg-pink-500',
  Background: 'bg-blue-500',
  '360 Video': 'bg-teal-500',
  Video: 'bg-purple-500',
  Quiz: 'bg-green-500',
  Scene: 'bg-primary-container',
};

/** Small content-type pill shown at the top-left of a card. */
export function TypeBadge({ type }: { type?: ContentType }) {
  if (!type) return null;
  return (
    <span className={cn('rounded px-sm py-0.5 text-[11px] font-semibold text-white shadow', TYPE_COLOR[type])}>
      {type}
    </span>
  );
}

/** Diagonal corner ribbon — "New!" (amber) or "Featured" (blue). */
export function CornerRibbon({ label, tone }: { label: string; tone: 'new' | 'featured' }) {
  return (
    <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 overflow-hidden">
      <span
        className={cn(
          'absolute right-[-34px] top-[14px] w-[120px] rotate-45 text-center text-[10px] font-bold uppercase tracking-wider text-white shadow',
          tone === 'new' ? 'bg-amber-500' : 'bg-blue-600',
        )}
      >
        {label}
      </span>
    </div>
  );
}

/** Save + like counts row (matches the supplier's card footer). */
export function SaveLikes({ exp }: { exp: Experience }) {
  return (
    <span className="flex items-center gap-sm text-label-sm text-on-surface-variant">
      {typeof exp.saves === 'number' && (
        <span className="flex items-center gap-0.5">
          <Icon name="bookmark" size={14} /> {exp.saves}
        </span>
      )}
      {typeof exp.likes === 'number' && (
        <span className="flex items-center gap-0.5">
          <Icon name="thumb_up" size={14} /> {exp.likes}
        </span>
      )}
    </span>
  );
}

/** All card overlays (type pill + ribbon) positioned over a thumbnail. */
export function CardOverlays({ exp }: { exp: Experience }) {
  return (
    <>
      {exp.contentType && (
        <span className="absolute left-sm top-sm z-10">
          <TypeBadge type={exp.contentType} />
        </span>
      )}
      {exp.featured ? (
        <CornerRibbon label="Featured" tone="featured" />
      ) : exp.isNew ? (
        <CornerRibbon label="New!" tone="new" />
      ) : null}
    </>
  );
}
