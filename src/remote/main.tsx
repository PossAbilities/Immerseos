import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { Remote } from './Remote';
import { attachSync } from '../store/useStore';
import { Sync } from '../lib/sync';

// The phone remote reaches the room over the LAN relay (WebSocket). On the same
// machine BroadcastChannel also links it for local testing.
attachSync(new Sync({ role: 'remote', useWebSocket: true }));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Remote />
  </StrictMode>,
);
