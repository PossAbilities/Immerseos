// Interactive activities: touch-reactive canvas mini-experiences placed on a
// surface (wall or floor). Each activity is a tiny factory returning an instance
// with touch() + frame(); the <Activity> component drives the loop and feeds it
// input from real sensor touches and on-screen pointers alike. No dependencies.

export type ActivityCategory = 'Sensory' | 'Active' | 'Learning' | 'Creative';
export type TouchPhase = 'down' | 'move' | 'up';

export interface FrameCtx {
  ctx: CanvasRenderingContext2D;
  w: number; // CSS px
  h: number;
  dt: number; // seconds
  t: number; // seconds since start
}

export interface ActivityInstance {
  touch(x: number, y: number, phase: TouchPhase): void; // x,y normalized 0..1
  frame(c: FrameCtx): void;
}

export interface ActivityDef {
  id: string;
  name: string;
  category: ActivityCategory;
  icon: string;
  accent: string;
  create: () => ActivityInstance;
}

const rnd = (a = 1, b = 0) => b + Math.random() * (a - b);
const PALETTE = ['#ff5d8f', '#4b8eff', '#7ee0a0', '#ffd166', '#c084fc', '#00daf3'];

// ---------------------------------------------------------------------------
// Sensory
// ---------------------------------------------------------------------------

function particles(): ActivityInstance {
  const N = 220;
  const p = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), vx: 0, vy: 0 }));
  let ax = -1, ay = -1, active = false;
  return {
    touch(x, y, phase) { ax = x; ay = y; active = phase !== 'up'; },
    frame({ ctx, w, h, dt }) {
      ctx.fillStyle = 'rgba(8,10,18,0.35)';
      ctx.fillRect(0, 0, w, h);
      for (const o of p) {
        if (active) {
          const dx = ax - o.x, dy = ay - o.y;
          const d = Math.hypot(dx, dy) + 0.001;
          o.vx += (dx / d) * 0.6 * dt;
          o.vy += (dy / d) * 0.6 * dt;
        }
        o.vx *= 0.96; o.vy *= 0.96;
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < 0 || o.x > 1) o.vx *= -1;
        if (o.y < 0 || o.y > 1) o.vy *= -1;
        o.x = Math.max(0, Math.min(1, o.x)); o.y = Math.max(0, Math.min(1, o.y));
        const speed = Math.hypot(o.vx, o.vy);
        ctx.fillStyle = `hsl(${200 + speed * 4000},90%,${60 + speed * 800}%)`;
        ctx.beginPath();
        ctx.arc(o.x * w, o.y * h, 2.2, 0, 7);
        ctx.fill();
      }
    },
  };
}

