import { useRef } from 'react';
import { Stage } from './Stage';
import { Icon } from './Icon';
import { Activity } from './Activity';
import { getScene } from '@/engine/scenes';
import { cn } from '@/lib/cn';
import type { SceneElement, SurfaceContent } from '@/lib/types';

function isVideo(src?: string) {
  return !!src && /\.(mp4|mov|webm|ogg)(\?|$)/i.test(src);
}

interface Props {
  content: SurfaceContent;
  surface?: string; // which surface this is (for activity touch routing)
  className?: string;
  editable?: boolean;
  selectedId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onMoveElement?: (id: string, x: number, y: number) => void;
  onHotspot?: (el: SceneElement) => void;
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
  className,
  editable,
  selectedId,
  onSelectElement,
  onMoveElement,
  onHotspot,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

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
      {content.backgroundSrc ? (
        isVideo(content.backgroundSrc) ? (
          <video src={content.backgroundSrc} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
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
        const style: React.CSSProperties = {
          left: `${el.x * 100}%`,
          top: `${el.y * 100}%`,
          width: `${el.w * 100}%`,
          height: `${el.h * 100}%`,
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
              <button
                onClick={(e) => { e.stopPropagation(); if (!editable) onHotspot?.(el); }}
                className="flex h-full w-full items-center justify-center rounded-full border-2 backdrop-blur-sm transition-transform hover:scale-105"
                style={{ borderColor: el.color, background: `${el.color}22` }}
              >
                <span className="flex flex-col items-center gap-1 text-center" style={{ color: el.color }}>
                  <Icon name="touch_app" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{el.label}</span>
                </span>
              </button>
            )}
            {el.type === 'activity' && (
              <Activity activityId={el.activityId ?? 'particles'} surface={surface} interactive={!editable} />
            )}
          </div>
        );
      })}
    </div>
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
