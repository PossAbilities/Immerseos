import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { cn } from '@/lib/cn';
import type { SceneElement } from '@/lib/types';

// Small interactive "atoms" placed on a surface. They animate as live previews
// in the editor (interactive=false) and become interactive on the projection.

export function TimerEl({ el }: { el: SceneElement }) {
  const total = el.duration ?? 60;
  const [left, setLeft] = useState(total);
  useEffect(() => {
    setLeft(total);
    const t = setInterval(() => setLeft((s) => (s <= 0 ? total : s - 1)), 1000);
    return () => clearInterval(t);
  }, [total]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-black/50" style={{ color: el.color }}>
      <Icon name="timer" />
      <span className="font-mono font-bold" style={{ fontSize: '28cqh' }}>{mm}:{ss}</span>
    </div>
  );
}

export function ScoreEl({ el, interactive }: { el: SceneElement; interactive?: boolean }) {
  const [n, setN] = useState(0);
  return (
    <button
      onClick={() => interactive && setN((v) => v + 1)}
      className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-black/50"
      style={{ color: el.color, cursor: interactive ? 'pointer' : 'default' }}
    >
      <span className="uppercase tracking-widest" style={{ fontSize: '14cqh' }}>{el.label ?? 'Score'}</span>
      <span className="font-mono font-bold" style={{ fontSize: '34cqh' }}>{n}</span>
    </button>
  );
}

export function ProgressEl({ el }: { el: SceneElement }) {
  const total = (el.duration ?? 30) * 1000;
  const [pct, setPct] = useState(0);
  const start = useRef(performance.now());
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = ((performance.now() - start.current) % total) / total;
      setPct(p * 100);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [total]);
  return (
    <div className="flex h-full w-full items-center overflow-hidden rounded-full bg-black/50 p-[10%]">
      <div className="h-full w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${pct}%`, background: el.color }} />
      </div>
    </div>
  );
}

/** A puzzle lock (number pad). On the correct code it fires onSolved (→ navigate). */
export function LockEl({ el, interactive, onSolved }: { el: SceneElement; interactive?: boolean; onSolved?: () => void }) {
  const [entry, setEntry] = useState('');
  const [state, setState] = useState<'idle' | 'ok' | 'bad'>('idle');
  const code = el.code ?? '1234';

  const press = (k: string) => {
    if (!interactive || state === 'ok') return; // don't accept input once solved
    if (k === 'clear') { setEntry(''); setState('idle'); return; }
    const next = (entry + k).slice(0, code.length);
    setEntry(next);
    if (next.length === code.length) {
      if (next === code) { setState('ok'); setTimeout(() => onSolved?.(), 500); }
      else { setState('bad'); setTimeout(() => { setEntry(''); setState('idle'); }, 700); }
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-[4%] rounded-xl bg-black/70 p-[6%]" style={{ outline: `2px solid ${el.color}` }}>
      <div className="flex items-center justify-center gap-[3%]">
        <Icon name={state === 'ok' ? 'lock_open' : 'lock'} style={{ color: el.color }} />
        <span className="font-mono tracking-[0.3em]" style={{ color: state === 'bad' ? '#ffb4ab' : el.color, fontSize: '14cqh' }}>
          {entry.padEnd(code.length, '•')}
        </span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-[3%]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0'].map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="flex items-center justify-center rounded-lg bg-white/10 font-bold hover:bg-white/20"
            style={{ color: '#fff', fontSize: '16cqh', pointerEvents: interactive ? 'auto' : 'none' }}
          >
            {k === 'clear' ? '⌫' : k}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A scratch-to-reveal panel: drag/touch erases the cover to show the image. */
export function WipeEl({ el, interactive }: { el: SceneElement; interactive?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const size = () => {
      c.width = c.clientWidth;
      c.height = c.clientHeight;
      ctx.globalCompositeOperation = 'source-over'; // repaint an opaque cover, not erase
      ctx.fillStyle = el.color ?? '#111317';
      ctx.fillRect(0, 0, c.width, c.height);
    };
    size();
    if (!interactive) return;
    let drawing = false;
    const erase = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(e.clientX - r.left, e.clientY - r.top, Math.max(12, c.width * 0.06), 0, 7);
      ctx.fill();
    };
    const down = (e: PointerEvent) => { drawing = true; erase(e); };
    const move = (e: PointerEvent) => { if (drawing) erase(e); };
    const up = () => { drawing = false; };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [el.color, interactive, el.src]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden rounded-lg')}>
      {el.src ? <img src={el.src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-surface-container text-on-surface-variant"><Icon name="image" /></div>}
      <canvas ref={ref} className="absolute inset-0 h-full w-full" style={{ touchAction: 'none', pointerEvents: interactive ? 'auto' : 'none' }} />
    </div>
  );
}
