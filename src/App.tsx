import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore, currentExperience } from './store/useStore';
import { runSceneEvents, SCENE_TIME, EXPERIENCE_TIME } from './lib/atoms';
import { Sidebar } from './components/Sidebar';
import { Ambient } from './components/Ambient';
import { Splash } from './components/Splash';
import { Welcome } from './pages/Welcome';
import { SignIn } from './pages/SignIn';
import { Dashboard } from './pages/Dashboard';
import { Library } from './pages/Library';
import { TheaterControl } from './pages/TheaterControl';
import { Creator } from './pages/Creator';
import { Editor } from './pages/Editor';
import { RemoteSync } from './pages/RemoteSync';
import { Settings } from './pages/Settings';
import { SetupWizard } from './setup/SetupWizard';
import { useRoomProfile, isElectron } from './lib/roomBridge';

/** Authenticated shell: persistent sidebar + the room playback clock. */
function AppLayout() {
  const authed = useStore((s) => s.authed);
  const tick = useStore((s) => s.tick);
  const location = useLocation();

  // master playback clock — advances the active experience position
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  // Sequences: auto-advance authored scenes while live (control is the authority).
  const live = useStore((s) => s.live);
  const activeSceneId = useStore((s) => s.activeSceneId);
  const exp = useStore(currentExperience);
  const setActiveScene = useStore((s) => s.setActiveScene);
  const applyAtomSets = useStore((s) => s.applyAtomSets);
  useEffect(() => {
    if (!live || !exp.scenes?.length) return;
    const scenes = exp.scenes;
    const sc = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];
    if (!sc.autoAdvanceSec) return;
    const idx = scenes.findIndex((s) => s.id === sc.id);
    const next = sc.nextSceneId ?? scenes[(idx + 1) % scenes.length].id;
    const t = setTimeout(() => setActiveScene(next), sc.autoAdvanceSec * 1000);
    return () => clearTimeout(t);
  }, [live, activeSceneId, exp, setActiveScene]);

  // Atoms engine: evaluate the active scene's events against live atom values +
  // predefined scene/experience timers, firing scene-links / atom-setters once.
  const expStart = useRef(0);
  const sceneStart = useRef(0);
  const fired = useRef(new Set<string>());
  useEffect(() => { if (live) expStart.current = performance.now(); }, [live]);
  useEffect(() => { sceneStart.current = performance.now(); fired.current = new Set(); }, [activeSceneId, live]);
  useEffect(() => {
    if (!live || !exp.scenes?.length) return;
    const t = setInterval(() => {
      const scene = exp.scenes!.find((s) => s.id === activeSceneId) ?? exp.scenes![0];
      if (!scene.events?.length) return;
      const now = performance.now();
      const working = {
        ...(useStore.getState().atoms ?? {}),
        [SCENE_TIME]: (now - sceneStart.current) / 1000,
        [EXPERIENCE_TIME]: (now - expStart.current) / 1000,
      };
      runSceneEvents(working, scene.events, fired.current, { onScene: setActiveScene, onSet: applyAtomSets });
    }, 200);
    return () => clearInterval(t);
  }, [live, activeSceneId, exp, setActiveScene, applyAtomSets]);

  // On the desktop app, force first-run room setup before anything else.
  const { profile } = useRoomProfile();
  const needsSetup =
    isElectron() && profile != null && !profile.setupComplete && location.pathname !== '/app/setup';

  if (!authed) return <Navigate to="/signin" replace state={{ from: location }} />;
  if (needsSetup) return <Navigate to="/app/setup" replace />;

  return (
    <div className="min-h-screen">
      <Ambient />
      <Sidebar />
      <main className="ml-[280px] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

function SetupRoute() {
  const navigate = useNavigate();
  return <SetupWizard onDone={() => navigate('/app/dashboard')} />;
}

/**
 * Keys the Creator on the route id so switching between two experiences (or
 * from "new" to an existing one) fully resets the editor's local draft state
 * instead of keeping the previously loaded experience's content.
 */
function CreatorRoute() {
  const { id } = useParams();
  return <Creator key={id ?? 'new'} />;
}

function EditorRoute() {
  const { id } = useParams();
  return <Editor key={id} />;
}

export function App() {
  const [booting, setBooting] = useState(true);
  return (
    <>
      {booting && <Splash onDone={() => setBooting(false)} />}
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="library" element={<Library />} />
          <Route path="experience/:id" element={<TheaterControl />} />
          <Route path="creator" element={<CreatorRoute />} />
          <Route path="creator/:id" element={<CreatorRoute />} />
          <Route path="editor/:id" element={<EditorRoute />} />
          <Route path="remote" element={<RemoteSync />} />
          <Route path="setup" element={<SetupRoute />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
