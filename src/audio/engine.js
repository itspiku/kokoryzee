// Generative soundscape engine (Web Audio) ─────────────────────
// No audio files: rain, ocean, wind, birdsong, hearth, singing bowl, warm pad and a
// never-repeating soft piano are all synthesised live, so every minute is unique.
// The engine emits events ("note", "bowl", "bird", "ember") the artwork reacts to.

const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.layers = {};
    this.levels = {};
    this.listeners = {};
    this.playing = false;
    this.sceneId = null;
    this.volume = 0.7;
    this.endsAt = null;
    this._timerInt = null;
    this._breath = null;
  }

  // ── events ──
  on(evt, fn) {
    (this.listeners[evt] ||= new Set()).add(fn);
    return () => this.listeners[evt].delete(fn);
  }
  emit(evt, data) {
    this.listeners[evt]?.forEach((f) => {
      try {
        f(data);
      } catch {}
    });
  }
  snapshot() {
    return { playing: this.playing, sceneId: this.sceneId, endsAt: this.endsAt, levels: { ...this.levels }, volume: this.volume };
  }

  // ── graph ──
  init() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC({ latencyHint: 'playback' });
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 22;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.02;
    this.comp.release.value = 0.4;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.82;
    this.master.connect(this.comp);
    this.comp.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // reverb bus
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(3.6, 2.6);
    this.revSend = ctx.createGain();
    this.revSend.gain.value = 0.55;
    this.revSend.connect(this.reverb);
    this.reverb.connect(this.master);

    // dreamy delay bus (for piano)
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.46;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 2400;
    this.delay.connect(dlp);
    dlp.connect(fb);
    fb.connect(this.delay);
    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = 0.4;
    this.delaySend.connect(this.delay);
    dlp.connect(this.master);

    // noise buffers
    this.noise = {
      white: this._noise('white'),
      pink: this._noise('pink'),
      brown: this._noise('brown'),
    };
    return ctx;
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const n = Math.random() * 2 - 1;
        lp += (n - lp) * (0.55 - 0.45 * t); // gets darker over time
        d[i] = lp * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1);
      }
    }
    return buf;
  }

  _noise(type, seconds = 8) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      if (type === 'white') for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      else if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      } else {
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      }
    }
    return buf;
  }

  _src(buf, loop = true) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = loop;
    if (loop) s.loopStart = rnd(0, 1);
    return s;
  }

  _filter(type, f, q = 0.7) {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }

  _lfo(rate, depth, target) {
    const o = this.ctx.createOscillator();
    o.frequency.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = depth;
    o.connect(g);
    g.connect(target);
    o.start();
    return { o, g };
  }

  // connect a node to layer output + sends
  _out(layer, node, { rev = 0.3, dly = 0 } = {}) {
    node.connect(layer.gain);
    if (rev) {
      const r = this.ctx.createGain();
      r.gain.value = rev;
      node.connect(r);
      r.connect(this.revSend);
      layer.nodes.push(r);
    }
    if (dly) {
      const d = this.ctx.createGain();
      d.gain.value = dly;
      node.connect(d);
      d.connect(this.delaySend);
      layer.nodes.push(d);
    }
  }

  _loop(layer, fn, minMs, maxMs, immediate = false) {
    let stopped = false;
    const tick = () => {
      if (stopped || !this.playing) return;
      try {
        fn();
      } catch {}
      layer.timers.delete(t);
      t = setTimeout(tick, rnd(minMs, maxMs));
      layer.timers.add(t);
    };
    let t = setTimeout(tick, immediate ? 50 : rnd(minMs, maxMs));
    layer.timers.add(t);
    layer.cancel.push(() => (stopped = true));
  }

  // ── layers ──
  _makeLayer(name) {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    const layer = { name, gain, nodes: [], sources: [], timers: new Set(), cancel: [] };
    const builders = {
      rain: () => this._rain(layer),
      ocean: () => this._ocean(layer),
      wind: () => this._wind(layer),
      birds: () => this._birds(layer),
      fire: () => this._fire(layer),
      bowl: () => this._bowl(layer),
      pad: () => this._pad(layer),
      piano: () => this._piano(layer),
    };
    builders[name]?.();
    return layer;
  }

  _rain(L) {
    const src = this._src(this.noise.pink);
    const hp = this._filter('highpass', 700, 0.5);
    const lp = this._filter('lowpass', 8200, 0.4);
    const g = this.ctx.createGain();
    g.gain.value = 0.62;
    src.connect(hp); hp.connect(lp); lp.connect(g);
    this._out(L, g, { rev: 0.15 });
    src.start();
    const rum = this._src(this.noise.brown);
    const rlp = this._filter('lowpass', 260);
    const rg = this.ctx.createGain();
    rg.gain.value = 0.38;
    rum.connect(rlp); rlp.connect(rg);
    this._out(L, rg, { rev: 0.05 });
    rum.start();
    L.sources.push(src, rum);
    L.nodes.push(hp, lp, g, rlp, rg);
    // individual drops
    this._loop(L, () => {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const t = this.ctx.currentTime + Math.random() * 0.25;
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        const f = rnd(1400, 4600);
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.05);
        const e = this.ctx.createGain();
        e.gain.setValueAtTime(0, t);
        e.gain.linearRampToValueAtTime(rnd(0.008, 0.03), t + 0.003);
        e.gain.exponentialRampToValueAtTime(0.0001, t + rnd(0.03, 0.08));
        const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        if (p) p.pan.value = rnd(-0.9, 0.9);
        o.connect(e);
        const dest = p ? (e.connect(p), p) : e;
        this._out(L, dest, { rev: 0.35 });
        o.start(t);
        o.stop(t + 0.12);
        o.onended = () => { try { e.disconnect(); p?.disconnect(); } catch {} };
      }
    }, 60, 220, true);
  }

  _ocean(L) {
    const src = this._src(this.noise.brown);
    const lp = this._filter('lowpass', 520, 0.6);
    const swell = this.ctx.createGain();
    swell.gain.value = 0.55;
    src.connect(lp); lp.connect(swell);
    this._out(L, swell, { rev: 0.25 });
    src.start();
    const l1 = this._lfo(0.105, 0.38, swell.gain);
    const l2 = this._lfo(0.105, 380, lp.frequency);
    // foamy hiss on top of each wave
    const hiss = this._src(this.noise.pink);
    const hp = this._filter('highpass', 2600, 0.4);
    const hg = this.ctx.createGain();
    hg.gain.value = 0.06;
    hiss.connect(hp); hp.connect(hg);
    this._out(L, hg, { rev: 0.2 });
    hiss.start();
    const l3 = this._lfo(0.105, 0.05, hg.gain);
    L.sources.push(src, hiss, l1.o, l2.o, l3.o);
    L.nodes.push(lp, swell, hp, hg, l1.g, l2.g, l3.g);
  }

  _wind(L) {
    const src = this._src(this.noise.pink);
    const bp = this._filter('bandpass', 520, 1.1);
    const g = this.ctx.createGain();
    g.gain.value = 0.45;
    src.connect(bp); bp.connect(g);
    this._out(L, g, { rev: 0.4 });
    src.start();
    const l1 = this._lfo(0.063, 260, bp.frequency);
    const l2 = this._lfo(0.041, 0.28, g.gain);
    L.sources.push(src, l1.o, l2.o);
    L.nodes.push(bp, g, l1.g, l2.g);
  }

  _birds(L) {
    const chirp = (t, f0, f1, dur, vol, pan) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(300, f1), t + dur);
      const e = this.ctx.createGain();
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(vol, t + dur * 0.18);
      e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(e);
      const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (p) { p.pan.value = pan; e.connect(p); }
      this._out(L, p || e, { rev: 0.55 });
      o.start(t);
      o.stop(t + dur + 0.05);
      o.onended = () => { try { e.disconnect(); p?.disconnect(); } catch {} };
    };
    this._loop(L, () => {
      const t0 = this.ctx.currentTime + 0.05;
      const pan = rnd(-0.85, 0.85);
      const species = pickOne(['tweet', 'trill', 'coo', 'sweet']);
      const base = rnd(2200, 4600);
      if (species === 'tweet') {
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) chirp(t0 + i * 0.16, base, base * rnd(1.2, 1.7), rnd(0.08, 0.13), 0.05, pan);
      } else if (species === 'trill') {
        const n = 7 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) chirp(t0 + i * 0.06, base * (i % 2 ? 1.1 : 0.9), base * (i % 2 ? 0.85 : 1.25), 0.05, 0.035, pan);
      } else if (species === 'coo') {
        const f = rnd(520, 700);
        chirp(t0, f, f * 0.82, 0.38, 0.06, pan);
        chirp(t0 + 0.5, f * 1.05, f * 0.8, 0.5, 0.055, pan);
      } else {
        chirp(t0, base * 0.8, base * 1.5, 0.24, 0.05, pan);
        chirp(t0 + 0.28, base * 1.5, base * 0.9, 0.3, 0.05, pan);
        chirp(t0 + 0.64, base * 1.1, base * 1.6, 0.18, 0.045, pan);
      }
      this.emit('bird', { pan, species });
    }, 1400, 5200, true);
  }

  _fire(L) {
    const src = this._src(this.noise.brown);
    const lp = this._filter('lowpass', 380, 0.7);
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    src.connect(lp); lp.connect(g);
    this._out(L, g, { rev: 0.12 });
    src.start();
    const l1 = this._lfo(0.37, 0.12, g.gain);
    L.sources.push(src, l1.o);
    L.nodes.push(lp, g, l1.g);
    this._loop(L, () => {
      const t = this.ctx.currentTime;
      const big = Math.random() < 0.12;
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise.white;
      const hp = this._filter('bandpass', rnd(1200, 4200), 1.2);
      const e = this.ctx.createGain();
      const dur = big ? rnd(0.03, 0.07) : rnd(0.004, 0.02);
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(big ? rnd(0.18, 0.3) : rnd(0.02, 0.1), t + 0.002);
      e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(hp); hp.connect(e);
      const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (p) { p.pan.value = rnd(-0.6, 0.6); e.connect(p); }
      this._out(L, p || e, { rev: 0.18 });
      s.start(t, Math.random() * 6, dur + 0.05);
      s.onended = () => { try { e.disconnect(); hp.disconnect(); p?.disconnect(); } catch {} };
      if (big) this.emit('ember', { strength: 1 });
    }, 50, 420, true);
  }

  _bowl(L) {
    const strike = () => {
      const t = this.ctx.currentTime + 0.02;
      const f = pickOne([174.6, 196, 220, 261.6, 146.8]);
      const partials = [
        [1, 1.0, 16],
        [2.71, 0.5, 10],
        [5.33, 0.2, 6],
        [8.7, 0.08, 3.5],
      ];
      for (const [ratio, amp, dec] of partials) {
        for (const det of [-0.6, 0.7]) {
          const o = this.ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f * ratio + det * (ratio > 1 ? 1.5 : 1);
          const e = this.ctx.createGain();
          e.gain.setValueAtTime(0, t);
          e.gain.linearRampToValueAtTime(amp * 0.13, t + 0.03);
          e.gain.exponentialRampToValueAtTime(0.00008, t + dec);
          o.connect(e);
          this._out(L, e, { rev: 0.8 });
          o.start(t);
          o.stop(t + dec + 0.1);
          o.onended = () => { try { e.disconnect(); } catch {} };
        }
      }
      this.emit('bowl', { f });
    };
    this._loop(L, strike, 9500, 15000, true);
  }

  _pad(L) {
    const lp = this._filter('lowpass', 820, 0.5);
    L.nodes.push(lp);
    this._out(L, lp, { rev: 0.7 });
    const l = this._lfo(0.045, 220, lp.frequency);
    L.sources.push(l.o);
    L.nodes.push(l.g);
    const chords = [
      [38, 50, 57, 61, 64], // Dmaj9-ish
      [43, 50, 55, 59, 62], // Gmaj
      [35, 47, 54, 57, 62], // Bm
      [45, 52, 57, 59, 64], // Asus
    ];
    let ci = Math.floor(Math.random() * chords.length);
    const play = () => {
      const notes = chords[ci++ % chords.length];
      const t = this.ctx.currentTime;
      const dur = rnd(17, 23);
      for (const m of notes) {
        for (const type of ['sine', 'triangle']) {
          const o = this.ctx.createOscillator();
          o.type = type;
          o.frequency.value = mtof(m) * (1 + rnd(-0.0016, 0.0016));
          const e = this.ctx.createGain();
          const peak = type === 'sine' ? 0.05 : 0.018;
          e.gain.setValueAtTime(0, t);
          e.gain.linearRampToValueAtTime(peak, t + 6.5);
          e.gain.setValueAtTime(peak, t + dur - 7);
          e.gain.linearRampToValueAtTime(0, t + dur + 2);
          o.connect(e);
          e.connect(lp);
          o.start(t);
          o.stop(t + dur + 2.2);
          o.onended = () => { try { e.disconnect(); } catch {} };
        }
      }
      this.emit('chord', { notes });
    };
    play();
    this._loop(L, play, 15500, 19500);
  }

  _piano(L) {
    const scale = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83]; // D major pentatonic
    let idx = 4;
    const note = (m, vel, long = false) => {
      const t = this.ctx.currentTime + 0.02;
      const f = mtof(m);
      const mix = this.ctx.createGain();
      mix.gain.value = 1;
      const lp = this._filter('lowpass', Math.min(5000, f * 5), 0.4);
      mix.connect(lp);
      const parts = [
        [1, 1, long ? 5 : 3.2],
        [2, 0.32, 1.8],
        [3, 0.12, 1.0],
        [4.01, 0.05, 0.5],
      ];
      for (const [r, a, d] of parts) {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * r;
        const e = this.ctx.createGain();
        e.gain.setValueAtTime(0, t);
        e.gain.linearRampToValueAtTime(a * vel * 0.16, t + 0.006);
        e.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(e);
        e.connect(mix);
        o.start(t);
        o.stop(t + d + 0.1);
        o.onended = () => { try { e.disconnect(); } catch {} };
      }
      // soft hammer
      const h = this.ctx.createBufferSource();
      h.buffer = this.noise.white;
      const hb = this._filter('bandpass', Math.min(4200, f * 3), 1.5);
      const he = this.ctx.createGain();
      he.gain.setValueAtTime(0.02 * vel, t);
      he.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      h.connect(hb); hb.connect(he); he.connect(mix);
      h.start(t, Math.random() * 6, 0.05);
      this._out(L, lp, { rev: 0.75, dly: 0.5 });
      setTimeout(() => { try { lp.disconnect(); mix.disconnect(); } catch {} }, 7000);
      this.emit('note', { midi: m, vel, pitch: (m - 50) / 40 });
    };
    this._loop(L, () => {
      const r = Math.random();
      if (r < 0.14) note(pickOne([38, 45, 43, 50]), 0.8, true); // low root
      else {
        idx = Math.max(0, Math.min(scale.length - 1, idx + pickOne([-2, -1, -1, 0, 1, 1, 2, 3, -3])));
        note(scale[idx], rnd(0.5, 0.95));
        if (Math.random() < 0.28) setTimeout(() => this.playing && note(scale[Math.min(scale.length - 1, idx + 2)], rnd(0.4, 0.7)), rnd(320, 520));
      }
    }, 1300, 3800, true);
  }

  // ── control ──
  async play(sceneId, mix, { fadeIn = 2.8 } = {}) {
    const ctx = this.init();
    if (!ctx) return false;
    try {
      if (ctx.state !== 'running') await ctx.resume();
    } catch {}
    // tear down old layers when changing scenes
    if (this.playing && this.sceneId !== sceneId) await this._teardown(0.9);
    this.sceneId = sceneId;
    this.playing = true;
    this.levels = {};
    for (const [name, lvl] of Object.entries(mix)) this.setLayer(name, lvl, 0.0);
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    // chimes / breathing may have left the bus open at 1; always fade in from silence
    this.master.gain.setValueAtTime(Math.min(this.master.gain.value, 0.0001), t);
    this.master.gain.linearRampToValueAtTime(this.volume, t + fadeIn);
    this.emit('state', this.snapshot());
    return true;
  }

  setLayer(name, level, ramp = 0.6) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.levels[name] = level;
    let L = this.layers[name];
    if (!L && level > 0.001) {
      L = this.layers[name] = this._makeLayer(name);
    }
    if (!L) return;
    L.gain.gain.cancelScheduledValues(t);
    L.gain.gain.setValueAtTime(L.gain.gain.value, t);
    L.gain.gain.linearRampToValueAtTime(level, t + ramp + 0.01);
    if (level <= 0.001) {
      setTimeout(() => {
        if ((this.levels[name] || 0) <= 0.001) this._killLayer(name);
      }, (ramp + 0.2) * 1000);
    }
    this.emit('state', this.snapshot());
  }

  _killLayer(name) {
    const L = this.layers[name];
    if (!L) return;
    L.cancel.forEach((c) => c());
    L.timers.forEach((t) => clearTimeout(t));
    L.sources.forEach((s) => { try { s.stop(); } catch {} });
    try { L.gain.disconnect(); } catch {}
    L.nodes.forEach((n) => { try { n.disconnect(); } catch {} });
    delete this.layers[name];
  }

  _teardown(sec = 1.2) {
    return new Promise((res) => {
      const ctx = this.ctx;
      if (!ctx) return res();
      const t = ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0, t + sec);
      this.playing = false;
      setTimeout(() => {
        Object.keys(this.layers).forEach((n) => this._killLayer(n));
        res();
      }, sec * 1000 + 80);
    });
  }

  async stop(sec = 1.6) {
    clearInterval(this._timerInt);
    this.endsAt = null;
    this.playing = false;
    this.emit('state', this.snapshot());
    await this._teardown(sec);
    this.sceneId = this.playing ? this.sceneId : this.sceneId;
  }

  pause() {
    if (!this.ctx || !this.playing) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.5);
    this.playing = false;
    setTimeout(() => this.ctx.suspend?.(), 600);
    this.emit('state', this.snapshot());
  }

  async resumePlayback() {
    if (!this.ctx) return;
    await this.ctx.resume();
    const t = this.ctx.currentTime;
    this.playing = true;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(this.volume, t + 1.2);
    // restart schedulers that depend on `playing`
    const mix = { ...this.levels };
    Object.keys(this.layers).forEach((n) => this._killLayer(n));
    for (const [n, l] of Object.entries(mix)) if (l > 0.001) this.setLayer(n, l, 0.2);
    this.emit('state', this.snapshot());
  }

  setVolume(v) {
    this.volume = v;
    if (this.ctx && this.playing) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(v, t + 0.2);
    }
  }

  setTimer(minutes) {
    clearInterval(this._timerInt);
    if (!minutes) {
      this.endsAt = null;
      this.emit('state', this.snapshot());
      return;
    }
    this.endsAt = Date.now() + minutes * 60000;
    this._timerInt = setInterval(async () => {
      const left = this.endsAt - Date.now();
      if (left <= 0) {
        clearInterval(this._timerInt);
        const id = this.sceneId;
        await this.stop(7);
        this.emit('ended', { sceneId: id });
      }
    }, 1000);
    this.emit('state', this.snapshot());
  }

  spectrum(arr) {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(arr);
    return true;
  }
  get binCount() {
    return this.analyser ? this.analyser.frequencyBinCount : 128;
  }

  // ── breathing cues ──
  async breathStart() {
    const ctx = this.init();
    if (!ctx) return;
    try { if (ctx.state !== 'running') await ctx.resume(); } catch {}
    if (this._breath) return;
    const g = ctx.createGain();
    g.gain.value = 0;
    const lp = this._filter('lowpass', 500, 0.5);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sine';
    o2.type = 'triangle';
    o1.frequency.value = 196;
    o2.frequency.value = 294;
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    o1.connect(lp); o2.connect(g2); g2.connect(lp);
    lp.connect(g);
    g.connect(this.comp);
    const rs = ctx.createGain();
    rs.gain.value = 0.35;
    g.connect(rs);
    rs.connect(this.revSend);
    o1.start(); o2.start();
    this._breath = { g, lp, o1, o2, g2, rs };
    // route reverb return to destination even if no scene playing
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    if (!this.playing) this.master.gain.setValueAtTime(1, ctx.currentTime);
  }
  breathPhase(kind, secs) {
    const b = this._breath;
    if (!b) return;
    const t = this.ctx.currentTime;
    const ramp = (param, v, d) => {
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(v, t + d);
    };
    if (kind === 'in') {
      ramp(b.g.gain, 0.085, secs);
      ramp(b.lp.frequency, 1500, secs);
      ramp(b.o1.frequency, 233, secs);
      ramp(b.o2.frequency, 349, secs);
    } else if (kind === 'out') {
      ramp(b.g.gain, 0.012, secs);
      ramp(b.lp.frequency, 420, secs);
      ramp(b.o1.frequency, 196, secs);
      ramp(b.o2.frequency, 294, secs);
    } else if (kind === 'hold') {
      ramp(b.g.gain, 0.07, 0.6);
    } else {
      ramp(b.g.gain, 0.006, 0.8);
    }
  }
  breathStop() {
    const b = this._breath;
    if (!b) return;
    const t = this.ctx.currentTime;
    b.g.gain.cancelScheduledValues(t);
    b.g.gain.setValueAtTime(b.g.gain.value, t);
    b.g.gain.linearRampToValueAtTime(0, t + 1.2);
    setTimeout(() => {
      try { b.o1.stop(); b.o2.stop(); b.g.disconnect(); b.rs.disconnect(); } catch {}
    }, 1400);
    this._breath = null;
  }

  // ── small UI chimes ──
  async chime(note = 76, vol = 0.07) {
    if (typeof window !== 'undefined' && window.__kzSound === false) return;
    const ctx = this.init();
    if (!ctx) return;
    try { if (ctx.state !== 'running') await ctx.resume(); } catch {}
    const t = ctx.currentTime + 0.01;
    const f = mtof(note);
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.comp);
    const r = ctx.createGain();
    r.gain.value = 0.5;
    out.connect(r); r.connect(this.revSend);
    if (!this.playing) this.master.gain.setValueAtTime(1, t);
    for (const [ratio, a, d] of [[1, 1, 2.2], [2.76, 0.3, 1.2], [5.4, 0.1, 0.6]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * ratio;
      const e = ctx.createGain();
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(vol * a, t + 0.01);
      e.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(e); e.connect(out);
      o.start(t); o.stop(t + d + 0.05);
    }
    setTimeout(() => { try { out.disconnect(); r.disconnect(); } catch {} }, 3000);
  }
}

export const engine = new SoundEngine();
if (typeof window !== 'undefined') window.__kokoAudio = engine;