function bubbles(): ActivityInstance {
  interface B { x: number; y: number; r: number; v: number; pop: number }
  let bs: B[] = [];
  let acc = 0;
  return {
    touch(x, y, phase) {
      if (phase === 'up') return;
      // pop nearby bubbles
      for (const b of bs) if (Math.hypot(b.x - x, b.y - y) < b.r + 0.03) b.pop = 1;
    },
    frame({ ctx, w, h, dt }) {
      ctx.fillStyle = 'rgba(6,12,28,0.5)';
      ctx.fillRect(0, 0, w, h);
      acc += dt;
      if (acc > 0.25) { acc = 0; bs.push({ x: rnd(), y: 1.05, r: rnd(0.08, 0.03), v: rnd(0.18, 0.06), pop: 0 }); }
      bs = bs.filter((b) => b.y > -0.1 && b.pop < 1);
      for (const b of bs) {
        if (b.pop > 0) { b.pop += dt * 4; b.r *= 1.04; }
        b.y -= b.v * dt;
        b.x += Math.sin(b.y * 10) * 0.02 * dt;
        const px = b.x * w, py = b.y * h, pr = b.r * Math.min(w, h);
        ctx.strokeStyle = `rgba(173,198,255,${0.8 - b.pop})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.stroke();
        ctx.fillStyle = `rgba(120,160,255,${0.12 - b.pop * 0.12})`;
        ctx.fill();
      }
    },
  };
}

function ripples(): ActivityInstance {
  interface R { x: number; y: number; r: number; c: string }
  let rs: R[] = [];
  return {
    touch(x, y, phase) { if (phase !== 'up') rs.push({ x, y, r: 0, c: PALETTE[(rs.length) % PALETTE.length] }); },
    frame({ ctx, w, h, dt }) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#06233f'); g.addColorStop(1, '#02101f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      rs = rs.filter((r) => r.r < 1.4);
      for (const r of rs) {
        r.r += dt * 0.5;
        ctx.strokeStyle = r.c; ctx.globalAlpha = Math.max(0, 1 - r.r / 1.4); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(r.x * w, r.y * h, r.r * Math.min(w, h) * 0.6, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
}

// ---------------------------------------------------------------------------
// Active
// ---------------------------------------------------------------------------

function footprints(): ActivityInstance {
  interface F { x: number; y: number; a: number; left: boolean }
  let fs: F[] = [];
  let toggle = false;
  return {
    touch(x, y, phase) { if (phase !== 'up') { fs.push({ x, y, a: 1, left: toggle }); toggle = !toggle; } },
    frame({ ctx, w, h, dt }) {
      ctx.fillStyle = 'rgba(4,10,6,0.18)'; ctx.fillRect(0, 0, w, h);
      fs = fs.filter((f) => f.a > 0);
      for (const f of fs) {
        f.a -= dt * 0.3;
        ctx.save();
        ctx.translate(f.x * w + (f.left ? -10 : 10), f.y * h);
        ctx.fillStyle = `rgba(126,224,160,${f.a})`;
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 22, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse((f.left ? -6 : 6), -22, 7, 9, 0, 0, 7); ctx.fill();
        ctx.restore();
      }
    },
  };
}

function catchDrop(): ActivityInstance {
  interface O { x: number; y: number; v: number; c: string; caught: boolean }
  let os: O[] = [];
  let acc = 0; let score = 0;
  return {
    touch(x, y, phase) {
      if (phase === 'up') return;
      for (const o of os) if (!o.caught && Math.hypot(o.x - x, o.y - y) < 0.08) { o.caught = true; score++; }
    },
    frame({ ctx, w, h, dt }) {
      ctx.fillStyle = 'rgba(10,8,24,0.4)'; ctx.fillRect(0, 0, w, h);
      acc += dt;
      if (acc > 0.7) { acc = 0; os.push({ x: rnd(0.9, 0.1), y: -0.05, v: rnd(0.35, 0.18), c: PALETTE[Math.floor(rnd(PALETTE.length))], caught: false }); }
      os = os.filter((o) => o.y < 1.1 && !o.caught);
      for (const o of os) {
        o.y += o.v * dt;
        ctx.fillStyle = o.c;
        ctx.beginPath(); ctx.arc(o.x * w, o.y * h, 0.05 * Math.min(w, h), 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.font = `bold ${h * 0.08}px Inter, sans-serif`;
      ctx.fillText(`★ ${score}`, 16, h * 0.1);
    },
  };
}

// ---------------------------------------------------------------------------
// Learning
// ---------------------------------------------------------------------------

function match(): ActivityInstance {
  const cols = 4, rows = 3;
  const pairs = [...Array(6).keys()].flatMap((i) => [i, i]).sort(() => Math.random() - 0.5);
  const tiles = pairs.map((sym) => ({ sym, up: false, done: false }));
  let flipped: number[] = [];
  let lock = 0;
  return {
    touch(x, y, phase) {
      if (phase !== 'down' || lock > 0) return;
      const c = Math.floor(x * cols), r = Math.floor(y * rows);
      const i = r * cols + c;
      const tl = tiles[i];
      if (!tl || tl.up || tl.done) return;
      tl.up = true; flipped.push(i);
      if (flipped.length === 2) {
        const [a, b] = flipped;
        if (tiles[a].sym === tiles[b].sym) { tiles[a].done = tiles[b].done = true; flipped = []; }
        else lock = 0.9;
      }
    },
    frame({ ctx, w, h, dt }) {
      if (lock > 0) { lock -= dt; if (lock <= 0) { flipped.forEach((i) => (tiles[i].up = false)); flipped = []; } }
      ctx.fillStyle = '#0b0e16'; ctx.fillRect(0, 0, w, h);
      const cw = w / cols, ch = h / rows, pad = Math.min(cw, ch) * 0.08;
      tiles.forEach((tl, i) => {
        const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
        ctx.fillStyle = tl.done ? 'rgba(126,224,160,0.25)' : tl.up ? PALETTE[tl.sym] : '#1e2630';
        roundRect(ctx, cx + pad, cy + pad, cw - pad * 2, ch - pad * 2, 10);
        ctx.fill();
        if (!tl.up && !tl.done) {
          ctx.fillStyle = '#3a475a'; ctx.font = `bold ${ch * 0.3}px Inter`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('?', cx + cw / 2, cy + ch / 2);
        }
      });
      ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    },
  };
}

function popLearn(set = 'ABCDEFG123'): ActivityInstance {
  interface I { x: number; y: number; vy: number; ch: string; c: string }
  let items: I[] = [];
  let acc = 0;
  return {
    touch(x, y, phase) {
      if (phase !== 'down') return;
      items = items.filter((it) => Math.hypot(it.x - x, it.y - y) > 0.09);
    },
    frame({ ctx, w, h, dt }) {
      ctx.fillStyle = 'rgba(12,6,22,0.4)'; ctx.fillRect(0, 0, w, h);
      acc += dt;
      if (acc > 0.9 && items.length < 10) { acc = 0; items.push({ x: rnd(0.9, 0.1), y: 1.05, vy: rnd(0.18, 0.08), ch: set[Math.floor(rnd(set.length))], c: PALETTE[Math.floor(rnd(PALETTE.length))] }); }
      items = items.filter((it) => it.y > -0.1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const it of items) {
        it.y -= it.vy * dt;
        ctx.fillStyle = it.c; ctx.beginPath(); ctx.arc(it.x * w, it.y * h, 0.07 * Math.min(w, h), 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.min(w, h) * 0.09}px Inter`;
        ctx.fillText(it.ch, it.x * w, it.y * h);
      }
      ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    },
  };
}

