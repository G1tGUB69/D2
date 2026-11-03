// Music Room — first-person 2D instrument picker.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let pxScale = 1;

const ARM_L = { x: 180, y: 960 };
const ARM_R = { x: 1100, y: 960 };
const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
const DRUM_NAMES = ['Kick', 'Snare', 'Hi-hat', 'Open hat', 'Tom 1', 'Tom 2', 'Tom 3', 'Crash'];
const KEY_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'];
let keyLabels = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'];

// Show the real key caps for the user's layout (e.g. Q instead of A on AZERTY).
if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
  navigator.keyboard.getLayoutMap()
    .then((m) => { keyLabels = KEY_CODES.map((c, i) => (m.get(c) || keyLabels[i]).toUpperCase()); })
    .catch(() => {});
}

// ------------------------------------------------------------ Instruments

const INSTRUMENTS = [
  {
    id: 'guitar', name: 'Guitar', blurb: 'Plucked nylon strings',
    draw: drawGuitar, sustain: false, bottom: 120, shelfS: 0.72,
    held: { x: 720, y: 560, s: 2.3, r: -1.2 },
    emit: [0, 26], color: '#ffcf8a',
    hands: (st) => [
      { side: 'L', anchor: ARM_L, at: [-38, -74], pose: 'grip' },
      { side: 'R', anchor: ARM_R, at: [-38 + 40 * st.strum, 64], pose: 'open', curl: 0.4 },
    ],
  },
  {
    id: 'keyboard', name: 'Keyboard', blurb: 'Electric piano',
    draw: drawKeyboard, sustain: true, bottom: 44, shelfS: 0.6,
    held: { x: 640, y: 600, s: 2.6, r: 0 },
    emit: [0, -44], color: '#8af5e2',
    hands: (st) => {
      const kx = (k) => -105 + 30 * k;
      return [
        { side: 'L', anchor: { x: 300, y: 980 }, at: [kx(st.lastKey[0]) - 14, 28 + (st.held[st.lastKey[0]] ? 3 : 0)], pose: 'point' },
        { side: 'R', anchor: { x: 980, y: 980 }, at: [kx(st.lastKey[1]) + 14, 28 + (st.held[st.lastKey[1]] ? 3 : 0)], pose: 'point' },
      ];
    },
  },
  {
    id: 'drums', name: 'Drums', blurb: 'Snare & cymbal kit',
    draw: drawDrums, sustain: false, bottom: 50, shelfS: 0.85,
    held: { x: 600, y: 520, s: 2.2, r: 0 },
    emit: [0, -30], color: '#ff8a9a',
    hands: (st) => [
      { side: 'L', anchor: ARM_L, at: [-80, 78], pose: 'stick', target: [-22, -20 - 32 * (1 - st.sticks[0])] },
      {
        side: 'R', anchor: ARM_R, at: [75, 78], pose: 'stick',
        target: st.rightOnCym ? [92, -60 - 32 * (1 - st.sticks[1])] : [26, -20 - 32 * (1 - st.sticks[1])],
      },
    ],
  },
  {
    id: 'violin', name: 'Violin', blurb: 'Bowed strings',
    draw: drawViolin, sustain: true, bottom: 82, shelfS: 0.85,
    held: { x: 600, y: 480, s: 1.9, r: -0.5 },
    emit: [0, 0], color: '#ffb36b',
    hands: (st) => [
      { side: 'L', anchor: ARM_L, at: [-22, -78], pose: 'grip' },
      { side: 'R', anchor: ARM_R, at: [st.bowX + 168, 34], pose: 'grip' },
    ],
  },
  {
    id: 'trumpet', name: 'Trumpet', blurb: 'Bright brass',
    draw: drawTrumpet, sustain: true, bottom: 27, shelfS: 0.62,
    held: { x: 620, y: 520, s: 2.3, r: 0.08 },
    emit: [140, -18], color: '#ffe27a',
    hands: () => [
      { side: 'L', anchor: ARM_L, at: [-72, 22], pose: 'grip' },
      { side: 'R', anchor: ARM_R, at: [14, -40], pose: 'open', curl: 0.2 },
    ],
  },
];

// ----------------------------------------------------------------- State

