import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Stage } from '@/components/Stage';
import { GlassPanel, StatusPill } from '@/components/ui';
import { ExperienceDetails, type ExperienceDetailsValues } from '@/components/ExperienceDetails';
import { CardOverlays, SaveLikes } from '@/components/CardBadges';
import { useStore, currentExperience } from '@/store/useStore';
import { cn, formatTime } from '@/lib/cn';
import { SCENES } from '@/engine/scenes';
import type { Experience } from '@/lib/types';

const CATEGORIES = ['All', 'Nature', 'Sci-Fi', 'Abstract', 'Generative', 'Calm', 'Sensory', 'Festival'];

type DetailsState =
  | { mode: 'create' }
  | { mode: 'edit'; exp: Experience }
  | null;

/** A small thumbnail: the experience's image if set, else a live scene preview. */
function Thumb({ exp, className }: { exp: Experience; className?: string }) {
  return exp.thumbnail ? (
    <img src={exp.thumbnail} alt={exp.title} className={cn('object-cover', className)} />
  ) : (
    <Stage sceneId={exp.sceneId} params={exp.params} className={className} />
  );
}

export function Library() {
  const navigate = useNavigate();
  const experiences = useStore((s) => s.experiences);
  const collections = useStore((s) => s.collections);
  const live = useStore((s) => s.live);
  const current = useStore(currentExperience);
  const loadExperience = useStore((s) => s.loadExperience);
  const goLive = useStore((s) => s.goLive);
  const addExperience = useStore((s) => s.addExperience);
  const deleteExperience = useStore((s) => s.deleteExperience);
  const cloneExperience = useStore((s) => s.cloneExperience);
  const addCollection = useStore((s) => s.addCollection);
  const operator = useStore((s) => s.operator);

  const [collectionId, setCollectionId] = useState<string>('all');
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [owner, setOwner] = useState<'anyone' | 'mine'>('anyone');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [details, setDetails] = useState<DetailsState>(null);

  const filtered = useMemo(
    () =>
      experiences.filter(
        (e) =>
          (collectionId === 'all' || e.collectionId === collectionId) &&
          (cat === 'All' || e.category === cat) &&
          (owner === 'anyone' || (!e.builtIn && (!e.owner || e.owner === operator))) &&
          (e.title.toLowerCase().includes(query.toLowerCase()) ||
            e.tagline.toLowerCase().includes(query.toLowerCase())),
      ),
    [experiences, collectionId, cat, query, owner, operator],
  );

  const deploy = (id: string) => {
    loadExperience(id);
    goLive(true);
    navigate(`/app/experience/${id}`);
  };

  const createExperience = (v: ExperienceDetailsValues) => {
    const scene = SCENES[0];
    const exp: Experience = {
      id: `user-${Date.now()}`,
      sceneId: scene.id,
      tagline: `${v.category} · custom build`,
      accent: scene.accent,
      durationSec: 480,
      builtIn: false,
      createdAt: Date.now(),
      params: { ...scene.defaults },
      layers: [{ id: `${scene.id}-base`, type: 'scene', refId: scene.id, label: scene.name, start: 0, duration: 480 }],
      collectionId: collectionId !== 'all' ? collectionId : undefined,
      owner: operator,
      contentType: 'Scene',
      isNew: true,
      saves: 0,
      likes: 0,
      ...v,
    };
    addExperience(exp);
    setDetails(null);
    navigate(`/app/creator/${exp.id}`);
  };

  const saveDetails = (exp: Experience, v: ExperienceDetailsValues) => {
    addExperience({ ...exp, ...v, tagline: exp.tagline });
    setDetails(null);
  };

  return (
    <div className="p-margin" onClick={() => setMenuFor(null)}>
      <header className="mb-lg flex items-center justify-between gap-md">
        <div className="relative w-full max-w-md">
          <Icon name="search" className="absolute left-sm top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search experiences…"
            className="glass w-full rounded-full py-sm pl-xl pr-base text-body-md outline-none focus:border-primary/50"
          />
        </div>
        <StatusPill label={live ? 'Stage Live' : 'Stage Idle'} tone={live ? 'live' : 'idle'} />
      </header>

      <div className="grid grid-cols-12 gap-gutter">
        {/* collections rail */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-2">
          <div className="mb-sm flex items-center justify-between">
            <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">Collections</span>
            <button
              onClick={() => {
                const name = window.prompt('New collection name');
                if (name) {
                  const c = addCollection(name);
                  setCollectionId(c.id);
                }
              }}
              className="text-on-surface-variant hover:text-primary"
              title="New collection"
            >
              <Icon name="create_new_folder" size={18} />
            </button>
          </div>
          <nav className="space-y-1">
            <CollectionLink active={collectionId === 'all'} onClick={() => setCollectionId('all')} icon="apps" label="All experiences" count={experiences.length} />
            {collections.map((c) => (
              <CollectionLink
                key={c.id}
                active={collectionId === c.id}
                onClick={() => setCollectionId(c.id)}
                icon="folder"
                label={c.name}
                count={experiences.filter((e) => e.collectionId === c.id).length}
              />
            ))}
          </nav>
        </aside>

        {/* main */}
        <section className="col-span-12 lg:col-span-9 xl:col-span-10">
          <div className="mb-md flex items-end justify-between">
            <div>
              <h2 className="text-headline-lg">
                {collectionId === 'all' ? 'All experiences' : collections.find((c) => c.id === collectionId)?.name}
              </h2>
              <p className="text-body-md text-on-surface-variant">{filtered.length} experiences</p>
            </div>
            <div className="flex items-center gap-base">
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value as 'anyone' | 'mine')}
                className="glass rounded-lg px-md py-sm text-label-md outline-none"
              >
                <option value="anyone">Anyone</option>
                <option value="mine">My projects</option>
              </select>
              <div className="glass flex rounded-lg p-1">
                <button onClick={() => setView('grid')} className={cn('rounded p-1', view === 'grid' && 'bg-primary text-on-primary')}>
                  <Icon name="grid_view" size={18} />
                </button>
                <button onClick={() => setView('list')} className={cn('rounded p-1', view === 'list' && 'bg-primary text-on-primary')}>
                  <Icon name="view_list" size={18} />
                </button>
              </div>
              <button
                onClick={() => setDetails({ mode: 'create' })}
                className="btn-bloom flex items-center gap-base rounded-lg bg-primary px-md py-sm text-label-md font-semibold text-on-primary"
              >
                <Icon name="add" size={20} /> New Experience
              </button>
            </div>
          </div>

          {/* categories */}
          <div className="mb-lg flex flex-wrap gap-base">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn('rounded-full px-md py-xs text-label-md transition-colors', cat === c ? 'bg-primary text-on-primary' : 'glass text-on-surface-variant hover:bg-white/10')}
              >
                {c}
              </button>
            ))}
          </div>

          {/* grid / list */}
          <div className={view === 'grid' ? 'grid grid-cols-2 gap-gutter md:grid-cols-3 xl:grid-cols-4' : 'space-y-base'}>
            {filtered.map((e) =>
              view === 'grid' ? (
                <GlassPanel key={e.id} edge className="group relative cursor-pointer overflow-hidden p-0 transition-transform hover:-translate-y-1" onClick={() => navigate(`/app/experience/${e.id}`)}>
                  <div className="relative aspect-video">
                    <Thumb exp={e} className="h-full w-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface/90 to-transparent opacity-80" />
                    <CardOverlays exp={e} />
                    <CardMenu
                      e={e}
                      open={menuFor === e.id}
                      onToggle={(ev) => { ev.stopPropagation(); setMenuFor(menuFor === e.id ? null : e.id); }}
                      onAction={(a) => handleAction(a, e)}
                    />
                  </div>
                  <div className="p-md">
                    <p className="truncate text-label-md font-semibold">{e.title}</p>
                    <div className="mt-xs flex items-center justify-between text-label-sm text-on-surface-variant">
                      <span>{e.category}</span>
                      <SaveLikes exp={e} />
                    </div>
                  </div>
                </GlassPanel>
              ) : (
                <GlassPanel key={e.id} className="flex items-center gap-md p-sm" onClick={() => navigate(`/app/experience/${e.id}`)}>
                  <div className="h-12 w-20 shrink-0 overflow-hidden rounded">
                    <Thumb exp={e} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-label-md font-semibold">{e.title}</p>
                    <p className="truncate text-label-sm text-on-surface-variant">{e.category} · {formatTime(e.durationSec)}</p>
                  </div>
                  <div className="relative">
                    <CardMenu e={e} inline open={menuFor === e.id} onToggle={(ev) => { ev.stopPropagation(); setMenuFor(menuFor === e.id ? null : e.id); }} onAction={(a) => handleAction(a, e)} />
                  </div>
                </GlassPanel>
              ),
            )}

            <button
              onClick={() => setDetails({ mode: 'create' })}
              className="glass flex min-h-[160px] flex-col items-center justify-center gap-sm rounded-xl border-dashed text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Icon name="add_circle" size={36} />
              <span className="text-label-md">New Experience</span>
            </button>
          </div>
        </section>
      </div>

      {/* now playing dock */}
      {live && (
        <div className="fixed bottom-margin right-margin z-50">
          <GlassPanel edge className="flex items-center gap-md p-sm pr-md">
            <div className="h-10 w-16 overflow-hidden rounded">
              <Thumb exp={current} className="h-full w-full" />
            </div>
            <div>
              <p className="text-label-sm uppercase tracking-widest text-secondary">Live Now</p>
              <p className="text-label-md font-semibold">{current.title}</p>
            </div>
            <button onClick={() => navigate(`/app/experience/${current.id}`)} className="ml-base flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">
              <Icon name="tune" size={20} />
            </button>
          </GlassPanel>
        </div>
      )}

      {details?.mode === 'create' && (
        <ExperienceDetails initial={{}} submitLabel="Create" onSubmit={createExperience} onCancel={() => setDetails(null)} />
      )}
      {details?.mode === 'edit' && (
        <ExperienceDetails initial={details.exp} submitLabel="Save details" onSubmit={(v) => saveDetails(details.exp, v)} onCancel={() => setDetails(null)} />
      )}
    </div>
  );

  function handleAction(action: CardAction, e: Experience) {
    setMenuFor(null);
    if (action === 'deploy') deploy(e.id);
    else if (action === 'editor') navigate(`/app/editor/${e.id}`);
    else if (action === 'creator') navigate(`/app/creator/${e.id}`);
    else if (action === 'details') setDetails({ mode: 'edit', exp: e });
    else if (action === 'clone') cloneExperience(e.id);
    else if (action === 'delete') {
      if (!e.builtIn && window.confirm(`Delete "${e.title}"?`)) deleteExperience(e.id);
    }
  }
}

