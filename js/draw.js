// All visuals are drawn procedurally on a 1280x720 logical canvas.
const W = 1280;
const H = 720;
const SLOT_X = [180, 410, 640, 870, 1100];
const SHELF_Y = 500; // top of the display counter

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ---------------------------------------------------------------- Room

function drawRoom(c, cam, t, focus, selAway) {
  const wx = cam.x * 0.5;
  const wy = cam.y * 0.5;

  // Wall
  const wall = c.createLinearGradient(0, 0, 0, 560);
  wall.addColorStop(0, '#2a1d33');
  wall.addColorStop(1, '#4b3242');
  c.fillStyle = wall;
  c.fillRect(-60, -60, W + 120, 640);

  c.save();
  c.translate(wx, wy);

  // Vertical wallpaper stripes
  c.fillStyle = 'rgba(255,255,255,0.025)';
  for (let x = -40; x < W + 40; x += 64) c.fillRect(x, -60, 26, 480);

  // Neon sign
  c.save();
  const flick = 0.85 + 0.15 * Math.sin(t * 13) * (Math.sin(t * 0.7) > 0.95 ? 1 : 0);
  c.globalAlpha = flick;
  c.font = 'bold 54px "Trebuchet MS", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = '#ff4fb3';
  c.shadowBlur = 28;
  c.fillStyle = '#ffd1ef';
  c.fillText('♪ MUSIC ROOM ♫', W / 2, 92);
  c.restore();

  // Framed records
  for (const [fx, fy] of [[230, 190], [1050, 190]]) {
    c.fillStyle = '#1b1218';
    rr(c, fx - 62, fy - 62, 124, 124, 6);
    c.fill();
    c.strokeStyle = '#b08d57';
    c.lineWidth = 5;
    c.stroke();
    c.fillStyle = '#0b0b0b';
    c.beginPath();
    c.arc(fx, fy, 48, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 1;
    for (let r = 20; r < 46; r += 5) {
      c.beginPath();
      c.arc(fx, fy, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = fx < W / 2 ? '#e8504f' : '#4fb6e8';
    c.beginPath();
    c.arc(fx, fy, 15, 0, Math.PI * 2);
    c.fill();
  }

  // Wainscot
  c.fillStyle = '#3a241b';
  c.fillRect(-60, 400, W + 120, 180);
  c.fillStyle = '#5a3a28';
  c.fillRect(-60, 396, W + 120, 8);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 2;
  for (let x = 0; x < W + 60; x += 120) {
    c.strokeRect(x + 10, 420, 100, 70);
  }
  c.restore();

  // Floor with perspective planks
  const fy = 560 + wy;
  const floor = c.createLinearGradient(0, fy, 0, H);
  floor.addColorStop(0, '#4a3022');
  floor.addColorStop(1, '#7a5236');
  c.fillStyle = floor;
  c.fillRect(-60, fy, W + 120, H - fy + 60);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 2;
  const vx = W / 2 + wx;
  for (let i = -12; i <= 12; i++) {
    c.beginPath();
    c.moveTo(vx + i * 40, fy);
    c.lineTo(vx + i * 190, H + 40);
    c.stroke();
  }

  // Spotlight cones
  SLOT_X.forEach((sx, i) => {
    const x = sx + cam.x;
    const on = i === focus ? 1 : 0.45;
    const g = c.createLinearGradient(0, 0, 0, SHELF_Y);
    g.addColorStop(0, `rgba(255,236,190,${0.22 * on})`);
    g.addColorStop(1, `rgba(255,236,190,${0.02 * on})`);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - 18, -10);
    c.lineTo(x + 18, -10);
    c.lineTo(x + 105, SHELF_Y + cam.y);
    c.lineTo(x - 105, SHELF_Y + cam.y);
    c.closePath();
    c.fill();
    // lamp
    c.fillStyle = '#222';
    rr(c, x - 22, -10, 44, 22, 6);
    c.fill();
    c.fillStyle = `rgba(255,240,200,${0.5 + 0.5 * on})`;
    c.fillRect(x - 14, 9, 28, 4);
  });
}

function drawShelf(c, cam, names, focus, selAway) {
  c.save();
  c.translate(cam.x, cam.y);
  // counter
  c.fillStyle = '#8a5a3a';
  c.fillRect(40, SHELF_Y, W - 80, 24);
  c.fillStyle = '#5b3a26';
  c.fillRect(40, SHELF_Y + 24, W - 80, 60);
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(40, SHELF_Y, W - 80, 3);

  SLOT_X.forEach((x, i) => {
    // riser
    c.fillStyle = i === focus ? '#efe6d2' : '#cfc5b2';
    c.beginPath();
    c.ellipse(x, SHELF_Y + 2, 78, 12, 0, 0, Math.PI * 2);
    c.fill();
    // brass name plate
    c.fillStyle = i === focus ? '#e9c46a' : '#b8954c';
    rr(c, x - 70, SHELF_Y + 38, 140, 26, 4);
    c.fill();
    c.fillStyle = '#3a2614';
    c.font = 'bold 13px "Trebuchet MS", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(`${i + 1} · ${names[i].toUpperCase()}`, x, SHELF_Y + 52);
  });
  c.restore();
}

// ---------------------------------------------------------- Instruments
// Each draw function draws around (0,0) in its own local space.

function strings(c, n, top, topSpread, bot, botSpread, vib, t, color) {
  c.strokeStyle = color;
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const x0 = -topSpread + f * topSpread * 2;
    const x1 = -botSpread + f * botSpread * 2;
    const v = (vib[i] || 0) * 4 * Math.sin(t * 80 + i * 1.7);
    c.lineWidth = 0.8 + (n - i) * 0.12;
    c.beginPath();
    c.moveTo(x0, top);
    c.quadraticCurveTo((x0 + x1) / 2 + v, (top + bot) / 2, x1, bot);
    c.stroke();
  }
}

function drawGuitar(c, st, t) {
  // headstock + tuners
  c.fillStyle = '#2e1b0f';
  rr(c, -13, -130, 26, 30, 6);
  c.fill();
  c.fillStyle = '#d8d2c0';
  for (const y of [-124, -115, -106]) {
    c.beginPath(); c.arc(-16, y, 3, 0, 7); c.fill();
    c.beginPath(); c.arc(16, y, 3, 0, 7); c.fill();
  }
  // body
  const body = c.createLinearGradient(-50, 0, 50, 0);
  body.addColorStop(0, '#a0612c');
  body.addColorStop(0.5, '#e0a35f');
  body.addColorStop(1, '#a0612c');
  c.fillStyle = '#4a2a12';
  c.beginPath();
  c.ellipse(0, 10, 42, 38, 0, 0, 7);
  c.ellipse(0, 68, 54, 52, 0, 0, 7);
  c.fill();
  c.fillStyle = body;
  c.beginPath();
  c.ellipse(0, 10, 38, 34, 0, 0, 7);
  c.ellipse(0, 68, 50, 48, 0, 0, 7);
  c.fill();
  // sound hole
  c.strokeStyle = '#4a2a12';
  c.lineWidth = 3;
  c.beginPath(); c.arc(0, 26, 19, 0, 7); c.stroke();
  c.fillStyle = '#1a0e06';
  c.beginPath(); c.arc(0, 26, 14, 0, 7); c.fill();
  // neck / fingerboard
  c.fillStyle = '#3d2412';
  c.fillRect(-8, -102, 16, 112);
  c.strokeStyle = '#cfc8b4';
  c.lineWidth = 1.2;
  for (let y = -94; y < 6; y += 10) {
    c.beginPath(); c.moveTo(-8, y); c.lineTo(8, y); c.stroke();
  }
  c.fillStyle = '#efe9d6';
  c.fillRect(-8, -104, 16, 3); // nut
  // bridge
  c.fillStyle = '#2e1b0f';
  rr(c, -18, 86, 36, 8, 3);
  c.fill();
  const sv = [0, 0, 0, 0, 0, 0];
  st.levels.forEach((l, i) => { sv[i % 6] = Math.max(sv[i % 6], l); });
  strings(c, 6, -102, 6, 89, 10, sv, t, '#f4f0e6');
}

function drawKeyboard(c, st) {
  const g = c.createLinearGradient(0, -42, 0, 42);
  g.addColorStop(0, '#3a3a44');
  g.addColorStop(1, '#16161c');
  c.fillStyle = g;
  rr(c, -136, -44, 272, 86, 10);
  c.fill();
  // screen + knobs
  c.fillStyle = '#0c2a2c';
  rr(c, -38, -36, 76, 18, 3);
  c.fill();
  c.fillStyle = '#5ff2d9';
  c.font = 'bold 10px monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(st.lcd || 'E.PIANO', 0, -27);
  for (let k = 0; k < 3; k++) {
    c.fillStyle = '#888';
    c.beginPath(); c.arc(-112 + k * 18, -27, 6, 0, 7); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-112 + k * 18, -27); c.lineTo(-112 + k * 18 + 4, -31); c.stroke();
  }
  for (let k = 0; k < 4; k++) {
    c.fillStyle = '#555';
    c.fillRect(60 + k * 16, -36, 4, 18);
    c.fillStyle = '#ddd';
    c.fillRect(56 + k * 16, -30 + ((k * 7) % 10), 12, 5);
  }
  // keys
  const x0 = -120;
  const w = 30;
  for (let i = 0; i < 8; i++) {
    const down = st.held[i];
    c.fillStyle = down ? '#ffd36e' : '#f7f4ec';
    rr(c, x0 + i * w + 1, -12 + (down ? 2 : 0), w - 2, 48, 3);
    c.fill();
    c.strokeStyle = '#8f8a80';
    c.lineWidth = 1;
    c.stroke();
  }
  for (const i of [0, 1, 3, 4, 5]) {
    c.fillStyle = '#0d0d10';
    rr(c, x0 + (i + 1) * w - 9, -12, 18, 28, 2);
    c.fill();
  }
}

