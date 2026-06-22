import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { attachSync } from './store/useStore';
import { Sync } from './lib/sync';
import { startHardwareBridge } from './lib/hardwareBridge';

// The control app links to same-origin surfaces (the projection window) and,
// when available, to the LAN relay so phone remotes can drive the room.
attachSync(new Sync({ role: 'control', useWebSocket: true }));

// Drive real room hardware from the control surface (no-op in the browser).
startHardwareBridge();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
