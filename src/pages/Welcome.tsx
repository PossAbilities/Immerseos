import { Link, useNavigate } from 'react-router-dom';
import { Ambient } from '@/components/Ambient';
import { Icon } from '@/components/Icon';
import { GlassPanel } from '@/components/ui';
import { Stage } from '@/components/Stage';
import { SCENES } from '@/engine/scenes';

const FEATURES = [
  {
    icon: 'hub',
    title: 'Total Stage Control',
    body: 'Drive every projector, light and audio zone in the room from one calm, glanceable surface.',
  },
  {
    icon: 'auto_awesome',
    title: 'Infinite Creativity',
    body: 'Compose your own immersive experiences from a GPU scene engine, media and timed triggers.',
  },
  {
    icon: 'smartphone',
    title: 'Remote In Your Pocket',
    body: 'Scan a QR code to turn any phone into a tactile remote — no extra hardware, no pairing.',
  },
];

const STATS = [
  { value: '99.9%', label: 'Stage uptime' },
  { value: '120ms', label: 'Remote latency' },
  { value: '4K·60', label: 'Per projector' },
  { value: '24/7', label: 'Always ready' },
];

export function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Ambient />

      {/* top bar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-margin py-md">
          <div className="flex items-center gap-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container">
              <Icon name="settings_remote" filled className="text-on-primary-container" size={18} />
            </div>
            <span className="text-headline-md font-semibold tracking-tight text-primary">
              ImmerseOS
            </span>
          </div>
          <nav className="hidden items-center gap-lg text-label-md text-on-surface-variant md:flex">
            <a href="#features" className="transition-colors hover:text-primary">Platform</a>
            <a href="#scenes" className="transition-colors hover:text-primary">Scenes</a>
            <a href="#stats" className="transition-colors hover:text-primary">Performance</a>
          </nav>
          <button
            onClick={() => navigate('/signin')}
            className="btn-bloom rounded-lg bg-primary px-md py-sm text-label-md font-semibold text-on-primary transition-all"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-xl px-margin py-xl lg:grid-cols-2">
        <div>
          <span className="text-label-sm uppercase tracking-[0.3em] text-secondary">
            Atmospheric Intelligence
          </span>
          <h1 className="mt-md text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            The Operating System for{' '}
            <span className="bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent">
              Immersive Rooms
            </span>
          </h1>
          <p className="mt-md max-w-md text-body-lg text-on-surface-variant">
            Control the walls. Author your own worlds. Hand the room to anyone
            with a phone. ImmerseOS turns a projector room into a living,
            programmable space.
          </p>
          <div className="mt-lg flex flex-wrap gap-md">
            <button
              onClick={() => navigate('/signin')}
              className="btn-bloom rounded-lg bg-primary px-lg py-md text-label-md font-semibold text-on-primary transition-all"
            >
              Get Started Free
            </button>
            <a
              href="#features"
              className="glass rounded-lg px-lg py-md text-label-md font-semibold transition-colors hover:bg-white/10"
            >
              Talk to an Architect
            </a>
          </div>
        </div>

        <GlassPanel edge className="relative aspect-video overflow-hidden p-0 shadow-2xl">
          <Stage sceneId="nebula-drift" params={SCENES[0].defaults} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface/70 to-transparent" />
          <div className="absolute bottom-md left-md flex items-center gap-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
            <span className="text-label-sm uppercase tracking-widest text-secondary">
              Live preview · Nebula Drift
            </span>
          </div>
        </GlassPanel>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-margin py-lg">
        <h2 className="text-center text-headline-lg">Engineered for the room</h2>
        <div className="mt-lg grid gap-gutter md:grid-cols-3">
          {FEATURES.map((f) => (
            <GlassPanel key={f.title} edge className="p-md">
              <div className="mb-md flex h-12 w-12 items-center justify-center rounded-lg bg-primary-container/20">
                <Icon name={f.icon} className="text-primary" />
              </div>
              <h3 className="text-headline-md">{f.title}</h3>
              <p className="mt-sm text-body-md text-on-surface-variant">{f.body}</p>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* scene marquee */}
      <section id="scenes" className="mx-auto max-w-6xl px-margin py-lg">
        <h2 className="text-center text-headline-lg">A living scene library</h2>
        <p className="mt-sm text-center text-body-md text-on-surface-variant">
          Every scene is generated on the GPU — it never loops, never repeats.
        </p>
        <div className="mt-lg grid grid-cols-2 gap-gutter md:grid-cols-4">
          {SCENES.slice(0, 8).map((s) => (
            <GlassPanel key={s.id} edge className="group overflow-hidden p-0">
              <div className="relative aspect-square">
                <Stage sceneId={s.id} params={s.defaults} className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
                <div className="absolute bottom-sm left-sm">
                  <p className="text-label-md font-semibold">{s.name}</p>
                  <p className="text-label-sm text-on-surface-variant">{s.category}</p>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* stats */}
      <section id="stats" className="mx-auto max-w-6xl px-margin py-lg">
        <GlassPanel edge className="grid grid-cols-2 gap-gutter p-lg md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-headline-xl text-primary">{s.value}</p>
              <p className="mt-xs text-label-sm uppercase tracking-widest text-on-surface-variant">
                {s.label}
              </p>
            </div>
          ))}
        </GlassPanel>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-margin py-xl">
        <GlassPanel edge className="relative overflow-hidden p-xl text-center">
          <h2 className="text-balance text-headline-lg">Ready to transcend the screen?</h2>
          <p className="mx-auto mt-sm max-w-md text-body-md text-on-surface-variant">
            Bring your immersive room to life in minutes. No installation wizard,
            no licence keys per wall.
          </p>
          <div className="mt-lg flex justify-center gap-md">
            <Link
              to="/signin"
              className="btn-bloom rounded-lg bg-primary px-lg py-md text-label-md font-semibold text-on-primary transition-all"
            >
              Enter the Console
            </Link>
          </div>
        </GlassPanel>
      </section>

      <footer className="border-t border-white/5 py-lg text-center text-label-sm text-outline">
        ImmerseOS · Built for the PossAbilities immersive room · v1.0
      </footer>
    </div>
  );
}