const DRUM_PIECE = ['skin', 'skin', 'cym', 'cym', 'skin', 'skin', 'skin', 'cym'];

function drawDrums(c, st, t) {
  // cymbal on a stand
  c.strokeStyle = '#9a9a9a';
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(100, -58); c.lineTo(100, 50); c.stroke();
  c.save();
  c.translate(100, -60);
  c.rotate(Math.sin(t * 28) * 0.18 * st.cym - 0.08);
  const cg = c.createLinearGradient(-50, 0, 50, 0);
  cg.addColorStop(0, '#b48a2a');
  cg.addColorStop(0.5, '#f5d77a');
  cg.addColorStop(1, '#b48a2a');
  c.fillStyle = cg;
  c.beginPath(); c.ellipse(0, 0, 50, 9, 0, 0, 7); c.fill();
  c.fillStyle = '#8a6a1a';
  c.beginPath(); c.ellipse(0, -2, 7, 3, 0, 0, 7); c.fill();
  c.restore();

  // snare shell
  const sg = c.createLinearGradient(-62, 0, 62, 0);
  sg.addColorStop(0, '#7a1020');
  sg.addColorStop(0.45, '#e0324a');
  sg.addColorStop(1, '#7a1020');
  c.fillStyle = sg;
  c.beginPath(); c.ellipse(0, 32, 62, 16, 0, 0, Math.PI); c.fill();
  c.fillRect(-62, -20, 124, 52);
  // lugs
  c.fillStyle = '#d9d9d9';
  for (let x = -48; x <= 48; x += 24) rr(c, x - 4, -10, 8, 32, 3), c.fill();
  // head
  const hit = st.skin;
  c.fillStyle = '#efe9da';
  c.beginPath(); c.ellipse(0, -20 + hit * 1.5, 62, 16, 0, 0, 7); c.fill();
  c.strokeStyle = '#c9c9c9';
  c.lineWidth = 4;
  c.beginPath(); c.ellipse(0, -20, 62, 16, 0, 0, 7); c.stroke();
  c.beginPath(); c.ellipse(0, 32, 62, 16, 0, 0, Math.PI); c.stroke();
  // ripple
  if (hit > 0.02) {
    c.strokeStyle = `rgba(200,60,80,${hit})`;
    c.lineWidth = 2;
    const r = (1 - hit) * 55 + 4;
    c.beginPath(); c.ellipse(0, -20, r, r * 0.26, 0, 0, 7); c.stroke();
  }
}

