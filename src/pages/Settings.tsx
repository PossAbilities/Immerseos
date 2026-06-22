import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Stage } from '@/components/Stage';
import { GlassPanel, PrimaryButton, SectionLabel, Slider } from '@/components/ui';
import { useStore, currentExperience } from '@/store/useStore';
import { cn } from '@/lib/cn';
import { HardwareSettings } from '@/components/HardwareSettings';

const PROJECTORS = ['Alpha', 'Beta', 'Gamma', 'Delta'];
const TABS = [
  { id: 'canvas', label: 'Canvas & Projection', icon: 'grid_view' },
  { id: 'hardware', label: 'Hardware', icon: 'router' },
  { id: 'network', label: 'Network', icon: 'lan' },
  { id: 'audio', label: 'Audio', icon: 'graphic_eq' },
  { id: 'about', label: 'About', icon: 'info' },
];

export function Settings() {
  const [tab, setTab] = useState('canvas');
  const current = useStore(currentExperience);
  const [overlap, setOverlap] = useState(128);
  const [gamma, setGamma] = useState(2.2);
  const [resolution, setResolution] = useState('16360 x 3140');

  return (
    <div className="p-margin">
      <header className="mb-lg">
        <h2 className="text-headline-lg">Settings</h2>
        <p className="text-body-md text-on-surface-variant">
          Calibrate the room, the network and the output.
        </p>
      </header>

      <div className="mb-lg flex flex-wrap gap-base">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-base rounded-full px-md py-sm text-label-md transition-colors',
              tab === t.id ? 'bg-primary text-on-primary' : 'glass text-on-surface-variant hover:bg-white/10',
            )}
          >
            <Icon name={t.icon} size={20} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'canvas' && (
        <div className="space-y-gutter">
          {/* projector strip */}
          <GlassPanel className="p-md">
            <div className="mb-md flex items-center justify-between">
              <SectionLabel>Canvas Layout · 360° panoramic output</SectionLabel>
              <PrimaryButton className="py-sm">Deploy Calibration</PrimaryButton>
            </div>
            <div className="grid grid-cols-2 gap-gutter md:grid-cols-4">
              {PROJECTORS.map((p) => (
                <div key={p} className="overflow-hidden rounded-lg border border-white/10">
                  <div className="relative aspect-video">
                    <Stage sceneId={current.sceneId} params={current.params} className="h-full w-full" />
                    <div className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[10px] text-secondary">
                      A-0{PROJECTORS.indexOf(p) + 1}
                    </div>
                  </div>
                  <p className="px-sm py-1 text-[11px] uppercase tracking-widest text-on-surface-variant">
                    Projector {p}
                  </p>
                </div>
              ))}
            </div>
          </GlassPanel>

          <div className="grid grid-cols-12 gap-gutter">
            {/* edge blending */}
            <GlassPanel className="col-span-12 space-y-md p-md lg:col-span-4">
              <div className="flex items-center gap-sm">
                <Icon name="gradient" className="text-primary" />
                <SectionLabel>Edge Blending</SectionLabel>
              </div>
              <div>
                <div className="mb-xs flex justify-between text-label-sm">
                  <span className="text-on-surface-variant">Overlap width</span>
                  <span>{overlap} px</span>
                </div>
                <Slider value={overlap} min={0} max={400} onChange={setOverlap} />
              </div>
              <div>
                <div className="mb-xs flex justify-between text-label-sm">
                  <span className="text-on-surface-variant">Gamma correction</span>
                  <span>{gamma.toFixed(1)}</span>
                </div>
                <Slider value={gamma} min={1} max={3} step={0.1} onChange={setGamma} />
              </div>
              <div className="h-16 rounded-lg bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </GlassPanel>

            {/* warping */}
            <GlassPanel className="col-span-12 space-y-md p-md lg:col-span-4">
              <div className="flex items-center gap-sm">
                <Icon name="crop_free" className="text-primary" />
                <SectionLabel>Warping & Geometry</SectionLabel>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 p-sm">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded border border-primary/30 transition-colors hover:bg-primary/20"
                  />
                ))}
              </div>
              <div className="flex justify-between text-label-sm text-on-surface-variant">
                <span>Mesh 32 × 18</span>
                <span>Wall radius 4500 mm</span>
              </div>
            </GlassPanel>

            {/* network nodes */}
            <GlassPanel className="col-span-12 space-y-sm p-md lg:col-span-4">
              <div className="flex items-center gap-sm">
                <Icon name="hub" className="text-primary" />
                <SectionLabel>Render Nodes</SectionLabel>
              </div>
              {[
                { n: 'RENDER-NODE-01', ping: '2 ms' },
                { n: 'RENDER-NODE-02', ping: '3 ms' },
                { n: 'SERVER-PRIMARY', ping: '1 ms' },
              ].map((node) => (
                <div key={node.n} className="glass flex items-center justify-between rounded-lg p-sm">
                  <div className="flex items-center gap-sm">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="text-label-sm">{node.n}</span>
                  </div>
                  <span className="text-label-sm text-on-surface-variant">{node.ping}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-surface-container-high/40 p-sm text-label-sm">
                <span className="text-on-surface-variant">Output resolution</span>
                <span className="text-primary">{resolution}</span>
              </div>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full rounded-lg bg-surface-container-low p-sm text-label-md outline-none"
              >
                <option>16360 x 3140</option>
                <option>10240 x 2160</option>
                <option>7680 x 1080</option>
              </select>
            </GlassPanel>
          </div>
        </div>
      )}

      {tab === 'hardware' && <HardwareSettings />}

      {tab === 'network' && (
        <GlassPanel className="space-y-md p-md">
          <SectionLabel>Stage Network</SectionLabel>
          {[
            { label: 'Stage subnet', value: '10.0.10.0 / 24' },
            { label: 'Remote relay port', value: '7501 (WebSocket)' },
            { label: 'Discovery', value: 'mDNS · immerseos.local' },
            { label: 'Latency budget', value: '< 120 ms end-to-end' },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b border-white/5 py-sm">
              <span className="text-on-surface-variant">{r.label}</span>
              <span className="font-mono text-label-md text-primary">{r.value}</span>
            </div>
          ))}
        </GlassPanel>
      )}

      {tab === 'audio' && (
        <GlassPanel className="space-y-md p-md">
          <SectionLabel>Spatial Audio</SectionLabel>
          {['Front Array', 'Surround Left', 'Surround Right', 'Subwoofer'].map((z) => (
            <div key={z}>
              <div className="mb-xs flex justify-between text-label-sm">
                <span className="text-on-surface-variant">{z}</span>
                <span>0 dB</span>
              </div>
              <Slider value={75} onChange={() => {}} />
            </div>
          ))}
        </GlassPanel>
      )}

      {tab === 'about' && (
        <GlassPanel className="space-y-sm p-lg">
          <h3 className="text-headline-md text-primary">ImmerseOS</h3>
          <p className="text-body-md text-on-surface-variant">
            An open operating system for immersive rooms — control, create and
            manage atmospheric projection experiences. Built for the
            PossAbilities immersive room.
          </p>
          <div className="grid grid-cols-2 gap-md pt-md md:grid-cols-4">
            {[
              ['Version', '1.0.0'],
              ['Engine', 'WebGL · GPU scenes'],
              ['Platform', 'Windows · Electron'],
              ['Licence', 'MIT'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">{k}</p>
                <p className="text-label-md">{v}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
