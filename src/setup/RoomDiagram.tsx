import { cn } from '@/lib/cn';
import { Icon } from '@/components/Icon';
import type { SurfaceDef, SurfaceId } from '@/lib/room';

// Grid placement for a top-down room plan.
const POS: Record<string, string> = {
  centre: 'col-start-2 row-start-1',
  left: 'col-start-1 row-start-2',
  floor: 'col-start-2 row-start-2',
  right: 'col-start-3 row-start-2',
  back: 'col-start-2 row-start-3',
  ceiling: 'col-start-1 row-start-1',
};

const ICON: Record<string, string> = {
  centre: 'wall_art',
  left: 'chevron_left',
  right: 'chevron_right',
  floor: 'grid_on',
  back: 'flip_to_back',
  ceiling: 'expand_less',
};

export function RoomDiagram({
  surfaces,
  selected,
  active,
  onPick,
}: {
  surfaces: SurfaceDef[];
  selected?: SurfaceId;
  active?: Set<SurfaceId>; // surfaces currently being touched
  onPick?: (surfaceId: SurfaceId, x: number, y: number) => void;
}) {
  return (
    <div className="mx-auto grid aspect-[4/3] w-full max-w-xl grid-cols-3 grid-rows-3 gap-base p-md">
      {surfaces
        .filter((s) => s.enabled)
        .map((s) => {
          const isActive = active?.has(s.id);
          const isSel = selected === s.id;
          return (
            <button
              key={s.id}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                onPick?.(s.id, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
              }}
              className={cn(
                'glass relative flex flex-col items-center justify-center rounded-lg p-sm text-center transition-all',
                POS[s.id] ?? 'col-start-2 row-start-2',
                isSel && 'ring-2 ring-primary',
                isActive && 'bg-primary/30',
              )}
            >
              <Icon
                name={ICON[s.id] ?? 'crop_square'}
                className={cn(isActive ? 'text-primary' : 'text-on-surface-variant')}
              />
              <span className="mt-xs text-label-sm">{s.label}</span>
              {s.touch && (
                <span className="absolute right-1 top-1 text-green-400">
                  <Icon name="check_circle" size={14} filled />
                </span>
              )}
            </button>
          );
        })}
      <div className="col-start-2 row-start-2 -z-10 flex items-center justify-center text-[10px] uppercase tracking-widest text-outline">
        room
      </div>
    </div>
  );
}