function drawViolin(c, st, t) {
  // scroll + pegbox
  c.fillStyle = '#5a240c';
  rr(c, -6, -122, 12, 26, 4);
  c.fill();
  c.beginPath(); c.arc(0, -124, 9, 0, 7); c.fill();
  c.strokeStyle = '#2d1205';
  c.lineWidth = 2;
  c.beginPath(); c.arc(0, -124, 5, 0, 5); c.stroke();
  c.fillStyle = '#1a1a1a';
  for (const y of [-116, -106]) {
    c.fillRect(-12, y, 6, 4);
    c.fillRect(6, y + 4, 6, 4);
  }
  // neck
  c.fillStyle = '#8a4119';
  c.fillRect(-6, -98, 12, 40);
  // body
  c.fillStyle = '#3a1406';
  c.beginPath();
  c.ellipse(0, -24, 34, 34, 0, 0, 7);
  c.ellipse(0, 38, 42, 44, 0, 0, 7);
  c.fill();
  const bg = c.createRadialGradient(-8, 20, 6, 0, 20, 70);
  bg.addColorStop(0, '#e07a32');
  bg.addColorStop(1, '#8e3812');
  c.fillStyle = bg;
  c.beginPath();
  c.ellipse(0, -24, 30, 30, 0, 0, 7);
  c.ellipse(0, 38, 38, 40, 0, 0, 7);
  c.fill();
  // f-holes
  c.strokeStyle = '#1c0a03';
  c.lineWidth = 2.2;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 18, 12);
    c.bezierCurveTo(s * 10, 26, s * 26, 40, s * 18, 54);
    c.stroke();
    c.fillStyle = '#1c0a03';
    c.beginPath(); c.arc(s * 18, 12, 2, 0, 7); c.fill();
    c.beginPath(); c.arc(s * 18, 54, 2, 0, 7); c.fill();
  }
  // fingerboard
  c.fillStyle = '#111';
  c.beginPath();
  c.moveTo(-5, -100); c.lineTo(5, -100); c.lineTo(9, 18); c.lineTo(-9, 18);
  c.closePath(); c.fill();
  // bridge + tailpiece
  c.fillStyle = '#e8cf9f';
  c.fillRect(-15, 40, 30, 4);
  c.fillStyle = '#111';
  c.beginPath();
  c.moveTo(-10, 56); c.lineTo(10, 56); c.lineTo(6, 80); c.lineTo(-6, 80);
  c.closePath(); c.fill();
  const sv = [0, 0, 0, 0];
  st.levels.forEach((l, i) => { sv[i % 4] = Math.max(sv[i % 4], l); });
  strings(c, 4, -100, 3.5, 57, 7, sv, t, '#e8e2d4');
}

