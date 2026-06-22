import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { attachSync } from './store/useStore';
import { Sync } from './lib/sync';

// The control app links to same-origin surfaces (the projection window) and,
// when available, to the LAN relay so phone remotes can drive the room.
attachSync(new Sync({ useWebSocket: true }));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
