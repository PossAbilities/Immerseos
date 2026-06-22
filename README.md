# ImmerseOS

**An operating system for immersive rooms.** Control the walls, author your own
atmospheric worlds, and hand the room to anyone with a phone — a self-hosted,
open alternative to closed immersive-room software, built to run on a Windows PC.

> Built for the PossAbilities immersive room.

![ImmerseOS](https://img.shields.io/badge/platform-Windows%20·%20Electron-4b8eff) ![WebGL](https://img.shields.io/badge/engine-WebGL%20GPU%20scenes-adc6ff) ![License](https://img.shields.io/badge/license-MIT-bdf4ff)

---

## What it does

ImmerseOS turns a projector room into a living, programmable space across **three
synchronised surfaces**:

| Surface | What it is | How it runs |
| --- | --- | --- |
| **Control** | The operator console — library, theater control, creator, settings. | Main window on the PC. |
| **Projection** | The full-screen output rendered on the room's projectors. | Second display / second window. |
| **Remote** | A touch controller that **replaces the wall panel**. | Any phone — reached by scanning a QR code, no app install. |

All three share one **room state** over a realtime bridge, so the operator, the
walls and every phone stay in perfect lockstep.

### Highlights

- 🎛 **Total stage control** — playback, scene tuning, environment lighting, volume and hardware status from one calm glass UI.
- 📱 **Remote in your pocket** — scan the QR code and drive the room from a phone (with haptics). No pairing, no app store.
- 🎨 **Creator tool** — compose your own experiences from a GPU scene engine, media assets and timed triggers on a timeline, then save and deploy them.
- 🌌 **Living scene library** — eight built-in generative WebGL scenes (Nebula Drift, Deep Sea: Biolume, Zen Void, Digital Forest, Neon Pulse, Orion's Edge, Aurora Flow, Ember Calm) that never loop or repeat.
- 🖥 **Multi-projector canvas** — edge-blending, warping/geometry and render-node calibration for 360° panoramic output.

---

## Architecture

One codebase ships three browser surfaces (Vite multi-entry):

```
index.html       → Control console      (src/main.tsx)
projection.html  → Projection output    (src/projection/main.tsx)
remote.html      → Mobile remote        (src/remote/main.tsx)
```

```
┌─────────────┐   patch    ┌──────────────────┐   patch   ┌─────────────┐
│  Control PC │ ─────────▶ │  Relay (WS 7501) │ ◀──────── │ Phone Remote│
└─────────────┘            └──────────────────┘           └─────────────┘
       │ BroadcastChannel            │ broadcast                  ▲
       ▼                             ▼                            │ scan QR
┌─────────────┐                ┌─────────────┐                    │
│ Projection  │ ◀──────────────│ all surfaces│────────────────────┘
└─────────────┘                └─────────────┘
```

- **`src/lib/sync.ts`** — transport-agnostic bridge. `BroadcastChannel` links
  same-origin windows on the PC; a `WebSocket` relay links other devices.
- **`src/store/useStore.ts`** — Zustand store holding the canonical `RoomState`;
  local mutations broadcast, remote patches apply without echoing.
- **`src/engine/`** — a tiny dependency-free WebGL renderer (`webgl.ts`) driving
  GLSL fragment-shader scenes (`scenes.ts`). One shader = one scene.
- **`electron/`** — desktop shell: opens the control + projection windows
  (auto-detecting a second display) and runs the embedded server.
- **`electron/server.ts`** — serves the bundle to phones over the LAN and runs
  the WebSocket relay; reports the LAN IP used to build the QR code.

The whole UI also runs in a plain browser (the bridge degrades gracefully), so
it can be developed and demoed without Electron.

---

## Getting started

```bash
npm install

# Web preview (control / projection / remote in the browser)
npm run dev
#   http://localhost:5173/index.html
#   http://localhost:5173/projection.html
#   http://localhost:5173/remote.html

# Full desktop app (control window + projection window + LAN remote)
npm run dev:electron

# Production build (web bundle + electron main)
npm run build

# Package a Windows installer
npm run package
```

> **Tip:** open `index.html` and `projection.html` in two browser windows — drag
> projection to the second screen — then open `remote.html` on your phone (or a
> second tab) and watch all three stay in sync.

---

## Design system

Lifted from the ImmerseOS visual language: a dark "operating system" surface with
blue/cyan atmospheric accents, glassmorphism, Inter type and Material Symbols.
Tokens live in `tailwind.config.js`; signature treatments (`.glass`,
`.glass-edge`, `.bloom`, ambient backdrop) in `src/index.css`.

| Token | Value | Use |
| --- | --- | --- |
| `primary` | `#adc6ff` | Accents, focus, headings |
| `primary-container` | `#4b8eff` | Primary actions, glows |
| `secondary` | `#bdf4ff` | Live status |
| `surface` / `background` | `#111317` | Base |

---

## Project status

This is a complete, working **v1 foundation**. Built-in scenes and the full
control / creator / remote flows are functional. Real projector hardware,
operator-directory auth and media decoding are integration points the system is
designed around — the hardware panels currently show representative telemetry.

## Licence

MIT.