function drawBow(c, bx) {
  // In violin-local space, crossing the strings just above the bridge.
  c.save();
  c.translate(bx, 30);
  c.rotate(-0.06);
  c.strokeStyle = '#f2ecdc';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(-160, 4); c.lineTo(150, 4); c.stroke();
  c.strokeStyle = '#4a1e08';
  c.lineWidth = 3.5;
  c.beginPath(); c.moveTo(-165, 0); c.lineTo(160, -3); c.stroke();
  c.fillStyle = '#111';
  rr(c, 140, -6, 22, 12, 3);
  c.fill();
  c.restore();
}

// Fingering shown on the trumpet valves for each scale note
const VALVES = [[], [1, 3], [1, 2], [1], [], [1, 2], [2], []];

function drawTrumpet(c, st) {
  const gold = c.createLinearGradient(0, -60, 0, 30);
  gold.addColorStop(0, '#fff0a8');
  gold.addColorStop(0.5, '#e2b54a');
  gold.addColorStop(1, '#9c6e1e');
  c.lineCap = 'round';
  c.strokeStyle = gold;
  // tubing
  c.lineWidth = 7;
  rr(c, -78, -18, 150, 40, 20);
  c.stroke();
  c.beginPath(); c.moveTo(-122, -18); c.lineTo(80, -18); c.stroke();
  rr(c, -112, -18, 40, 26, 12);
  c.stroke();
  // bell
  c.fillStyle = gold;
  c.beginPath();
  c.moveTo(72, -22);
  c.lineTo(96, -23);
  c.quadraticCurveTo(122, -26, 138, -54);
  c.lineTo(138, 18);
  c.quadraticCurveTo(122, -10, 96, -13);
  c.lineTo(72, -14);
  c.closePath();
  c.fill();
  c.fillStyle = '#7a5214';
  c.beginPath(); c.ellipse(138, -18, 7, 36, 0, 0, 7); c.fill();
  c.fillStyle = '#fbe08a';
  c.beginPath(); c.ellipse(139, -18, 4, 33, 0, 0, 7); c.fill();
  // mouthpiece
  c.fillStyle = '#d7d7d7';
  c.beginPath();
  c.moveTo(-122, -21); c.lineTo(-136, -26); c.lineTo(-136, -10); c.lineTo(-122, -15);
  c.closePath(); c.fill();
  // valves
  for (let k = 0; k < 3; k++) {
    const x = -24 + k * 24;
    const press = st.valves[k];
    c.fillStyle = '#c4c4c4';
    c.fillRect(x - 3, -54 + press * 9, 6, 16);
    c.fillStyle = '#f3eee2';
    rr(c, x - 8, -60 + press * 9, 16, 7, 3);
    c.fill();
    c.fillStyle = gold;
    rr(c, x - 9, -40, 18, 66, 5);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(x - 5, -36, 3, 58);
  }
}

// ------------------------------------------------------- First-person arms

const SKIN = '#e6b38e';
const SKIN_LINE = '#b07a56';

