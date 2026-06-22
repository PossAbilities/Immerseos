import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Stage } from '@/components/Stage';
import { GlassPanel, StatusPill } from '@/components/ui';
import { useStore, currentExperience } from '@/store/useStore';
import { cn, formatTime } from '@/lib/cn';

const CATEGORIES = ['All', 'Nature', 'Sci-Fi', 'Abstract', 'Generative', 'Calm'];

export function Library() {
  const navigate = useNavigate();
  const experiences = useStore((s) => s.experiences);
  const live = useStore((s) => s.live);
  const loadExperience = useStore((s) => s.loadExperience);
  const goLive = useStore((s) => s.goLive);
  const current = useStore(currentExperience);

  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      experiences.filter(
        (e) =>
          (cat === 'All' || e.category === cat) &&
          (e.title.toLowerCase().includes(query.toLowerCase()) ||
            e.tagline.toLowerCase().includes(query.toLowerCase())),
      ),
    [experiences, cat, query],
  );

  const featured = filtered[0];

  const deploy = (id: string) => {
    loadExperience(id);
    goLive(true);
    navigate(`/app/experience/${id}`);
  };

  return (
    <div className="p-margin">
      {/* top bar */}
      <header className="mb-lg flex items-center justify-between gap-md">
        <div className="relative w-full max-w-md">
          <Icon
            name="search"
            className="absolute left-sm top-1/2 -translate-y-1/2 text-outline"
            size={20}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search immersive stages…"
            className="glass w-full rounded-full py-sm pl-xl pr-base text-body-md outline-none focus:border-primary/50"
          />
        </div>
        <StatusPill label={live ? 'Stage Live' : 'Stage Idle'} tone={live ? 'live' : 'idle'} />
      </header>

      <div className="mb-md flex items-end justify-between">
        <div>
          <h2 className="text-headline-lg">Experience Library</h2>
          <p className="text-body-md text-on-surface-variant">
            Select a scene to deploy to the room.
          </p>
        </div>
        <button
          onClick={() => navigate('/app/creator')}
          className="btn-bloom flex items-center gap-base rounded-lg bg-primary px-md py-sm text-label-md font-semibold text-on-primary"
        >
          <Icon name="add" size={20} /> New Experience
        </button>
      </div>

      {/* categories */}
      <div className="mb-lg flex flex-wrap gap-base">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              'rounded-full px-md py-xs text-label-md transition-colors',
              cat === c
                ? 'bg-primary text-on-primary'
                : 'glass text-on-surface-variant hover:bg-white/10',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* featured */}
      {featured && (
        <GlassPanel
          edge
          className="group relative mb-gutter overflow-hidden p-0"
        >
          <div className="relative aspect-[21/9] w-full">
            <Stage sceneId={featured.sceneId} params={featured.params} className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/40 to-transparent" />
            <div className="absolute bottom-0 left-0 max-w-lg p-lg">
              <span className="text-label-sm uppercase tracking-widest text-secondary">
                Featured · {featured.category}
              </span>
              <h3 className="mt-xs text-headline-lg">{featured.title}</h3>
              <p className="mt-sm text-body-md text-on-surface-variant">{featured.tagline}</p>
              <button
                onClick={() => deploy(featured.id)}
                className="btn-bloom mt-md flex items-center gap-base rounded-lg bg-primary px-md py-sm text-label-md font-semibold text-on-primary"
              >
                <Icon name="cast" size={20} /> Deploy to Stage
              </button>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* grid */}
      <div className="grid grid-cols-2 gap-gutter md:grid-cols-3 xl:grid-cols-4">
        {filtered.slice(1).map((e) => (
          <GlassPanel
            key={e.id}
            edge
            className="group cursor-pointer overflow-hidden p-0 transition-transform hover:-translate-y-1"
            onClick={() => navigate(`/app/experience/${e.id}`)}
          >
            <div className="relative aspect-video">
              <Stage sceneId={e.sceneId} params={e.params} className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface/90 to-transparent opacity-80" />
              {!e.builtIn && (
                <span className="absolute left-sm top-sm rounded-full bg-tertiary-container/80 px-sm py-0.5 text-label-sm text-white">
                  Yours
                </span>
              )}
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  deploy(e.id);
                }}
                className="absolute right-sm top-sm flex h-9 w-9 items-center justify-center rounded-full bg-primary/90 text-on-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                title="Deploy to stage"
              >
                <Icon name="play_arrow" filled size={20} />
              </button>
            </div>
            <div className="p-md">
              <p className="text-label-md font-semibold">{e.title}</p>
              <div className="mt-xs flex items-center justify-between text-label-sm text-on-surface-variant">
                <span>{e.category}</span>
                <span>{formatTime(e.durationSec)}</span>
              </div>
            </div>
          </GlassPanel>
        ))}

        {/* import / create tile */}
        <button
          onClick={() => navigate('/app/creator')}
          className="glass flex min-h-[180px] flex-col items-center justify-center gap-sm rounded-xl border-dashed text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Icon name="add_circle" size={36} />
          <span className="text-label-md">Create Experience</span>
        </button>
      </div>

      {/* now playing dock */}
      {live && (
        <div className="fixed bottom-margin right-margin z-50">
          <GlassPanel edge className="flex items-center gap-md p-sm pr-md">
            <div className="h-10 w-16 overflow-hidden rounded">
              <Stage sceneId={current.sceneId} params={current.params} className="h-full w-full" />
            </div>
            <div>
              <p className="text-label-sm uppercase tracking-widest text-secondary">Live Now</p>
              <p className="text-label-md font-semibold">{current.title}</p>
            </div>
            <button
              onClick={() => navigate(`/app/experience/${current.id}`)}
              className="ml-base flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary"
            >
              <Icon name="tune" size={20} />
            </button>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
