import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { Projection } from './Projection';
import { attachSync } from '../store/useStore';
import { Sync } from '../lib/sync';

// The projection window mirrors the room — keep it in sync with the control
// surface (same machine) and any device on the relay.
attachSync(new Sync({ useWebSocket: true }));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Projection />
  </StrictMode>,
);
