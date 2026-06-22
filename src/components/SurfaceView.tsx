import { useRef } from 'react';
import { Stage } from './Stage';
import { Icon } from './Icon';
import { Activity } from './Activity';
import { EquirectSurface } from './EquirectSurface';
import { LockEl, ProgressEl, ScoreEl, TimerEl, WipeEl } from './SceneAtoms';
import { getScene } from '@/engine/scenes';
import { cn } from '@/lib/cn';
import { useStore } from '@/store/useStore';
import { conditionHolds, truthy } from '@/lib/atoms';
import type { SceneElement, SurfaceContent, TransitionType } from '@/lib/types';

export interface EquirectView {
  src: string;
  yawDeg: number;
  pitchDeg: number;
  hfovDeg: number;
}

function isVideo(src?: string) {
  return !!src && /\.(mp4|mov|webm|ogg)(\?|$)/i.test(src);
}

interface Props {
  content: SurfaceContent;
  surface?: string; // which surface this is (for activity touch routing)
  bgOverride?: React.CSSProperties; // scene-wide panorama/colour background slice
  equirect?: EquirectView; // 360 reprojection for this wall
  className?: string;
  editable?: boolean;
  selectedId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onMoveElement?: (id: string, x: number, y: number) => void;
  onHotspot?: (el: SceneElement) => void;
  transition?: { type: TransitionType; ms?: number }; // animate in on scene change
  transitionKey?: string; // remount the overlay (replay anim) when this changes
}

/**
 * Renders one surface's content — a background (generative scene, image or
 * video) plus absolutely-positioned elements. Shared by the wall editor
 * (editable: drag + select) and the live projection (interactive: hotspots).
 * Coordinates are 0..1 fractions of the surface.
 */
