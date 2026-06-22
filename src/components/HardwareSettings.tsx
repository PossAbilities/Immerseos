import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { GlassPanel, PrimaryButton, SectionLabel } from './ui';
import { useDeviceStates } from '@/lib/hardwareBridge';
import { defaultPresetLevels } from '@/lib/hardware';
import type {
  AudioConfig,
  DeviceConfig,
  DeviceStatus,
  DiscoveredDevice,
  HardwareConfig,
  LightingConfig,
  ProjectorConfig,
  TestResult,
} from '@/lib/hardware';
import { cn } from '@/lib/cn';

const STATUS_TONE: Record<DeviceStatus, string> = {
  online: 'bg-green-400 text-green-400',
  connecting: 'bg-primary text-primary',
  error: 'bg-error text-error',
  offline: 'bg-outline text-outline',
};

const uid = () => Math.random().toString(36).slice(2, 9);

function newDevice(kind: DeviceConfig['kind']): DeviceConfig {
  const base = { id: uid(), name: '', enabled: true };
  if (kind === 'projector')
    return { ...base, kind, name: 'Projector', protocol: 'pjlink', host: '192.168.1.50', port: 4352, inputOnLive: '31' };
  if (kind === 'lighting')
    return {
      ...base,
      kind,
      name: 'House Lighting',
      protocol: 'artnet',
      host: '192.168.1.60',
      port: 6454,
      universe: 0,
      channels: { master: 1, red: 2, green: 3, blue: 4 },
      presets: defaultPresetLevels(),
    };
  return { ...base, kind, name: 'Audio Matrix', protocol: 'osc', host: '192.168.1.70', port: 9000, volumeAddress: '/room/master/volume', muteAddress: '/room/master/mute' };
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-xs w-full rounded-lg bg-surface-container-low p-sm text-label-md outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

export function HardwareSettings() {
  const [config, setConfig] = useState<HardwareConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [tests, setTests] = useState<Record<string, TestResult | 'testing'>>({});
  const [discovered, setDiscovered] = useState<DiscoveredDevice[] | null>(null);
  const [scanning, setScanning] = useState<'projector' | 'lighting' | null>(null);
  const states = useDeviceStates();
  const bridge = window.immerse?.hardware;

  useEffect(() => {
    if (bridge) bridge.getConfig().then(setConfig).catch(() => setConfig({ enabled: false, devices: [] }));
  }, [bridge]);

  if (!bridge) {
    return (
      <GlassPanel className="flex flex-col items-center gap-sm p-xl text-center">
        <Icon name="desktop_windows" size={40} className="text-on-surface-variant" />
        <h3 className="text-headline-md">Hardware control needs the desktop app</h3>
        <p className="max-w-md text-body-md text-on-surface-variant">
          Projector (PJLink), lighting (Art-Net / DMX) and audio (OSC) control runs
          from the ImmerseOS desktop application on the room PC. In the browser the
          room runs in on-screen simulation. The rest of ImmerseOS works here exactly
          the same.
        </p>
      </GlassPanel>
    );
  }

  if (!config) return <p className="text-on-surface-variant">Loading hardware…</p>;

  const update = (next: HardwareConfig) => {
    setConfig(next);
    setSaved(false);
  };
  const patchDevice = (id: string, patch: Partial<DeviceConfig>) =>
    update({
      ...config,
      devices: config.devices.map((d) => (d.id === id ? ({ ...d, ...patch } as DeviceConfig) : d)),
    });

  const save = () => {
    bridge.setConfig(config).then(() => setSaved(true)).catch(() => {});
  };

  const test = (d: DeviceConfig) => {
    setTests((t) => ({ ...t, [d.id]: 'testing' }));
    bridge
      .testDevice(d)
      .then((r) => setTests((t) => ({ ...t, [d.id]: r })))
      .catch((e) => setTests((t) => ({ ...t, [d.id]: { ok: false, message: String(e) } })));
  };

  const scan = (kind: 'projector' | 'lighting') => {
    setScanning(kind);
    setDiscovered(null);
    bridge
      .discover(kind)
      .then((list) => setDiscovered(list))
      .catch(() => setDiscovered([]))
      .finally(() => setScanning(null));
  };

  const addDiscovered = (dev: DiscoveredDevice) => {
    const base = newDevice(dev.kind);
    update({
      ...config,
      devices: [...config.devices, { ...base, host: dev.host, port: dev.port, name: dev.name || base.name }],
    });
  };

  return (
    <div className="space-y-gutter">
      <GlassPanel className="flex items-center justify-between p-md">
        <div>
          <SectionLabel>Hardware Control</SectionLabel>
          <p className="mt-xs text-body-md text-on-surface-variant">
            Drive real projectors, lighting and audio from the room state.
          </p>
        </div>
        <div className="flex items-center gap-md">
          <label className="flex items-center gap-sm">
            <span className="text-label-md">Master enable</span>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => update({ ...config, enabled: e.target.checked })}
              className="h-5 w-5 accent-primary"
            />
          </label>
          <PrimaryButton className="py-sm" onClick={save}>
            {saved ? 'Saved ✓' : 'Save & Apply'}
          </PrimaryButton>
        </div>
      </GlassPanel>

      <div className="flex flex-wrap items-center gap-base">
        {(['projector', 'lighting', 'audio'] as const).map((k) => (
          <button
            key={k}
            onClick={() => update({ ...config, devices: [...config.devices, newDevice(k)] })}
            className="glass flex items-center gap-base rounded-lg px-md py-sm text-label-md capitalize transition-colors hover:bg-white/10"
          >
            <Icon name="add" size={18} /> Add {k}
          </button>
        ))}
        <span className="mx-sm h-6 w-px bg-white/10" />
        <button
          onClick={() => scan('projector')}
          disabled={!!scanning}
          className="glass flex items-center gap-base rounded-lg px-md py-sm text-label-md transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <Icon name={scanning === 'projector' ? 'sync' : 'travel_explore'} size={18} className={scanning === 'projector' ? 'animate-spin' : ''} />
          Scan projectors
        </button>
        <button
          onClick={() => scan('lighting')}
          disabled={!!scanning}
          className="glass flex items-center gap-base rounded-lg px-md py-sm text-label-md transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <Icon name={scanning === 'lighting' ? 'sync' : 'travel_explore'} size={18} className={scanning === 'lighting' ? 'animate-spin' : ''} />
          Scan Art-Net
        </button>
      </div>

      {/* discovery results */}
      {(scanning || discovered) && (
        <GlassPanel className="p-md">
          <SectionLabel>Discovered on the network</SectionLabel>
          {scanning ? (
            <p className="mt-sm text-body-md text-on-surface-variant">
              Scanning the local network for {scanning === 'projector' ? 'PJLink projectors' : 'Art-Net nodes'}…
            </p>
          ) : discovered && discovered.length > 0 ? (
            <ul className="mt-sm space-y-base">
              {discovered.map((dev) => (
                <li key={`${dev.host}:${dev.port}`} className="flex items-center justify-between rounded-lg bg-surface-container-low p-sm">
                  <div className="flex items-center gap-sm">
                    <Icon name={dev.kind === 'projector' ? 'cast' : 'lightbulb'} className="text-primary" size={20} />
                    <div>
                      <p className="text-label-md">{dev.name || dev.host}</p>
                      <p className="text-label-sm text-on-surface-variant">{dev.host}:{dev.port}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => addDiscovered(dev)}
                    className="rounded-lg bg-primary px-md py-xs text-label-sm font-semibold text-on-primary"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-sm text-body-md text-on-surface-variant">
              Nothing found. Check the devices are powered on and on the same network — or add one manually above.
            </p>
          )}
        </GlassPanel>
      )}

      {config.devices.length === 0 && (
        <p className="text-body-md text-on-surface-variant">
          No devices configured — add a projector, lighting node or audio endpoint above.
        </p>
      )}

      <div className="grid gap-gutter md:grid-cols-2">
        {config.devices.map((d) => {
          const st = states.find((s) => s.id === d.id);
          const tone = STATUS_TONE[st?.status ?? 'offline'];
          return (
            <GlassPanel key={d.id} edge className="space-y-md p-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <Icon
                    name={d.kind === 'projector' ? 'cast' : d.kind === 'lighting' ? 'lightbulb' : 'graphic_eq'}
                    className="text-primary"
                  />
                  <input
                    value={d.name}
                    onChange={(e) => patchDevice(d.id, { name: e.target.value })}
                    className="bg-transparent text-body-md font-semibold outline-none"
                  />
                </div>
                <div className="flex items-center gap-sm">
                  <span className={cn('flex items-center gap-1 text-label-sm', tone.split(' ')[1])}>
                    <span className={cn('h-2 w-2 rounded-full', tone.split(' ')[0])} />
                    {st?.status ?? 'offline'}
                  </span>
                  <button
                    onClick={() => update({ ...config, devices: config.devices.filter((x) => x.id !== d.id) })}
                    className="text-outline hover:text-error"
                    title="Remove device"
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-sm text-label-md">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) => patchDevice(d.id, { enabled: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Enabled
              </label>

              <div className="grid grid-cols-2 gap-base">
                <Field label="Host / IP" value={d.host} onChange={(v) => patchDevice(d.id, { host: v })} />
                <Field label="Port" type="number" value={d.port} onChange={(v) => patchDevice(d.id, { port: Number(v) })} />
              </div>

              {d.kind === 'projector' && (
                <div className="grid grid-cols-2 gap-base">
                  <Field
                    label="PJLink password"
                    value={(d as ProjectorConfig).password ?? ''}
                    onChange={(v) => patchDevice(d.id, { password: v } as Partial<ProjectorConfig>)}
                  />
                  <Field
                    label="Input on live"
                    value={(d as ProjectorConfig).inputOnLive ?? ''}
                    onChange={(v) => patchDevice(d.id, { inputOnLive: v } as Partial<ProjectorConfig>)}
                  />
                </div>
              )}

              {d.kind === 'lighting' && (
                <div className="space-y-base">
                  <div className="grid grid-cols-2 gap-base">
                    <Field
                      label="Universe"
                      type="number"
                      value={(d as LightingConfig).universe}
                      onChange={(v) => patchDevice(d.id, { universe: Number(v) } as Partial<LightingConfig>)}
                    />
                    <Field
                      label="Master ch."
                      type="number"
                      value={(d as LightingConfig).channels.master ?? 0}
                      onChange={(v) =>
                        patchDevice(d.id, {
                          channels: { ...(d as LightingConfig).channels, master: Number(v) },
                        } as Partial<LightingConfig>)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-base">
                    {(['red', 'green', 'blue'] as const).map((c) => (
                      <Field
                        key={c}
                        label={`${c[0].toUpperCase()}${c.slice(1)} ch.`}
                        type="number"
                        value={(d as LightingConfig).channels[c] ?? 0}
                        onChange={(v) =>
                          patchDevice(d.id, {
                            channels: { ...(d as LightingConfig).channels, [c]: Number(v) },
                          } as Partial<LightingConfig>)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {d.kind === 'audio' && (
                <div className="grid grid-cols-1 gap-base">
                  <Field
                    label="Volume OSC address"
                    value={(d as AudioConfig).volumeAddress}
                    onChange={(v) => patchDevice(d.id, { volumeAddress: v } as Partial<AudioConfig>)}
                  />
                  <Field
                    label="Mute OSC address"
                    value={(d as AudioConfig).muteAddress ?? ''}
                    onChange={(v) => patchDevice(d.id, { muteAddress: v } as Partial<AudioConfig>)}
                  />
                </div>
              )}

              <div className="flex items-center gap-md pt-xs">
                <button
                  onClick={() => test(d)}
                  className="glass flex items-center gap-base rounded-lg px-md py-xs text-label-sm transition-colors hover:bg-white/10"
                >
                  <Icon
                    name={tests[d.id] === 'testing' ? 'sync' : 'wifi_tethering'}
                    size={16}
                    className={tests[d.id] === 'testing' ? 'animate-spin' : ''}
                  />
                  Test connection
                </button>
                {tests[d.id] && tests[d.id] !== 'testing' && (
                  <span
                    className={cn(
                      'text-label-sm',
                      (tests[d.id] as TestResult).ok ? 'text-green-400' : 'text-error',
                    )}
                  >
                    {(tests[d.id] as TestResult).ok ? '✓ ' : '⚠ '}
                    {(tests[d.id] as TestResult).message}
                  </span>
                )}
              </div>

              {st?.status === 'error' && st.lastError && (
                <p className="text-label-sm text-error">⚠ {st.lastError}</p>
              )}
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