const state = {
  t: 0,
  mouse: { x: W / 2, y: H / 2 },
  focus: 2,
  sel: -1,      // instrument currently off the shelf
  p: 0,         // 0 = on the shelf, 1 = in hands
  target: 0,
  pending: -1,  // instrument to pick up after putting the current one back
  voices: new Array(8).fill(null),
  particles: [],
  pads: [],
  padDown: -1,
  fx: null,
};

function freshFx() {
  return {
    levels: new Array(8).fill(0),
    held: new Array(8).fill(false),
    lastKey: [1, 6],
    strum: 0,
    sticks: [0, 0],
    stickTurn: 0,
    rightOnCym: false,
    skin: 0,
    cym: 0,
    bowX: 0,
    bowDir: 1,
    valves: [0, 0, 0],
    lcd: '',
  };
}
state.fx = freshFx();

const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;

function camera() {
  const away = ease(state.p);
  const m = state.mouse;
  return {
    x: (m.x - W / 2) * -0.03 * (1 - away),
    y: (m.y - H / 2) * -0.02 * (1 - away) + Math.sin(state.t * 1.6) * 2,
  };
}

function shelfTransform(i, cam) {
  const inst = INSTRUMENTS[i];
  const bob = i === state.focus && state.sel !== i ? Math.sin(state.t * 3) * 3 - 6 : 0;
  return { x: SLOT_X[i] + cam.x, y: SHELF_Y - inst.bottom * inst.shelfS + cam.y + bob, s: inst.shelfS, r: 0 };
}

function currentTransform(i, cam) {
  const a = shelfTransform(i, cam);
  const b = INSTRUMENTS[i].held;
  const k = ease(state.p);
  const breathe = state.p > 0.99 ? 1 : 0;
  return {
    x: lerp(a.x, b.x, k) + Math.sin(state.t * 1.3) * 3 * breathe,
    y: lerp(a.y, b.y, k) - Math.sin(Math.PI * state.p) * 70 + Math.sin(state.t * 2.1) * 2 * breathe,
    s: lerp(a.s, b.s, k),
    r: lerp(a.r, b.r, k),
  };
}

function toScreen(T, lx, ly) {
  const c = Math.cos(T.r);
  const s = Math.sin(T.r);
  return { x: T.x + T.s * (lx * c - ly * s), y: T.y + T.s * (lx * s + ly * c) };
}

const canPlay = () => state.sel >= 0 && state.target === 1 && state.p > 0.85;

// ---------------------------------------------------------------- Actions

function pick(i) {
  if (i < 0 || i >= INSTRUMENTS.length) return;
  Sound.init();
  state.focus = i;
  if (state.sel === i && state.target === 1) return;
  if (state.sel >= 0) {
    state.pending = i === state.sel ? -1 : i;
    if (i === state.sel) { state.target = 1; return; }
    putDown();
  } else {
    state.sel = i;
    state.target = 1;
    state.fx = freshFx();
  }
}

function putDown() {
  releaseAll();
  state.target = 0;
}

function releaseAll() {
  for (let i = 0; i < 8; i++) noteOff(i);
}

function noteOn(i) {
  if (!canPlay() || state.fx.held[i]) return;
  const inst = INSTRUMENTS[state.sel];
  const fx = state.fx;
  fx.held[i] = true;
  fx.levels[i] = 1;
  state.voices[i] = Sound.play(inst.id, i);

  if (inst.id === 'guitar') fx.strum = 1;
  if (inst.id === 'keyboard') {
    fx.lastKey[i < 4 ? 0 : 1] = i;
    fx.lcd = `NOTE ${NOTE_NAMES[i]}${i === 7 ? 5 : 4}`;
  }
  if (inst.id === 'drums') {
    const cym = DRUM_PIECE[i] === 'cym';
    if (cym) {
      fx.cym = 1;
      fx.rightOnCym = true;
      fx.sticks[1] = 1;
    } else {
      fx.skin = 1;
      fx.rightOnCym = false;
      fx.sticks[fx.stickTurn] = 1;
      fx.stickTurn ^= 1;
    }
  }
  if (inst.id === 'trumpet') fx.valves = [1, 2, 3].map((v) => (VALVES[i].includes(v) ? 1 : 0));

  // Floating music notes
  const T = currentTransform(state.sel, camera());
  const e = toScreen(T, inst.emit[0], inst.emit[1]);
  for (let n = 0; n < 2; n++) {
    state.particles.push({
      x: e.x + (Math.random() - 0.5) * 30,
      y: e.y,
      vx: (Math.random() - 0.5) * 60,
      vy: -90 - Math.random() * 60,
      life: 1,
      ch: Math.random() < 0.5 ? '♪' : '♫',
      color: inst.color,
      size: 22 + Math.random() * 14,
    });
  }
}

