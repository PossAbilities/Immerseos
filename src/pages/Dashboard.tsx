import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Stage } from '@/components/Stage';
import { GlassPanel, PrimaryButton, SectionLabel, StatusPill } from '@/components/ui';
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

      {/* recents */}
      <div className="mt-gutter">
        <div className="mb-md flex items-center justify-between">
          <SectionLabel>Recently Added</SectionLabel>
          <button onClick={() => navigate('/app/library')} className="text-label-md text-primary hover:underline">
            View all
          </button>
        </div>
        <div className="grid grid-cols-2 gap-gutter md:grid-cols-4">
          {recent.map((e) => (
            <GlassPanel
              key={e.id}
              edge
              className="group cursor-pointer overflow-hidden p-0 transition-transform hover:-translate-y-1"
              onClick={() => navigate(`/app/experience/${e.id}`)}
            >
              <div className="relative aspect-video">
                <Stage sceneId={e.sceneId} params={e.params} className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
              </div>
              <div className="p-sm">
                <p className="text-label-md font-semibold">{e.title}</p>
                <p className="text-label-sm text-on-surface-variant">{e.category}</p>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