type CardAction = 'deploy' | 'creator' | 'editor' | 'details' | 'clone' | 'delete';

function CollectionLink({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: string; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-center gap-sm rounded-lg p-sm text-left transition-colors', active ? 'bg-white/5 text-primary' : 'text-on-surface-variant hover:bg-white/5')}
    >
      <Icon name={icon} size={20} />
      <span className="flex-1 truncate text-label-md">{label}</span>
      <span className="text-label-sm text-outline">{count}</span>
    </button>
  );
}

function CardMenu({
  e,
  open,
  inline,
  onToggle,
  onAction,
}: {
  e: Experience;
  open: boolean;
  inline?: boolean;
  onToggle: (ev: React.MouseEvent) => void;
  onAction: (a: CardAction) => void;
}) {
  const items: { a: CardAction; icon: string; label: string; disabled?: boolean }[] = [
    { a: 'deploy', icon: 'cast', label: 'Deploy to stage' },
    { a: 'editor', icon: 'view_in_ar', label: 'Wall Editor' },
    { a: 'creator', icon: 'tune', label: 'Open in Creator' },
    { a: 'details', icon: 'info', label: 'Edit details' },
    { a: 'clone', icon: 'content_copy', label: 'Clone' },
    { a: 'delete', icon: 'delete', label: 'Delete', disabled: e.builtIn },
  ];
  return (
    <>
      <button
        onClick={onToggle}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          inline ? 'glass hover:bg-white/10' : 'absolute right-sm top-sm bg-black/40 text-white opacity-0 group-hover:opacity-100',
        )}
        title="Actions"
      >
        <Icon name="more_horiz" size={18} />
      </button>
      {open && (
        <div className="absolute right-sm top-12 z-20 w-44 overflow-hidden rounded-lg border border-white/10 bg-surface-container py-1 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
          {items.map((it) => (
            <button
              key={it.a}
              disabled={it.disabled}
              onClick={() => onAction(it.a)}
              className="flex w-full items-center gap-sm px-md py-sm text-left text-label-md transition-colors hover:bg-white/5 disabled:opacity-30"
            >
              <Icon name={it.icon} size={18} className="text-on-surface-variant" />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