export function SurfaceView({
  content,
  surface,
  bgOverride,
  equirect,
  className,
  editable,
  selectedId,
  onSelectElement,
  onMoveElement,
  onHotspot,
  transition,
  transitionKey,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // live atom values drive element visibility & hotspot "completed" state at runtime
  const atoms = useStore((s) => s.atoms) ?? {};

  const startDrag = (e: React.PointerEvent, el: SceneElement) => {
    if (!editable || !onMoveElement) return;
    e.stopPropagation();
    onSelectElement?.(el.id);
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const offX = e.clientX - (box.left + el.x * box.width);
    const offY = e.clientY - (box.top + el.y * box.height);
    const move = (ev: PointerEvent) => {
      const nx = (ev.clientX - offX - box.left) / box.width;
      const ny = (ev.clientY - offY - box.top) / box.height;
      onMoveElement(el.id, Math.max(0, Math.min(1 - el.w, nx)), Math.max(0, Math.min(1 - el.h, ny)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden bg-black', className)}
      style={{ containerType: 'size' }}
      onPointerDown={() => editable && onSelectElement?.(null)}
    >
      {/* background */}
      {equirect ? (
        <EquirectSurface src={equirect.src} yawDeg={equirect.yawDeg} pitchDeg={equirect.pitchDeg} hfovDeg={equirect.hfovDeg} className="absolute inset-0 h-full w-full" />
      ) : bgOverride ? (
        <div className="absolute inset-0" style={bgOverride} />
      ) : content.backgroundSrc ? (
        isVideo(content.backgroundSrc) ? (
          <video src={content.backgroundSrc} autoPlay loop muted={content.backgroundMuted ?? true} playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <img src={content.backgroundSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : content.backgroundSceneId ? (
        <Stage sceneId={content.backgroundSceneId} params={getScene(content.backgroundSceneId).defaults} className="absolute inset-0 h-full w-full" />
      ) : (
        <div className="absolute inset-0 bg-surface-container-lowest" />
      )}

      {/* elements */}
      {content.elements.map((el) => {
        // runtime visibility gate (authoring always shows the element, dimmed)
        const gated = !!el.visibleIf && !conditionHolds(atoms, el.visibleIf);
        if (gated && !editable) return null;
        const style: React.CSSProperties = {
          left: `${el.x * 100}%`,
          top: `${el.y * 100}%`,
          width: `${el.w * 100}%`,
          height: `${el.h * 100}%`,
          opacity: gated ? 0.4 : undefined,
        };
        const selected = editable && selectedId === el.id;
        return (
          <div
            key={el.id}
            className={cn('absolute', editable ? 'cursor-move' : '', selected && 'outline outline-2 outline-primary')}
            style={style}
            onPointerDown={(e) => startDrag(e, el)}
          >
            {el.type === 'image' && (el.src ? <img src={el.src} alt="" className="h-full w-full object-contain" /> : <Placeholder icon="image" />)}
            {el.type === 'video' &&
              (el.src ? (
                <video src={el.src} autoPlay loop muted playsInline className="h-full w-full object-cover" />
              ) : (
                <Placeholder icon="movie" />
              ))}
            {el.type === 'web' && (
              editable ? (
                <Placeholder icon="public" label={el.src} />
              ) : (
                <iframe src={el.src} title="web" className="h-full w-full border-0" sandbox="allow-scripts allow-same-origin" />
              )
            )}
            {el.type === 'text' && (
              <div className="flex h-full w-full items-center justify-center text-center font-bold leading-tight" style={{ color: el.color, fontSize: `${(el.fontSize ?? 0.12) * 100}cqh`, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                {el.text}
              </div>
            )}
            {el.type === 'hotspot' && (
              <Hotspot el={el} editable={!!editable} completed={!!el.completedAtomId && truthy(atoms[el.completedAtomId])} onActivate={() => !editable && onHotspot?.(el)} />
            )}
            {el.type === 'activity' && (
              <Activity activityId={el.activityId ?? 'particles'} surface={surface} interactive={!editable} />
            )}
            {el.type === 'timer' && <TimerEl el={el} />}
            {el.type === 'score' && <ScoreEl el={el} interactive={!editable} />}
            {el.type === 'progress' && <ProgressEl el={el} />}
            {el.type === 'lock' && (
              <LockEl el={el} interactive={!editable} onSolved={() => (el.targetSceneId || el.setAtoms?.length) && onHotspot?.(el)} />
            )}
            {el.type === 'wipe' && <WipeEl el={el} interactive={!editable} />}
          </div>
        );
      })}

      {/* scene-change transition overlay (replayed via key on scene change) */}
      {transition && transition.type !== 'none' && (
        <div
          key={transitionKey}
          className={cn('pointer-events-none absolute inset-0 z-20', `scene-trans-${transition.type}`)}
          style={{ animationDuration: `${transition.ms ?? 600}ms` }}
        />
      )}
    </div>
  );
}

/** A hotspot with atom-aware visual states (ring / pulse / dot / invisible + done). */
function Hotspot({ el, editable, completed, onActivate }: { el: SceneElement; editable: boolean; completed: boolean; onActivate: () => void }) {
  const color = el.color ?? '#adc6ff';
  const style = el.hotspotStyle ?? 'ring';
  const invisible = style === 'invisible' && !completed;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onActivate(); }}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full transition-all',
        !invisible && 'border-2 backdrop-blur-sm hover:scale-105',
        style === 'pulse' && !completed && 'animate-pulse-ring',
        invisible && editable && 'border-2 border-dashed',
      )}
      style={{
        borderColor: invisible ? 'rgba(255,255,255,0.4)' : completed ? '#7dd1a0' : color,
        background: invisible ? 'transparent' : completed ? 'rgba(125,209,160,0.18)' : `${color}22`,
      }}
      title={el.label}
    >
      {!invisible && (
        <span className="flex flex-col items-center gap-1 text-center" style={{ color: completed ? '#7dd1a0' : color }}>
          {style === 'dot' ? (
            <span className="h-2/5 w-2/5 rounded-full" style={{ background: completed ? '#7dd1a0' : color }} />
          ) : (
            <Icon name={completed ? 'check_circle' : 'touch_app'} />
          )}
          {el.label && <span className="text-[10px] font-semibold uppercase tracking-wider">{el.label}</span>}
        </span>
      )}
    </button>
  );
}

function Placeholder({ icon, label }: { icon: string; label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 border border-dashed border-white/30 bg-black/40 text-on-surface-variant">
      <Icon name={icon} />
      {label && <span className="max-w-full truncate px-1 text-[10px]">{label}</span>}
    </div>
  );
}