// Draws a sleeve from an off-screen anchor (the shoulder) to the wrist,
// then a hand (back view) pointing along the arm.
function drawArm(c, ax, ay, wx, wy, pose, side, opts = {}) {
  const a = Math.atan2(wy - ay, wx - ax);
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = '#2b3754';
  c.lineWidth = 78;
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(wx - Math.cos(a) * 12, wy - Math.sin(a) * 12); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.06)';
  c.lineWidth = 20;
  c.beginPath(); c.moveTo(ax - 14, ay); c.lineTo(wx - Math.cos(a) * 30 - 14, wy - Math.sin(a) * 30); c.stroke();
  c.strokeStyle = '#1f2840';
  c.lineWidth = 82;
  c.lineCap = 'butt';
  c.beginPath();
  c.moveTo(wx - Math.cos(a) * 34, wy - Math.sin(a) * 34);
  c.lineTo(wx - Math.cos(a) * 12, wy - Math.sin(a) * 12);
  c.stroke();

  const sc = opts.scale || 1.15;
  if (opts.stickTarget) {
    // Aim the drumstick from the wrist toward a screen-space target.
    const tx = opts.stickTarget.x - wx;
    const ty = opts.stickTarget.y - wy;
    const rel = Math.atan2(ty, tx) - a;
    opts.stickAngle = side === 'L' ? -rel : rel;
    opts.stickLen = Math.hypot(tx, ty) / sc;
  }
  c.translate(wx, wy);
  c.rotate(a);
  c.scale(sc, side === 'L' ? -sc : sc);
  drawHand(c, pose, opts);
  c.restore();
}

function finger(c, x, y, len, w) {
  rr(c, x, y - w / 2, len, w, w / 2);
  c.fill();
  c.stroke();
}

function drawHand(c, pose, opts) {
  c.fillStyle = SKIN;
  c.strokeStyle = SKIN_LINE;
  c.lineWidth = 2.2;

  const ys = [-17, -5.5, 5.5, 16];
  let lens;
  if (pose === 'open') lens = [40, 44, 40, 32];
  else if (pose === 'point') lens = [46, 18, 16, 14];
  else lens = [18, 20, 18, 15]; // grip / stick
  const curl = opts.curl || 0;
  ys.forEach((y, i) => finger(c, 36, y, lens[i] * (1 - curl * 0.5) + 12, i === 3 ? 10 : 12));

  // thumb
  c.save();
  c.translate(18, -22);
  c.rotate(pose === 'grip' || pose === 'stick' ? -0.2 : -0.75);
  finger(c, -4, 0, pose === 'grip' || pose === 'stick' ? 26 : 34, 13);
  c.restore();

  // palm (back of hand)
  rr(c, -4, -26, 56, 52, 18);
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(150,90,60,0.35)';
  c.lineWidth = 1.5;
  for (const y of ys) {
    c.beginPath(); c.moveTo(44, y - 3); c.lineTo(44, y + 3); c.stroke();
  }

  if (pose === 'stick') {
    c.save();
    c.rotate(opts.stickAngle || 0);
    c.strokeStyle = '#d9b67c';
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(-10, 0); c.lineTo(opts.stickLen || 180, 0); c.stroke();
    c.fillStyle = '#efd6a6';
    c.beginPath(); c.arc(opts.stickLen || 180, 0, 6, 0, 7); c.fill();
    c.restore();
    // fingers wrapped over the stick
    c.fillStyle = SKIN;
    c.strokeStyle = SKIN_LINE;
    c.lineWidth = 2.2;
    rr(c, 36, -14, 22, 28, 9);
    c.fill();
    c.stroke();
  }
}

// --------------------------------------------------------------- HUD bits

function drawReticle(c, x, y) {
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, 9, 0, 7); c.stroke();
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill();
  c.restore();
}

function drawTooltip(c, x, y, title, sub) {
  c.save();
  c.font = 'bold 20px "Trebuchet MS", sans-serif';
  const w = Math.max(c.measureText(title).width, 190) + 36;
  c.fillStyle = 'rgba(20,12,24,0.88)';
  rr(c, x - w / 2, y - 58, w, 56, 10);
  c.fill();
  c.strokeStyle = '#e9c46a';
  c.lineWidth = 2;
  c.stroke();
  c.beginPath();
  c.moveTo(x - 9, y - 2); c.lineTo(x + 9, y - 2); c.lineTo(x, y + 9);
  c.closePath();
  c.fillStyle = 'rgba(20,12,24,0.88)';
  c.fill();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#fff3d6';
  c.fillText(title, x, y - 39);
  c.font = '13px "Trebuchet MS", sans-serif';
  c.fillStyle = '#cbb79a';
  c.fillText(sub, x, y - 17);
  c.restore();
}
