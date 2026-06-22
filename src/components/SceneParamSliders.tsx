import { Icon } from './Icon';
import { Slider } from './ui';
import { SCENE_PARAM_CONFIG, formatParam } from '@/lib/presets';
import type { SceneParams } from '@/lib/types';

/** The four live scene tuning controls, shared by Theater Control and Creator. */
export function SceneParamSliders({
  params,
  onChange,
  columns = 2,
}: {
  params: SceneParams;
  onChange: (key: keyof SceneParams, value: number) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={columns === 2 ? 'grid grid-cols-2 gap-md' : 'space-y-md'}>
      {SCENE_PARAM_CONFIG.map((c) => (
        <div key={c.key}>
          <div className="mb-xs flex items-center justify-between text-label-sm">
            <span className="flex items-center gap-xs text-on-surface-variant">
              <Icon name={c.icon} size={16} /> {c.label}
            </span>
            <span>{formatParam(c.key, params[c.key])}</span>
          </div>
          <Slider
            value={params[c.key]}
            min={0}
            max={c.max}
            step={0.01}
            onChange={(v) => onChange(c.key, v)}
          />
        </div>
      ))}
    </div>
  );
}
