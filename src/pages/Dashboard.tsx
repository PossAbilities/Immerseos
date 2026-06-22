import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Stage } from '@/components/Stage';
import { GlassPanel, PrimaryButton, SectionLabel, StatusPill } from '@/components/ui';
import { CardOverlays, SaveLikes } from '@/components/CardBadges';
import { useStore, currentExperience } from '@/store/useStore';
import { formatTime } from '@/lib/cn';

export function Dashboard() {
  const navigate = useNavigate();
  const operator = useStore((s) => s.operator);
  const experiences = useStore((s) => s.experiences);
  const current = useStore(currentExperience);
  const live = useStore((s) => s.live);
  const position = useStore((s) => s.positionSec);
  const goLive = useStore((s) => s.goLive);

  const userCount = experiences.filter((e) => !e.builtIn).length;
  const recent = experiences.slice(0, 4);
  const featured = experiences.filter((e) => e.featured);
  const fresh = experiences.filter((e) => e.isNew).slice(0, 5);

  // rotate the featured carousel
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (featured.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % featured.length), 5000);
    return () => clearInterval(t);
  }, [featured.length]);

  return (
    <div className="p-margin">
      <header className="mb-lg flex items-center justify-between">
        <div>
          <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
            Welcome back
          </p>
          <h2 className="text-headline-lg">{operator.split('@')[0] || 'Operator'}</h2>
        </div>
        <StatusPill label={live ? 'Room Live' : 'Room Idle'} tone={live ? 'live' : 'idle'} />
      </header>

      {/* featured carousel */}
      {featured.length > 0 && (
        <GlassPanel edge className="relative mb-gutter overflow-hidden p-0">
          <div className="relative aspect-[21/8] cursor-pointer" onClick={() => navigate(`/app/experience/${featured[slide].id}`)}>
            <Stage sceneId={featured[slide].sceneId} params={featured[slide].params} className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/50 to-transparent" />
            <div className="absolute bottom-0 left-0 max-w-lg p-lg">
              <span className="rounded bg-blue-600 px-sm py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Featured</span>
              <h3 className="mt-sm text-headline-lg">{featured[slide].title}</h3>
              <p className="text-body-md text-on-surface-variant">{featured[slide].tagline}</p>
            </div>
            {featured.length > 1 && (
              <div className="absolute bottom-md right-md flex gap-1">
                {featured.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setSlide(i); }}
                    className={i === slide ? 'h-2 w-6 rounded-full bg-primary' : 'h-2 w-2 rounded-full bg-white/40'}
                  />
                ))}
              </div>
            )}
          </div>
        </GlassPanel>
      )}

      <div className="grid grid-cols-12 gap-gutter">
        {/* now on stage */}
        <GlassPanel edge className="col-span-12 overflow-hidden p-0 lg:col-span-8">
          <div className="relative aspect-[21/9]">
            <Stage sceneId={current.sceneId} params={current.params} playing={live} className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
            <div className="absolute bottom-0 left-0 p-lg">
              <p className="text-label-sm uppercase tracking-widest text-secondary">
                {live ? 'Now on stage' : 'Loaded · Standby'}
              </p>
              <h3 className="mt-xs text-headline-lg">{current.title}</h3>
              <p className="text-body-md text-on-surface-variant">
                {formatTime(position)} / {formatTime(current.durationSec)}
              </p>
              <div className="mt-md flex gap-md">
                <PrimaryButton onClick={() => navigate(`/app/experience/${current.id}`)}>
                  Open Theater Control
                </PrimaryButton>
                <button
                  onClick={() => goLive(!live)}
                  className="glass rounded-lg px-md py-md text-label-md font-semibold transition-colors hover:bg-white/10"
                >
                  {live ? 'Stop Output' : 'Go Live'}
                </button>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* quick stats + actions */}
        <div className="col-span-12 space-y-gutter lg:col-span-4">
          <div className="grid grid-cols-2 gap-gutter">
            <GlassPanel className="p-md">
              <Icon name="auto_awesome" className="mb-sm text-primary" />
              <p className="text-headline-md">{experiences.length}</p>
              <p className="text-label-sm text-on-surface-variant">Total experiences</p>
            </GlassPanel>
            <GlassPanel className="p-md">
              <Icon name="brush" className="mb-sm text-secondary" />
              <p className="text-headline-md">{userCount}</p>
              <p className="text-label-sm text-on-surface-variant">Created by you</p>
            </GlassPanel>
          </div>
          <GlassPanel className="space-y-sm p-md">
            <SectionLabel>Quick Actions</SectionLabel>
            {[
              { icon: 'add', label: 'Create new experience', to: '/app/creator' },
              { icon: 'auto_awesome', label: 'Browse the library', to: '/app/library' },
              { icon: 'settings_remote', label: 'Pair a phone remote', to: '/app/remote' },
              { icon: 'tune', label: 'Calibrate the canvas', to: '/app/settings' },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="flex w-full items-center gap-base rounded-lg p-sm text-left text-body-md transition-colors hover:bg-white/5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container/20">
                  <Icon name={a.icon} className="text-primary" size={20} />
                </span>
                {a.label}
                <Icon name="chevron_right" className="ml-auto text-outline" size={18} />
              </button>
            ))}
          </GlassPanel>
        </div>
      </div>

      {/* curated rows */}
      <Row title="New from ImmerseOS" items={fresh.length ? fresh : recent} onOpen={(id) => navigate(`/app/experience/${id}`)} onViewAll={() => navigate('/app/library')} />
    </div>
  );
}

function Row({
  title,
  items,
  onOpen,
  onViewAll,
}: {
  title: string;
  items: import('@/lib/types').Experience[];
  onOpen: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <div className="mt-gutter">
      <div className="mb-md flex items-center justify-between">
        <SectionLabel>{title}</SectionLabel>
        <button onClick={onViewAll} className="text-label-md text-primary hover:underline">
          View all
        </button>
      </div>
      <div className="grid grid-cols-2 gap-gutter md:grid-cols-5">
        {items.map((e) => (
          <GlassPanel
            key={e.id}
            edge
            className="group cursor-pointer overflow-hidden p-0 transition-transform hover:-translate-y-1"
            onClick={() => onOpen(e.id)}
          >
            <div className="relative aspect-video">
              {e.thumbnail ? (
                <img src={e.thumbnail} alt={e.title} className="h-full w-full object-cover" />
              ) : (
                <Stage sceneId={e.sceneId} params={e.params} className="h-full w-full" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
              <CardOverlays exp={e} />
            </div>
            <div className="p-sm">
              <p className="truncate text-label-md font-semibold">{e.title}</p>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">{e.category}</span>
                <SaveLikes exp={e} />
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