function noteOff(i) {
  state.fx.held[i] = false;
  if (state.voices[i]) {
    state.voices[i].stop();
    state.voices[i] = null;
  }
  if (state.sel >= 0 && INSTRUMENTS[state.sel].id === 'trumpet' && !state.fx.held.some(Boolean)) {
    state.fx.valves = [0, 0, 0];
  }
}

// ----------------------------------------------------------------- Update

function update(dt) {
  state.t += dt;

  // pick-up / put-down animation
  const speed = dt / 0.55;
  state.p = state.target > state.p ? Math.min(1, state.p + speed) : Math.max(0, state.p - speed);
  if (state.p === 0 && state.target === 0 && state.sel >= 0) {
    state.sel = -1;
    if (state.pending >= 0) {
      const next = state.pending;
      state.pending = -1;
      pick(next);
    }
  }

  // hover detection on the shelf
  if (state.sel < 0 || state.target === 0) {
    const cam = camera();
    const m = state.mouse;
    SLOT_X.forEach((x, i) => {
      if (Math.abs(m.x - (x + cam.x)) < 105 && m.y > 150 && m.y < SHELF_Y + 70) {
        if (state.mouseMoved) state.focus = i;
      }
    });
  }

  // instrument effects
  const fx = state.fx;
  const inst = state.sel >= 0 ? INSTRUMENTS[state.sel] : null;
  const decay = Math.exp(-dt * 4);
  for (let i = 0; i < 8; i++) {
    if (inst && inst.sustain && fx.held[i]) fx.levels[i] = Math.max(fx.levels[i] * decay, 0.55);
    else fx.levels[i] *= decay;
  }
  fx.strum *= Math.exp(-dt * 7);
  fx.skin *= Math.exp(-dt * 6);
  fx.cym *= Math.exp(-dt * 2.5);
  fx.sticks[0] *= Math.exp(-dt * 9);
  fx.sticks[1] *= Math.exp(-dt * 9);

  // violin bow saws back and forth while a note is held
  if (fx.held.some(Boolean)) {
    fx.bowX += fx.bowDir * 160 * dt;
    if (fx.bowX > 70) fx.bowDir = -1;
    if (fx.bowX < -70) fx.bowDir = 1;
  } else {
    fx.bowX *= Math.exp(-dt * 2);
  }

  // particles
  state.particles = state.particles.filter((p) => {
    p.x += p.vx * dt + Math.sin(state.t * 4 + p.y * 0.02) * 0.6;
    p.y += p.vy * dt;
    p.life -= dt * 0.7;
    return p.life > 0;
  });
}

// ----------------------------------------------------------------- Render

function drawInstrument(i, T, glow) {
  const inst = INSTRUMENTS[i];
  const fxState = i === state.sel ? state.fx : freshFxIdle;
  ctx.save();
  ctx.translate(T.x, T.y);
  ctx.rotate(T.r);
  ctx.scale(T.s, T.s);
  if (glow) {
    ctx.shadowColor = 'rgba(255,214,120,0.9)';
    ctx.shadowBlur = 26;
  }
  inst.draw(ctx, fxState, state.t);
  if (inst.id === 'violin' && i === state.sel && state.p > 0.5) {
    ctx.shadowBlur = 0;
    drawBow(ctx, fxState.bowX);
  }
  ctx.restore();
}
const freshFxIdle = freshFx();

