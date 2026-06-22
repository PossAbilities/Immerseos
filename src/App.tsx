import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { Ambient } from './components/Ambient';
import { Welcome } from './pages/Welcome';
import { SignIn } from './pages/SignIn';
import { Dashboard } from './pages/Dashboard';
import { Library } from './pages/Library';
import { TheaterControl } from './pages/TheaterControl';
import { Creator } from './pages/Creator';
import { RemoteSync } from './pages/RemoteSync';
import { Settings } from './pages/Settings';

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

  if (!authed) return <Navigate to="/signin" replace state={{ from: location }} />;

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

/**
 * Keys the Creator on the route id so switching between two experiences (or
 * from "new" to an existing one) fully resets the editor's local draft state
 * instead of keeping the previously loaded experience's content.
 */
function CreatorRoute() {
  const { id } = useParams();
  return <Creator key={id ?? 'new'} />;
}

export function App() {
  return (
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
        <Route path="remote" element={<RemoteSync />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
