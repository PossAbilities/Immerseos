import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { GlassPanel, PrimaryButton, SectionLabel } from '@/components/ui';
import { cn } from '@/lib/cn';
import { RoomDiagram } from './RoomDiagram';
import { useDisplays, useRoomProfile, isElectron } from '@/lib/roomBridge';
import { useSensorStates } from '@/lib/sensorBridge';
import { onSurfaceTouch, emitSurfaceTouch } from '@/lib/touchBus';
import { broadcastTouch } from '@/store/useStore';
import { defaultSensorsConfig, type SensorsConfig } from '@/lib/sensors';
import type { CalibrationProgress, CaptureResult } from '@/lib/sensors';
import type { RoomProfile, SurfaceDef, SurfaceId } from '@/lib/room';

const STEPS = ['Detect', 'Assign', 'Calibrate', 'Test', 'Finish'] as const;

const uid = () => Math.random().toString(36).slice(2, 9);

export function SetupWizard({ onDone }: { onDone?: () => void }) {
  const { profile, save } = useRoomProfile();
  const displays = useDisplays();
  const sensorStates = useSensorStates();
  const electron = isElectron();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RoomProfile | null>(null);
  const [sensorsCfg, setSensorsCfg] = useState<SensorsConfig>(defaultSensorsConfig());

  // seed the working copy once the profile loads
  useEffect(() => {
    if (profile && !draft) setDraft(structuredClone(profile));
  }, [profile, draft]);

  useEffect(() => {
    window.immerse?.sensors?.getConfig().then(setSensorsCfg).catch(() => {});
  }, []);

  if (!draft) return <p className="p-margin text-on-surface-variant">Loading room…</p>;

  const enabledSurfaces = draft.surfaces.filter((s) => s.enabled);

  const patchSurface = (id: SurfaceId, patch: Partial<SurfaceDef>) =>
    setDraft((d) =>
      d ? { ...d, surfaces: d.surfaces.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : d,
    );

  const saveSensors = (cfg: SensorsConfig) => {
    setSensorsCfg(cfg);
    window.immerse?.sensors?.setConfig(cfg).catch(() => {});
  };

  const finish = async () => {
    const done: RoomProfile = { ...draft, setupComplete: true, updatedAt: Date.now() };
    await save(done);
    await window.immerse?.room?.openProjections().catch(() => {});
    onDone?.();
  };

  return (
    <div className="mx-auto max-w-5xl p-margin">
      {/* stepper */}
      <ol className="mb-lg flex items-center gap-base">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-base">
            <button
              onClick={() => setStep(i)}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-sm font-bold transition-colors',
                i === step
                  ? 'bg-primary text-on-primary'
                  : i < step
                    ? 'bg-primary-container/40 text-primary'
                    : 'glass text-on-surface-variant',
              )}
            >
              {i < step ? <Icon name="check" size={16} /> : i + 1}
            </button>
            <span className={cn('text-label-md', i === step ? 'text-primary' : 'text-on-surface-variant')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-white/10" />}
          </li>
        ))}
      </ol>

      {!electron && (
        <GlassPanel className="mb-gutter flex items-center gap-sm p-md">
          <Icon name="science" className="text-secondary" />
          <p className="text-label-md text-on-surface-variant">
            Simulated mode — you're in the browser. Click the walls in the diagrams to stand in for
            real touches. On the desktop app this uses your real sensors.
          </p>
        </GlassPanel>
      )}

      {step === 0 && <DetectStep sensorsCfg={sensorsCfg} saveSensors={saveSensors} sensorStates={sensorStates} electron={electron} />}
      {step === 1 && <AssignStep draft={draft} patchSurface={patchSurface} displays={displays} />}
      {step === 2 && (
        <CalibrateStep surfaces={enabledSurfaces} patchSurface={patchSurface} electron={electron} sensorStates={sensorStates} />
      )}
      {step === 3 && <TestStep surfaces={enabledSurfaces} electron={electron} />}
      {step === 4 && <FinishStep surfaces={enabledSurfaces} />}

      {/* nav */}
      <div className="mt-gutter flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="glass rounded-lg px-md py-sm text-label-md transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <PrimaryButton className="py-sm" onClick={() => setStep((s) => s + 1)}>
            Next
          </PrimaryButton>
        ) : (
          <PrimaryButton className="flex items-center gap-base py-sm" onClick={finish}>
            <Icon name="check" size={18} /> Finish setup
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DetectStep({
  sensorsCfg,
  saveSensors,
  sensorStates,
  electron,
}: {
  sensorsCfg: SensorsConfig;
  saveSensors: (c: SensorsConfig) => void;
  sensorStates: ReturnType<typeof useSensorStates>;
  electron: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const [projectors, setProjectors] = useState<{ host: string; name?: string }[] | null>(null);
  const [foundSensors, setFoundSensors] = useState<{ host: string; port: number }[] | null>(null);

  const detect = async () => {
    setScanning(true);
    setProjectors(null);
    setFoundSensors(null);
    try {
      const [proj, sens] = await Promise.all([
        window.immerse?.hardware?.discover('projector') ?? Promise.resolve([]),
        window.immerse?.sensors?.detect() ?? Promise.resolve([]),
      ]);
      setProjectors(proj);
      setFoundSensors(sens);
    } finally {
      setScanning(false);
    }
  };

  const addSensor = (host: string, port: number) => {
    const exists = sensorsCfg.sensors.some((s) => s.port === port);
    const next: SensorsConfig = {
      enabled: true,
      sensors: exists
        ? sensorsCfg.sensors
        : [...sensorsCfg.sensors, { id: uid(), name: `Sensor ${host}`, enabled: true, protocol: 'tuio', port }],
    };
    saveSensors(next);
  };

  return (
    <GlassPanel edge className="space-y-md p-lg">
      <div>
        <h2 className="text-headline-md">Let's find your room</h2>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Power on your projectors and touch sensors (laser/LiDAR or cameras), make sure they're on
          the same network, then scan. ImmerseOS listens for them automatically.
        </p>
      </div>

      <PrimaryButton
        className="flex items-center gap-base py-sm disabled:opacity-50"
        onClick={detect}
        disabled={scanning || !electron}
      >
        <Icon name={scanning ? 'sync' : 'travel_explore'} size={18} className={scanning ? 'animate-spin' : ''} />
        {scanning ? 'Scanning…' : 'Scan the room'}
      </PrimaryButton>
      {!electron && (
        <p className="text-label-sm text-on-surface-variant">
          (Scanning needs the desktop app — you can still continue and configure surfaces in simulated mode.)
        </p>
      )}

      <div className="grid gap-gutter md:grid-cols-2">
        <div>
          <SectionLabel>Projectors</SectionLabel>
          <div className="mt-sm space-y-base">
            {projectors?.length ? (
              projectors.map((p) => (
                <div key={p.host} className="glass flex items-center gap-sm rounded-lg p-sm">
                  <Icon name="cast" className="text-primary" size={20} />
                  <span className="text-label-md">{p.name || p.host}</span>
                  <span className="ml-auto text-label-sm text-on-surface-variant">{p.host}</span>
                </div>
              ))
            ) : (
              <p className="text-label-sm text-on-surface-variant">
                {projectors ? 'None found yet.' : 'Not scanned yet.'}
              </p>
            )}
          </div>
        </div>

        <div>
          <SectionLabel>Touch sensors</SectionLabel>
          <div className="mt-sm space-y-base">
            {foundSensors?.length ? (
              foundSensors.map((s) => {
                const added = sensorsCfg.sensors.some((x) => x.port === s.port);
                return (
                  <div key={`${s.host}:${s.port}`} className="glass flex items-center gap-sm rounded-lg p-sm">
                    <Icon name="sensors" className="text-secondary" size={20} />
                    <span className="text-label-md">{s.host}</span>
                    <button
                      onClick={() => addSensor(s.host, s.port)}
                      disabled={added}
                      className="ml-auto rounded-lg bg-primary px-md py-xs text-label-sm font-semibold text-on-primary disabled:opacity-50"
                    >
                      {added ? 'Added' : 'Add'}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-label-sm text-on-surface-variant">
                {foundSensors ? 'No TUIO sensors detected yet.' : 'Not scanned yet.'}
              </p>
            )}
            {/* live status of configured sensors */}
            {sensorStates.map((st) => (
              <div key={st.id} className="flex items-center gap-sm text-label-sm">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    st.status === 'active' ? 'animate-pulse bg-secondary' : st.status === 'error' ? 'bg-error' : 'bg-outline',
                  )}
                />
                Sensor {st.id.slice(0, 4)} — {st.status}
                {st.pointsPerSec ? ` · ${st.pointsPerSec}/s` : ''}
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

// ---------------------------------------------------------------------------

function AssignStep({
  draft,
  patchSurface,
  displays,
}: {
  draft: RoomProfile;
  patchSurface: (id: SurfaceId, p: Partial<SurfaceDef>) => void;
  displays: ReturnType<typeof useDisplays>;
}) {
  return (
    <GlassPanel edge className="space-y-md p-lg">
      <div>
        <h2 className="text-headline-md">Which surfaces does your room have?</h2>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Turn on the walls and floor you project onto, and (on the desktop app) pick which display
          drives each one.
        </p>
      </div>
      <div className="space-y-base">
        {draft.surfaces.map((s) => (
          <div key={s.id} className="glass flex flex-wrap items-center gap-md rounded-lg p-sm">
            <label className="flex items-center gap-sm">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) => patchSurface(s.id, { enabled: e.target.checked })}
                className="h-5 w-5 accent-primary"
              />
              <span className="w-28 text-label-md">{s.label}</span>
            </label>
            {s.enabled && displays.length > 0 && (
              <label className="flex items-center gap-sm text-label-sm text-on-surface-variant">
                Display
                <select
                  value={s.displayId ?? ''}
                  onChange={(e) =>
                    patchSurface(s.id, { displayId: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="rounded-lg bg-surface-container-low p-sm text-label-md outline-none"
                >
                  <option value="">Auto</option>
                  {displays.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

// ---------------------------------------------------------------------------

function CalibrateStep({
  surfaces,
  patchSurface,
  electron,
  sensorStates,
}: {
  surfaces: SurfaceDef[];
  patchSurface: (id: SurfaceId, p: Partial<SurfaceDef>) => void;
  electron: boolean;
  sensorStates: ReturnType<typeof useSensorStates>;
}) {
  const [capturing, setCapturing] = useState<SurfaceId | null>(null);
  const [progress, setProgress] = useState<CalibrationProgress | null>(null);
  const [results, setResults] = useState<Record<string, CaptureResult>>({});
  const hasSensors = sensorStates.length > 0;

  useEffect(() => {
    return window.immerse?.sensors?.onCalibrationProgress(setProgress);
  }, []);

  const calibrate = async (id: SurfaceId) => {
    if (!window.immerse?.sensors) return;
    setCapturing(id);
    setProgress(null);
    const res = await window.immerse.sensors.beginCalibration(id);
    setCapturing(null);
    setProgress(null);
    setResults((r) => ({ ...r, [id]: res }));
    if (res.ok && res.region && res.sensorId) {
      patchSurface(id, {
        touch: { sensorId: res.sensorId, region: res.region, capturedAt: Date.now(), sampleCount: res.sampleCount },
      });
    }
  };

  const simulate = (id: SurfaceId) => {
    patchSurface(id, {
      touch: { sensorId: 'sim', region: { x0: 0, y0: 0, x1: 1, y1: 1 }, capturedAt: Date.now(), sampleCount: 0 },
    });
    setResults((r) => ({ ...r, [id]: { ok: true, surfaceId: id, sampleCount: 0, message: 'Simulated (whole surface).' } }));
  };

  return (
    <GlassPanel edge className="space-y-md p-lg">
      <div>
        <h2 className="text-headline-md">Calibrate touch, one surface at a time</h2>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Press <em>Calibrate</em> for a surface, then <strong>touch and swipe across that whole
          wall/floor</strong>. ImmerseOS learns which sensor watches it and where its edges are.
        </p>
      </div>

      <div className="space-y-base">
        {surfaces.map((s) => {
          const res = results[s.id];
          const isCapturing = capturing === s.id;
          return (
            <div key={s.id} className="glass rounded-lg p-md">
              <div className="flex flex-wrap items-center gap-md">
                <span className="w-28 text-label-md font-semibold">{s.label}</span>
                {s.touch ? (
                  <span className="flex items-center gap-1 text-label-sm text-green-400">
                    <Icon name="check_circle" size={16} filled /> Calibrated
                    {s.touch.sensorId === 'sim' ? ' (simulated)' : ''}
                  </span>
                ) : (
                  <span className="text-label-sm text-on-surface-variant">Not calibrated</span>
                )}
                <div className="ml-auto flex gap-base">
                  {electron && hasSensors && (
                    <button
                      onClick={() => calibrate(s.id)}
                      disabled={!!capturing}
                      className="btn-bloom rounded-lg bg-primary px-md py-xs text-label-sm font-semibold text-on-primary disabled:opacity-50"
                    >
                      {isCapturing ? 'Touch now…' : 'Calibrate'}
                    </button>
                  )}
                  <button
                    onClick={() => simulate(s.id)}
                    className="glass rounded-lg px-md py-xs text-label-sm transition-colors hover:bg-white/10"
                  >
                    Use simulated
                  </button>
                </div>
              </div>
              {isCapturing && progress?.surfaceId === s.id && (
                <div className="mt-sm">
                  <div className="flex justify-between text-label-sm text-on-surface-variant">
                    <span>Touch &amp; swipe the {s.label}…</span>
                    <span>
                      {progress.samples} points · {(progress.remainingMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className="mt-xs h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${100 - (progress.remainingMs / 4000) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {res && !res.ok && <p className="mt-sm text-label-sm text-error">⚠ {res.message}</p>}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

// ---------------------------------------------------------------------------

function TestStep({ surfaces, electron }: { surfaces: SurfaceDef[]; electron: boolean }) {
  const [active, setActive] = useState<Set<SurfaceId>>(new Set());

  useEffect(() => {
    const timers = new Map<string, number>();
    return onSurfaceTouch((t) => {
      setActive((prev) => new Set(prev).add(t.surface));
      const existing = timers.get(String(t.surface));
      if (existing) window.clearTimeout(existing);
      timers.set(
        String(t.surface),
        window.setTimeout(() => {
          setActive((prev) => {
            const n = new Set(prev);
            n.delete(t.surface);
            return n;
          });
        }, 400),
      );
    });
  }, []);

  const simulatePick = (surfaceId: SurfaceId, x: number, y: number) => {
    const touch = { surface: surfaceId, x, y, phase: 'down' as const, sessionId: Date.now(), t: Date.now() };
    emitSurfaceTouch(touch); // light up locally
    broadcastTouch(touch); // and on the projection output
  };

  return (
    <GlassPanel edge className="space-y-md p-lg">
      <div>
        <h2 className="text-headline-md">Test it</h2>
        <p className="mt-xs text-body-md text-on-surface-variant">
          {electron
            ? 'Touch each wall and floor — the matching tile should light up, confirming the mapping.'
            : 'Click each wall and floor below — the tile lights up and the projection output reacts.'}
        </p>
      </div>
      <RoomDiagram surfaces={surfaces} active={active} onPick={simulatePick} />
    </GlassPanel>
  );
}

// ---------------------------------------------------------------------------

function FinishStep({ surfaces }: { surfaces: SurfaceDef[] }) {
  const calibrated = useMemo(() => surfaces.filter((s) => s.touch).length, [surfaces]);
  return (
    <GlassPanel edge className="space-y-md p-lg text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/20">
        <Icon name="check_circle" size={40} filled className="text-primary" />
      </div>
      <h2 className="text-headline-md">Your room is ready</h2>
      <p className="mx-auto max-w-md text-body-md text-on-surface-variant">
        {surfaces.length} surfaces configured, {calibrated} calibrated for touch. Press finish to
        save this room profile and open the projection outputs.
      </p>
      <RoomDiagram surfaces={surfaces} />
    </GlassPanel>
  );
}