function drawHeldHands(T) {
  const inst = INSTRUMENTS[state.sel];
  const rise = (1 - clamp(state.p * 2 - 1, 0, 1)) * 420;
  inst.hands(state.fx).forEach((h) => {
    const w = toScreen(T, h.at[0], h.at[1]);
    const opts = { curl: h.curl || 0 };
    if (h.target) {
      const tg = toScreen(T, h.target[0], h.target[1]);
      opts.stickTarget = { x: tg.x, y: tg.y + rise };
    }
    drawArm(ctx, h.anchor.x, h.anchor.y + rise, w.x, w.y + rise, h.pose, h.side, opts);
  });
}

function drawBrowseHands() {
  const drop = clamp(state.p * 2, 0, 1) * 420;
  const m = state.mouse;
  // Right hand points at the cursor.
  const dx = m.x - ARM_R.x;
  const dy = m.y - ARM_R.y;
  const d = Math.hypot(dx, dy) || 1;
  const reach = clamp(d * 0.45, 250, 420);
  const wx = ARM_R.x + (dx / d) * reach;
  const wy = ARM_R.y + (dy / d) * reach;
  // Left hand rests, gently breathing.
  const lx = 300 + Math.sin(state.t * 1.6) * 4;
  const ly = 680 + Math.sin(state.t * 1.6 + 1) * 5;
  drawArm(ctx, ARM_L.x, ARM_L.y + drop, lx, ly + drop, 'open', 'L', { curl: 0.3 });
  drawArm(ctx, ARM_R.x, ARM_R.y + drop, wx, wy + drop, 'point', 'R');
}

function layoutPads() {
  const n = 8;
  const w = 82;
  const gap = 10;
  const total = n * w + (n - 1) * gap;
  const x0 = (W - total) / 2;
  state.pads = Array.from({ length: n }, (_, i) => ({ x: x0 + i * (w + gap), y: 66, w, h: 60 }));
}
layoutPads();

function drawHUD() {
  const c = ctx;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const holding = state.sel >= 0 && state.target === 1;
  const a = holding ? clamp(state.p * 2 - 1, 0, 1) : 1 - clamp(state.p * 2, 0, 1);

  if (!holding) {
    c.globalAlpha = a;
    c.fillStyle = 'rgba(15,8,18,0.6)';
    rr(c, W / 2 - 300, H - 52, 600, 38, 19);
    c.fill();
    c.fillStyle = '#f5e6c8';
    c.font = '15px "Trebuchet MS", sans-serif';
    c.fillText('Point & click an instrument  ·  or press 1–5  ·  ← → then Enter', W / 2, H - 33);

    if (state.sel < 0) {
      const cam = camera();
      const T = shelfTransform(state.focus, cam);
      const inst = INSTRUMENTS[state.focus];
      drawTooltip(c, T.x, T.y - inst.bottom * inst.shelfS * 2 - 26, inst.name, `${inst.blurb} · click to pick up`);
    }
  } else {
    const inst = INSTRUMENTS[state.sel];
    c.globalAlpha = a;
    c.font = 'bold 26px "Trebuchet MS", sans-serif';
    c.fillStyle = '#fff3d6';
    c.fillText(inst.name, W / 2, 34);
    const names = inst.id === 'drums' ? DRUM_NAMES : NOTE_NAMES;
    state.pads.forEach((p, i) => {
      const on = state.fx.held[i] || state.fx.levels[i] > 0.6;
      c.fillStyle = on ? inst.color : 'rgba(20,12,24,0.78)';
      rr(c, p.x, p.y + (on ? 2 : 0), p.w, p.h, 10);
      c.fill();
      c.strokeStyle = on ? '#fff' : 'rgba(233,196,106,0.7)';
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = on ? '#1a0f14' : '#fff3d6';
      c.font = 'bold 22px "Trebuchet MS", sans-serif';
      c.fillText(keyLabels[i], p.x + p.w / 2, p.y + 22 + (on ? 2 : 0));
      c.font = '12px "Trebuchet MS", sans-serif';
      c.fillStyle = on ? '#1a0f14' : '#cbb79a';
      c.fillText(names[i], p.x + p.w / 2, p.y + 45 + (on ? 2 : 0));
    });
    c.fillStyle = 'rgba(15,8,18,0.6)';
    rr(c, W - 330, H - 50, 316, 36, 18);
    c.fill();
    c.fillStyle = '#f5e6c8';
    c.font = '14px "Trebuchet MS", sans-serif';
    c.fillText('Esc / right-click: put back  ·  1–5: swap', W - 172, H - 32);
  }
  c.restore();
}