// ---------------------------------------------------------------------------
// Creative
// ---------------------------------------------------------------------------

function paint(): ActivityInstance {
  interface D { x: number; y: number; c: string }
  let dabs: D[] = [];
  let colorIdx = 0; let cur = PALETTE[0];
  return {
    touch(x, y, phase) {
      if (phase === 'down') { cur = PALETTE[colorIdx++ % PALETTE.length]; }
      if (phase !== 'up') dabs.push({ x, y, c: cur });
      if (dabs.length > 5000) dabs = dabs.slice(-5000);
    },
    frame({ ctx, w, h }) {
      ctx.fillStyle = '#0c0e12'; ctx.fillRect(0, 0, w, h);
      for (const d of dabs) {
        ctx.fillStyle = d.c;
        ctx.beginPath(); ctx.arc(d.x * w, d.y * h, Math.min(w, h) * 0.025, 0, 7); ctx.fill();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Active / Sensory — added content pack
// ---------------------------------------------------------------------------

function balloons(): ActivityInstance {
  interface B { x: number; y: number; r: number; v: number; c: string; pop: number; sway: number }
  let bs: B[] = []; let acc = 0; let score = 0;
  return {
    touch(x, y, phase) {
      if (phase === 'up') return;
      for (const b of bs) if (b.pop === 0 && Math.hypot(b.x - x, b.y - y) < b.r + 0.05) { b.pop = 0.001; score++; }
    },
    frame({ ctx, w, h, dt }) {
      ctx.fillStyle = 'rgba(8,10,22,0.4)'; ctx.fillRect(0, 0, w, h);
      acc += dt;
      if (acc > 0.6 && bs.length < 14) { acc = 0; bs.push({ x: rnd(0.9, 0.1), y: 1.12, r: rnd(0.1, 0.06), v: rnd(0.16, 0.07), c: PALETTE[Math.floor(rnd(PALETTE.length))], pop: 0, sway: rnd(6.28) }); }
      bs = bs.filter((b) => b.y > -0.2 && b.pop < 1);
      for (const b of bs) {
        if (b.pop > 0) b.pop += dt * 5;
        else { b.y -= b.v * dt; b.x += Math.sin(b.y * 6 + b.sway) * 0.04 * dt; }
        const px = b.x * w, py = b.y * h, pr = b.r * Math.min(w, h) * (1 + b.pop * 0.6);
        ctx.globalAlpha = b.pop > 0 ? Math.max(0, 1 - b.pop) : 1;
        ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.ellipse(px, py, pr, pr * 1.18, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px, py + pr * 1.18); ctx.lineTo(px + Math.sin(b.sway) * 6, py + pr * 1.55); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.font = `bold ${h * 0.08}px Inter, sans-serif`; ctx.fillText(`✷ ${score}`, 16, h * 0.1);
    },
  };
}

function football(): ActivityInstance {
  let bx = 0.5, by = 0.5, vx = 0, vy = 0;
  return {
    touch(x, y, phase) {
      if (phase === 'up') return;
      const dx = bx - x, dy = by - y, d = Math.hypot(dx, dy) + 0.001;
      if (d < 0.2) { const f = (0.2 - d) * 7; vx += (dx / d) * f; vy += (dy / d) * f; }
    },
    frame({ ctx, w, h, dt }) {
      ctx.fillStyle = '#0c3a1a'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.18, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
      bx += vx * dt; by += vy * dt; vx *= 0.99; vy *= 0.99;
      const r = 0.05;
      if (bx < r) { bx = r; vx = Math.abs(vx) * 0.8; }
      if (bx > 1 - r) { bx = 1 - r; vx = -Math.abs(vx) * 0.8; }
      if (by < r) { by = r; vy = Math.abs(vy) * 0.8; }
      if (by > 1 - r) { by = 1 - r; vy = -Math.abs(vy) * 0.8; }
      const px = bx * w, py = by * h, pr = r * Math.min(w, h);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
      ctx.fillStyle = '#15171c';
      ctx.beginPath(); ctx.arc(px, py, pr * 0.34, 0, 7); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * 7 + 0.4;
        ctx.beginPath(); ctx.arc(px + Math.cos(a) * pr * 0.68, py + Math.sin(a) * pr * 0.68, pr * 0.16, 0, 7); ctx.fill();
      }
    },
  };
}

function mosaic(): ActivityInstance {
  const cols = 12, rows = 7;
  const grid: string[] = new Array(cols * rows).fill('');
  let ci = 0;
  return {
    touch(x, y, phase) {
      if (phase === 'up') return;
      const c = Math.min(cols - 1, Math.max(0, Math.floor(x * cols)));
      const r = Math.min(rows - 1, Math.max(0, Math.floor(y * rows)));
      grid[r * cols + c] = PALETTE[ci++ % PALETTE.length];
    },
    frame({ ctx, w, h }) {
      ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, 0, w, h);
      const cw = w / cols, ch = h / rows, pad = Math.min(cw, ch) * 0.06;
      for (let i = 0; i < grid.length; i++) {
        const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
        ctx.fillStyle = grid[i] || 'rgba(255,255,255,0.04)';
        roundRect(ctx, cx + pad, cy + pad, cw - pad * 2, ch - pad * 2, 6); ctx.fill();
      }
    },
  };
}

function scatter(): ActivityInstance {
  const N = 44;
  const ps = Array.from({ length: N }, () => ({ x: rnd(), y: rnd(), vx: 0, vy: 0, c: PALETTE[Math.floor(rnd(PALETTE.length))], s: rnd(0.05, 0.025), shape: Math.floor(rnd(3)) }));
  let tx = -1, ty = -1, active = false;
  return {
    touch(x, y, phase) { tx = x; ty = y; active = phase !== 'up'; },
    frame({ ctx, w, h, dt }) {
      ctx.fillStyle = 'rgba(10,10,18,0.5)'; ctx.fillRect(0, 0, w, h);
      for (const p of ps) {
        if (active) {
          const dx = p.x - tx, dy = p.y - ty, d = Math.hypot(dx, dy) + 0.001;
          if (d < 0.25) { const f = (0.25 - d) * 4; p.vx += (dx / d) * f * dt; p.vy += (dy / d) * f * dt; }
        }
        p.vx *= 0.92; p.vy *= 0.92; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1;
        p.x = Math.max(0, Math.min(1, p.x)); p.y = Math.max(0, Math.min(1, p.y));
        const px = p.x * w, py = p.y * h, pr = p.s * Math.min(w, h);
        ctx.fillStyle = p.c;
        if (p.shape === 0) { ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill(); }
        else if (p.shape === 1) { ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2); }
        else { ctx.beginPath(); ctx.moveTo(px, py - pr); ctx.lineTo(px + pr, py + pr); ctx.lineTo(px - pr, py + pr); ctx.closePath(); ctx.fill(); }
      }
    },
  };
}

function discovery(): ActivityInstance {
  interface S { x: number; y: number; c: string; found: boolean }
  const spots: S[] = Array.from({ length: 18 }, () => ({ x: rnd(0.95, 0.05), y: rnd(0.95, 0.05), c: PALETTE[Math.floor(rnd(PALETTE.length))], found: false }));
  let now = 0;
  return {
    touch(x, y, phase) {
      if (phase === 'up') return;
      for (const s of spots) if (!s.found && Math.hypot(s.x - x, s.y - y) < 0.12) s.found = true;
    },
    frame({ ctx, w, h, t }) {
      now = t;
      ctx.fillStyle = '#04060c'; ctx.fillRect(0, 0, w, h);
      for (const s of spots) {
        const pulse = s.found ? 0.06 + Math.sin((now + s.x * 6) * 3) * 0.012 : 0.018;
        const pr = Math.min(w, h) * pulse;
        const g = ctx.createRadialGradient(s.x * w, s.y * h, 0, s.x * w, s.y * h, pr * 3.2);
        g.addColorStop(0, s.c); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = s.found ? 0.95 : 0.08;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, pr * 3.2, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const ACTIVITIES: ActivityDef[] = [
  { id: 'particles', name: 'Particles', category: 'Sensory', icon: 'blur_on', accent: '#00daf3', create: particles },
  { id: 'bubbles', name: 'Bubbles', category: 'Sensory', icon: 'bubble_chart', accent: '#4b8eff', create: bubbles },
  { id: 'ripples', name: 'Water Ripples', category: 'Sensory', icon: 'water', accent: '#00b4d8', create: ripples },
  { id: 'footprints', name: 'Footprints', category: 'Active', icon: 'footprint', accent: '#7ee0a0', create: footprints },
  { id: 'catch', name: 'Catch & Drop', category: 'Active', icon: 'sports_handball', accent: '#ffd166', create: catchDrop },
  { id: 'balloons', name: 'Balloon Pop', category: 'Active', icon: 'celebration', accent: '#ff5d8f', create: balloons },
  { id: 'football', name: 'Football', category: 'Active', icon: 'sports_soccer', accent: '#7ee0a0', create: football },
  { id: 'scatter', name: 'Image Scatter', category: 'Active', icon: 'scatter_plot', accent: '#00daf3', create: scatter },
  { id: 'discovery', name: 'Discovery', category: 'Sensory', icon: 'flashlight_on', accent: '#ffd166', create: discovery },
  { id: 'mosaic', name: 'Mosaic', category: 'Creative', icon: 'grid_view', accent: '#c084fc', create: mosaic },
  { id: 'match', name: 'Match Pairs', category: 'Learning', icon: 'extension', accent: '#c084fc', create: match },
  { id: 'poplearn', name: 'Pop to Learn', category: 'Learning', icon: 'abc', accent: '#ff5d8f', create: popLearn },
  { id: 'paint', name: 'Finger Paint', category: 'Creative', icon: 'brush', accent: '#ff5d8f', create: paint },
];

export const ACTIVITY_MAP: Record<string, ActivityDef> = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

export function getActivity(id: string | undefined): ActivityDef {
  return (id && ACTIVITY_MAP[id]) || ACTIVITIES[0];
}
