// Procedural instrument synthesis with the Web Audio API (no sample files needed).
const Sound = (() => {
  let ac = null;
  let out = null;
  let noiseBuf = null;
  const ksCache = new Map();

  // C major scale, C4..C5 (semitones from C4)
  const SCALE = [0, 2, 4, 5, 7, 9, 11, 12];
  const freq = (i) => 261.63 * Math.pow(2, SCALE[i] / 12);

  function init() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const master = ac.createGain();
      master.gain.value = 0.7;
      const comp = ac.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ac.destination);

      // Small room reverb
      const conv = ac.createConvolver();
      conv.buffer = impulse(1.6, 3);
      const wet = ac.createGain();
      wet.gain.value = 0.25;
      out = ac.createGain();
      out.connect(master);
      out.connect(conv);
      conv.connect(wet);
      wet.connect(master);

      noiseBuf = makeNoise(2);
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function impulse(sec, decay) {
    const len = Math.floor(ac.sampleRate * sec);
    const b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  function makeNoise(sec) {
    const len = Math.floor(ac.sampleRate * sec);
    const b = ac.createBuffer(1, len, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  const osc = (type, f) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = f;
    return o;
  };
  const gain = (v) => {
    const g = ac.createGain();
    g.gain.value = v;
    return g;
  };
  const filter = (type, f, q = 1) => {
    const b = ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  };

  // Smooth release for sustained voices
  function release(g, sources, time = 0.08) {
    const now = ac.currentTime;
    const p = g.gain;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now);
    else {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
    }
    p.setTargetAtTime(0, now, time);
    sources.forEach((s) => {
      try { s.stop(now + time * 8); } catch (e) { /* already stopped */ }
    });
  }

  // ---- Guitar: Karplus-Strong plucked string ----
  function ksBuffer(f) {
    const key = f.toFixed(2);
    if (ksCache.has(key)) return ksCache.get(key);
    const sr = ac.sampleRate;
    const len = Math.floor(sr * 2.5);
    const buf = ac.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const n = Math.max(2, Math.round(sr / f));
    const ring = new Float32Array(n);
    for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const nxt = (idx + 1) % n;
      d[i] = ring[idx];
      ring[idx] = (ring[idx] + ring[nxt]) * 0.5 * 0.996;
      idx = nxt;
    }
    ksCache.set(key, buf);
    return buf;
  }

  function guitar(i) {
    const src = ac.createBufferSource();
    src.buffer = ksBuffer(freq(i) / 2);
    const lp = filter('lowpass', 3800, 0.5);
    const g = gain(0.9);
    src.connect(lp).connect(g).connect(out);
    src.start();
    return null; // plucked: rings out on its own
  }

  // ---- Keyboard: soft electric piano ----
  function keyboard(i) {
    const f = freq(i);
    const t = ac.currentTime;
    const g = gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.001, t + 5);
    const o1 = osc('triangle', f);
    const o2 = osc('sine', f * 2);
    const g2 = gain(0.22);
    const o3 = osc('sine', f * 4);
    const g3 = gain(0.06);
    g3.gain.setTargetAtTime(0, t, 0.08);
    o1.connect(g);
    o2.connect(g2).connect(g);
    o3.connect(g3).connect(g);
    g.connect(out);
    const srcs = [o1, o2, o3];
    srcs.forEach((o) => { o.start(t); o.stop(t + 5.1); });
    return { stop: () => release(g, srcs, 0.12) };
  }

  // ---- Violin: bowed sawtooth with delayed vibrato ----
  function violin(i) {
    const f = freq(i);
    const t = ac.currentTime;
    const o1 = osc('sawtooth', f);
    const o2 = osc('sawtooth', f * 1.004);
    const lfo = osc('sine', 5.6);
    const depth = gain(0);
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * 0.012, t + 0.45);
    lfo.connect(depth);
    depth.connect(o1.frequency);
    depth.connect(o2.frequency);
    const body = filter('peaking', 2800, 1.5);
    body.gain.value = 6;
    const lp = filter('lowpass', 4200, 0.7);
    const g = gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.14);
    o1.connect(lp);
    o2.connect(lp);
    lp.connect(body).connect(g).connect(out);
    const srcs = [o1, o2, lfo];
    srcs.forEach((o) => o.start(t));
    return { stop: () => release(g, srcs, 0.09) };
  }

  // ---- Trumpet: brassy saw with filter "blat" ----
  function trumpet(i) {
    const f = freq(i);
    const t = ac.currentTime;
    const o1 = osc('sawtooth', f);
    const o2 = osc('square', f);
    const g2 = gain(0.25);
    const lfo = osc('sine', 5);
    const depth = gain(0);
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * 0.006, t + 0.5);
    lfo.connect(depth).connect(o1.frequency);
    const lp = filter('lowpass', 300, 3);
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.linearRampToValueAtTime(3200, t + 0.05);
    lp.frequency.setTargetAtTime(2000, t + 0.05, 0.15);
    const g = gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.03);
    g.gain.setTargetAtTime(0.2, t + 0.03, 0.2);
    o1.connect(lp);
    o2.connect(g2).connect(lp);
    lp.connect(g).connect(out);
    const srcs = [o1, o2, lfo];
    srcs.forEach((o) => o.start(t));
    return { stop: () => release(g, srcs, 0.05) };
  }

  // ---- Drums ----
  function noiseHit(hp, dur, level) {
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = filter('highpass', hp, 0.7);
    const g = gain(level);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  function toneHit(f0, f1, dur, level, type = 'sine') {
    const t = ac.currentTime;
    const o = osc(type, f0);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4);
    const g = gain(level);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const DRUMS = [
    () => toneHit(160, 42, 0.45, 1.0),                                  // kick
    () => { noiseHit(1200, 0.2, 0.6); toneHit(200, 140, 0.12, 0.4, 'triangle'); }, // snare
    () => noiseHit(7000, 0.05, 0.3),                                    // closed hat
    () => noiseHit(6500, 0.4, 0.25),                                    // open hat
    () => toneHit(110, 70, 0.5, 0.8),                                   // low tom
    () => toneHit(150, 95, 0.45, 0.8),                                  // mid tom
    () => toneHit(210, 135, 0.4, 0.8),                                  // high tom
    () => noiseHit(3500, 1.6, 0.3),                                     // crash
  ];

  function drum(i) {
    DRUMS[i]();
    return null;
  }

  const PLAYERS = { guitar, keyboard, drums: drum, violin, trumpet };

  function play(id, i) {
    init();
    return PLAYERS[id](i);
  }

  return { init, play };
})();
