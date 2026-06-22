import { useState } from 'react';
import { Icon } from './Icon';
import { GlassPanel, PrimaryButton } from './ui';
import type { Experience, ExperienceVisibility } from '@/lib/types';

const CATEGORIES = ['Nature', 'Sci-Fi', 'Abstract', 'Generative', 'Calm', 'Sensory', 'Festival'];
const SECTORS = ['—', 'Education / SEN', 'Healthcare', 'Care & Wellbeing', 'Events', 'Retail'];
const TYPES = ['—', 'Holding Screen', 'Main Menu', 'Zone', 'Activity', 'Relaxation', 'Stage'];
const VISIBILITY: { id: ExperienceVisibility; label: string }[] = [
  { id: 'private', label: 'Only me' },
  { id: 'team', label: 'My team' },
  { id: 'public', label: 'Everyone' },
];

/** Read a chosen image file as a data URL for thumbnails / screenshots. */
function readImage(onDone: (dataUrl: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onDone(reader.result as string);
    reader.readAsDataURL(file);
  };
  input.click();
}

export type ExperienceDetailsValues = Pick<
  Experience,
  | 'title'
  | 'description'
  | 'category'
  | 'sector'
  | 'experienceType'
  | 'visibility'
  | 'canClone'
  | 'thumbnail'
  | 'screenshots'
>;

/** The "Experience Details" form (matches the supplier's create/edit step). */
export function ExperienceDetails({
  initial,
  submitLabel = 'Save',
  onSubmit,
  onCancel,
}: {
  initial: Partial<ExperienceDetailsValues>;
  submitLabel?: string;
  onSubmit: (v: ExperienceDetailsValues) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<ExperienceDetailsValues>({
    title: initial.title ?? '',
    description: initial.description ?? '',
    category: initial.category ?? 'Generative',
    sector: initial.sector ?? '—',
    experienceType: initial.experienceType ?? '—',
    visibility: initial.visibility ?? 'private',
    canClone: initial.canClone ?? true,
    thumbnail: initial.thumbnail,
    screenshots: initial.screenshots ?? [],
  });
  const set = <K extends keyof ExperienceDetailsValues>(k: K, val: ExperienceDetailsValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-gutter backdrop-blur-sm">
      <GlassPanel edge className="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-0 custom-scrollbar">
        <header className="rounded-t-xl bg-surface-container-high/60 px-lg py-md">
          <h2 className="text-headline-md">Experience Details</h2>
        </header>
        <div className="grid gap-lg p-lg md:grid-cols-[1fr_240px]">
          <div className="space-y-md">
            <label className="block">
              <span className="text-label-sm text-on-surface-variant">Title of experience</span>
              <input
                value={v.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Summer of Love — Main Menu"
                className="mt-xs w-full rounded-lg bg-surface-container-low p-sm text-body-md outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="text-label-sm text-on-surface-variant">Description</span>
              <textarea
                value={v.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                placeholder="Type here…"
                className="mt-xs w-full resize-y rounded-lg bg-surface-container-low p-sm text-body-md outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <div className="grid grid-cols-2 gap-md">
              <Select label="Share with" value={v.visibility ?? 'private'} onChange={(x) => set('visibility', x as ExperienceVisibility)} options={VISIBILITY.map((o) => o.id)} render={(id) => VISIBILITY.find((o) => o.id === id)?.label ?? id} />
              <label className="flex items-end gap-sm pb-sm">
                <input type="checkbox" checked={v.canClone} onChange={(e) => set('canClone', e.target.checked)} className="h-5 w-5 accent-primary" />
                <span className="text-label-md">Others can clone</span>
              </label>
              <Select label="Category" value={v.category} onChange={(x) => set('category', x)} options={CATEGORIES} />
              <Select label="Sector" value={v.sector ?? '—'} onChange={(x) => set('sector', x)} options={SECTORS} />
              <Select label="Experience type" value={v.experienceType ?? '—'} onChange={(x) => set('experienceType', x)} options={TYPES} />
            </div>
          </div>

          <div className="space-y-md">
            <div>
              <span className="text-label-sm text-on-surface-variant">Thumbnail</span>
              <button
                onClick={() => readImage((url) => set('thumbnail', url))}
                className="mt-xs flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-surface-container-low transition-colors hover:border-primary/50"
              >
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt="thumbnail" className="h-full w-full object-cover" />
                ) : (
                  <Icon name="add_photo_alternate" className="text-outline" />
                )}
              </button>
            </div>
            <div>
              <span className="text-label-sm text-on-surface-variant">Screenshots</span>
              <div className="mt-xs grid grid-cols-2 gap-base">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    onClick={() =>
                      readImage((url) => {
                        const next = [...(v.screenshots ?? [])];
                        next[i] = url;
                        set('screenshots', next);
                      })
                    }
                    className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-surface-container-low transition-colors hover:border-primary/50"
                  >
                    {v.screenshots?.[i] ? (
                      <img src={v.screenshots[i]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon name="add" size={18} className="text-outline" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <footer className="flex justify-end gap-base border-t border-white/5 px-lg py-md">
          <button onClick={onCancel} className="glass rounded-lg px-md py-sm text-label-md transition-colors hover:bg-white/10">
            Cancel
          </button>
          <PrimaryButton className="py-sm" onClick={() => onSubmit(v)} disabled={!v.title.trim()}>
            {submitLabel}
          </PrimaryButton>
        </footer>
      </GlassPanel>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  render,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  render?: (v: string) => string;
}) {
  return (
    <label className="block">
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-xs w-full rounded-lg bg-surface-container-low p-sm text-label-md outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {render ? render(o) : o}
          </option>
        ))}
      </select>
    </label>
  );
}