function render() {
  const c = ctx;
  c.setTransform(pxScale, 0, 0, pxScale, 0, 0);
  const cam = camera();
  const focus = state.sel < 0 ? state.focus : -1;

  drawRoom(c, cam, state.t, focus);
  drawShelf(c, cam, INSTRUMENTS.map((i) => i.name), focus);

  INSTRUMENTS.forEach((_, i) => {
    if (i !== state.sel) drawInstrument(i, shelfTransform(i, cam), i === focus);
  });

  // Dim the room while holding something
  const dim = ease(state.p) * 0.75;
  if (dim > 0) {
    const g = c.createRadialGradient(W / 2, H * 0.6, 100, W / 2, H / 2, 800);
    g.addColorStop(0, `rgba(10,6,14,${dim * 0.5})`);
    g.addColorStop(1, `rgba(10,6,14,${dim})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  if (state.sel >= 0) {
    const T = currentTransform(state.sel, cam);
    drawInstrument(state.sel, T, false);
    if (state.p > 0.5) drawHeldHands(T);
  }
  if (state.p < 0.5) drawBrowseHands();

  // particles
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const p of state.particles) {
    c.globalAlpha = clamp(p.life, 0, 1);
    c.fillStyle = p.color;
    c.font = `${p.size}px serif`;
    c.fillText(p.ch, p.x, p.y);
  }
  c.restore();

  drawHUD();
  drawReticle(c, state.mouse.x, state.mouse.y);
}

// ------------------------------------------------------------------ Input

function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

function padAt(pt) {
  if (!canPlay()) return -1;
  return state.pads.findIndex((p) => pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h);
}

canvas.addEventListener('pointermove', (e) => {
  state.mouse = toLogical(e);
  state.mouseMoved = true;
});

canvas.addEventListener('pointerdown', (e) => {
  state.mouse = toLogical(e);
  Sound.init();
  if (e.button === 2) {
    if (state.sel >= 0) putDown();
    return;
  }
  const pad = padAt(state.mouse);
  if (pad >= 0) {
    state.padDown = pad;
    noteOn(pad);
    return;
  }
  if (state.sel < 0 || state.target === 0) {
    const cam = camera();
    const hit = SLOT_X.findIndex((x) => Math.abs(state.mouse.x - (x + cam.x)) < 105 && state.mouse.y > 150 && state.mouse.y < SHELF_Y + 70);
    if (hit >= 0) pick(hit);
  }
});

window.addEventListener('pointerup', () => {
  if (state.padDown >= 0) {
    noteOff(state.padDown);
    state.padDown = -1;
  }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const digit = /^Digit([1-5])$/.exec(e.code) || /^Numpad([1-5])$/.exec(e.code);
  if (digit) {
    pick(Number(digit[1]) - 1);
    return;
  }
  const k = KEY_CODES.indexOf(e.code);
  if (k >= 0 && canPlay()) {
    noteOn(k);
    e.preventDefault();
    return;
  }
  const browsing = state.sel < 0;
  if (e.code === 'Escape' || e.code === 'Backspace') {
    if (state.sel >= 0) putDown();
  } else if (browsing && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
    state.mouseMoved = false;
    state.focus = (state.focus + (e.code === 'ArrowLeft' ? -1 : 1) + INSTRUMENTS.length) % INSTRUMENTS.length;
  } else if (browsing && (e.code === 'Enter' || e.code === 'Space')) {
    pick(state.focus);
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  const k = KEY_CODES.indexOf(e.code);
  if (k >= 0) noteOff(k);
});

window.addEventListener('blur', releaseAll);

// ----------------------------------------------------------------- Sizing

function resize() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  const cw = Math.floor(W * scale);
  const ch = Math.floor(H * scale);
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  pxScale = canvas.width / W;
}
window.addEventListener('resize', resize);
resize();

// Debug / deep link: index.html?pick=3 starts holding instrument 3.
const startPick = Number(new URLSearchParams(location.search).get('pick'));
if (startPick >= 1 && startPick <= INSTRUMENTS.length) {
  state.sel = startPick - 1;
  state.focus = startPick - 1;
  state.target = 1;
  state.p = 1;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
