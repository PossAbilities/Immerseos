import { useEffect, useRef } from 'react';

/**
 * The signature ImmerseOS atmospheric backdrop — soft, slowly pulsing colour
 * fields blurred behind the glass UI. Drifts subtly with the pointer.
 */
export function Ambient() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      if (ref.current) {
        ref.current.style.transform = `translate(${x * 24}px, ${y * 24}px)`;
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        ref={ref}
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{ filter: 'blur(90px)', opacity: 0.4 }}
      >
        <div className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] animate-pulse-slow rounded-full bg-primary" />
        <div
          className="absolute -bottom-[20%] -right-[10%] h-[70%] w-[70%] animate-pulse-slow rounded-full bg-tertiary-container"
          style={{ animationDelay: '-2s' }}
        />
        <div
          className="absolute right-[10%] top-[20%] h-[40%] w-[40%] animate-pulse-slow rounded-full bg-secondary-container/30"
          style={{ animationDelay: '-4s' }}
        />
      </div>
    </div>
  );
}
