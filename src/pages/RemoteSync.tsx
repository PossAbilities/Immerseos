import { Icon } from '@/components/Icon';
import { QRCode, useRemoteUrl } from '@/components/QRCode';
import { GlassPanel, SectionLabel } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/cn';

const STEPS = [
  { icon: 'photo_camera', title: 'Open your camera', body: 'Point any phone camera at the code below.' },
  { icon: 'tap_and_play', title: 'Tap the link', body: 'The remote opens instantly in the browser — nothing to install.' },
  { icon: 'touch_app', title: 'Take control', body: 'Drive scenes, playback and lighting from your hand.' },
];

const CAPABILITIES = [
  { icon: 'play_circle', label: 'Play / pause & scrub' },
  { icon: 'auto_awesome', label: 'Switch scenes live' },
  { icon: 'lightbulb', label: 'Lighting & intensity' },
  { icon: 'volume_up', label: 'Master volume' },
  { icon: 'tune', label: 'Live scene tuning' },
  { icon: 'power_settings_new', label: 'Go live / blackout' },
];

export function RemoteSync() {
  const remoteUrl = useRemoteUrl();
  const remotes = useStore((s) => s.remotesConnected);

  return (
    <div className="p-margin">
      <header className="mb-lg">
        <h2 className="text-headline-lg">Remote Control</h2>
        <p className="text-body-md text-on-surface-variant">
          Replace the wall panel. Scan once and the room is in your pocket.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-gutter">
        {/* QR card */}
        <GlassPanel edge className="col-span-12 flex flex-col items-center p-lg text-center lg:col-span-5">
          <div className="flex items-center gap-sm text-primary">
            <Icon name="qr_code_2" />
            <SectionLabel>
              <span className="text-primary">Pair a device</span>
            </SectionLabel>
          </div>
          <div className="relative my-md h-60 w-60 rounded-xl bg-white p-md shadow-[0_0_40px_rgba(75,142,255,0.25)]">
            <QRCode value={remoteUrl} size={224} />
          </div>
          <p className="text-body-md">Scan to launch the ImmerseOS Remote</p>
          <p className="mt-xs max-w-xs break-all text-label-sm text-on-surface-variant">{remoteUrl}</p>
          <div className="mt-md flex items-center gap-xs rounded-full glass px-md py-sm text-label-sm">
            <span className={cn('h-2 w-2 rounded-full', remotes > 0 ? 'animate-pulse bg-secondary' : 'bg-outline')} />
            {remotes > 0 ? `${remotes} device${remotes > 1 ? 's' : ''} connected` : 'Waiting for a device…'}
          </div>
        </GlassPanel>

        {/* how it works */}
        <div className="col-span-12 space-y-gutter lg:col-span-7">
          <GlassPanel className="p-md">
            <SectionLabel>How it works</SectionLabel>
            <div className="mt-md space-y-md">
              {STEPS.map((s, i) => (
                <div key={s.title} className="flex items-start gap-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/20 text-primary">
                    <Icon name={s.icon} />
                  </div>
                  <div>
                    <p className="text-body-md font-semibold">
                      {i + 1}. {s.title}
                    </p>
                    <p className="text-label-md text-on-surface-variant">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-md">
            <SectionLabel>What the remote can do</SectionLabel>
            <div className="mt-md grid grid-cols-2 gap-base">
              {CAPABILITIES.map((c) => (
                <div key={c.label} className="glass flex items-center gap-sm rounded-lg p-sm">
                  <Icon name={c.icon} className="text-secondary" size={20} />
                  <span className="text-label-md">{c.label}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
