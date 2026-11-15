import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine.js';

const R = Math.random;
const TAU = Math.PI * 2;

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ── per-scene renderers: (ctx, w, h, t, dt, e, S, scene) ──
const draw = {
  rain(c, w, h, t, dt, e, S, sc) {
    // moon-glow
    const g = c.createRadialGradient(w / 2, h * 0.28, 0, w / 2, h * 0.28, 150 + e * 40);
    g.addColorStop(0, 'rgba(210,240,200,.22)');
    g.addColorStop(1, 'rgba(210,240,200,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const rate = 70 + e * 120;
    S.acc = (S.acc || 0) + dt * rate;
    while (S.acc > 1) {
      S.acc--;
      S.drops.push({ x: R() * w, y: -20, l: 10 + R() * 22, v: 520 + R() * 380, a: 0.15 + R() * 0.28, z: R() });
    }
    c.lineCap = 'round';
    for (let i = S.drops.length - 1; i >= 0; i--) {
      const d = S.drops[i];
      d.y += d.v * dt;
      d.x -= d.v * dt * 0.08;
      c.strokeStyle = rgba('#cfeccc', d.a * (0.5 + d.z));
      c.lineWidth = 0.8 + d.z * 1.2;
      c.beginPath();
      c.moveTo(d.x, d.y);
      c.lineTo(d.x + d.l * 0.08, d.y + d.l);
      c.stroke();
      const floor = h * (0.78 + d.z * 0.14);
      if (d.y > floor) {
        S.rings.push({ x: d.x, y: floor, r: 2, a: 0.5, rate: 24 + R() * 30 });
        S.drops.splice(i, 1);
      }
    }
    for (let i = S.rings.length - 1; i >= 0; i--) {
      const r = S.rings[i];
      r.r += r.rate * dt;
      r.a -= dt * 0.7;
      if (r.a <= 0) { S.rings.splice(i, 1); continue; }
      c.strokeStyle = rgba('#d8f3d4', r.a);
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(r.x, r.y, r.r, r.r * 0.28, 0, 0, TAU);
      c.stroke();
    }
    // pines
    c.fillStyle = 'rgba(8,24,18,.8)';
    for (const [x, s] of [[0.04, 1.2], [0.14, 0.9], [0.92, 1.3], [0.82, 0.8], [0.99, 1]]) {
      const bx = w * x, by = h * 0.9, hh = 150 * s;
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.moveTo(bx, by - hh + k * hh * 0.25);
        c.lineTo(bx + 34 * s + k * 14 * s, by - hh * 0.35 + k * hh * 0.25);
        c.lineTo(bx - 34 * s - k * 14 * s, by - hh * 0.35 + k * hh * 0.25);
        c.fill();
      }
      c.fillRect(bx - 3, by - 20, 6, 40);
    }
  },

  bowl(c, w, h, t, dt, e, S, sc) {
    const cx = w / 2, cy = h * 0.37;
    const breathe = 1 + Math.sin(t * 0.6) * 0.03;
    // halo
    const g = c.createRadialGradient(cx, cy, 10, cx, cy, 220 * breathe);
    g.addColorStop(0, 'rgba(255,200,150,.35)');
    g.addColorStop(0.5, 'rgba(255,160,130,.1)');
    g.addColorStop(1, 'rgba(255,160,130,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    if (S.next === undefined) S.next = 0;
    S.next -= dt;
    if (S.next < 0) { S.rings.push({ r: 40, a: 0.5, v: 36 }); S.next = 6 + R() * 3; }
    for (let i = S.rings.length - 1; i >= 0; i--) {
      const r = S.rings[i];
      r.r += r.v * dt;
      r.a -= dt * 0.12;
      if (r.a <= 0) { S.rings.splice(i, 1); continue; }
      c.strokeStyle = rgba('#ffd9b5', r.a);
      c.lineWidth = 1.6 + r.a * 3;
      c.beginPath();
      c.arc(cx, cy - 6, r.r, 0, TAU);
      c.stroke();
    }
    // bowl
    const bw = 92;
    const bg = c.createLinearGradient(cx - bw, cy, cx + bw, cy + 70);
    bg.addColorStop(0, '#f6d7a2');
    bg.addColorStop(0.5, '#d49a62');
    bg.addColorStop(1, '#8a5232');
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(cx - bw, cy);
    c.bezierCurveTo(cx - bw, cy + 70, cx - 46, cy + 78, cx, cy + 78);
    c.bezierCurveTo(cx + 46, cy + 78, cx + bw, cy + 70, cx + bw, cy);
    c.ellipse(cx, cy, bw, 17, 0, 0, Math.PI, true);
    c.fill();
    c.fillStyle = '#5a3320';
    c.beginPath();
    c.ellipse(cx, cy, bw - 4, 14, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,220,170,.25)';
    c.beginPath();
    c.ellipse(cx, cy + 2, bw - 12, 9, 0, 0, TAU);
    c.fill();
    // cushion
    c.fillStyle = 'rgba(120,60,70,.65)';
    c.beginPath();
    c.ellipse(cx, cy + 82, 112, 20, 0, 0, TAU);
    c.fill();
    // motes
    if (S.motes.length < 26) S.motes.push({ x: R() * w, y: h + 10, v: 8 + R() * 16, s: 1 + R() * 2.2, ph: R() * 6 });
    for (let i = S.motes.length - 1; i >= 0; i--) {
      const m = S.motes[i];
      m.y -= m.v * dt;
      m.x += Math.sin(t + m.ph) * 8 * dt;
      if (m.y < -10) { S.motes.splice(i, 1); continue; }
      c.fillStyle = `rgba(255,225,190,${0.15 + 0.35 * Math.sin(t * 1.3 + m.ph) ** 2})`;
      c.beginPath();
      c.arc(m.x, m.y, m.s, 0, TAU);
      c.fill();
    }
  },

  birds(c, w, h, t, dt, e, S, sc) {
    const sx = w * 0.5, sy = h * 0.3;
    // rays
    c.save();
    c.translate(sx, sy);
    c.rotate(t * 0.03);
    for (let i = 0; i < 14; i++) {
      c.rotate(TAU / 14);
      const g = c.createLinearGradient(0, 0, 0, -h);
      g.addColorStop(0, 'rgba(255,248,210,.28)');
      g.addColorStop(1, 'rgba(255,248,210,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-16, 0);
      c.lineTo(16, 0);
      c.lineTo(46 + (i % 3) * 14, -h);
      c.lineTo(-46 - (i % 3) * 14, -h);
      c.fill();
    }
    c.restore();
    const g = c.createRadialGradient(sx, sy, 0, sx, sy, 90 + Math.sin(t * 0.8) * 6);
    g.addColorStop(0, 'rgba(255,252,225,1)');
    g.addColorStop(0.35, 'rgba(255,236,180,.8)');
    g.addColorStop(1, 'rgba(255,236,180,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(sx, sy, 100, 0, TAU);
    c.fill();
    // hills
    for (const [off, col, amp] of [[0.78, 'rgba(120,160,110,.55)', 24], [0.86, 'rgba(78,124,84,.8)', 30]]) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) c.lineTo(x, h * off + Math.sin(x * 0.012 + off * 9) * amp);
      c.lineTo(w, h);
      c.fill();
    }
    // birds
    if (S.next === undefined) S.next = 1;
    S.next -= dt;
    if (S.next < 0 || S.event) {
      S.event = false;
      S.birds.push({ x: R() > 0.5 ? -30 : w + 30, y: h * (0.18 + R() * 0.3), v: 0, ph: R() * 6, s: 0.8 + R() * 0.7 });
      const b = S.birds[S.birds.length - 1];
      b.v = (b.x < 0 ? 1 : -1) * (46 + R() * 40);
      S.next = 3 + R() * 4;
    }
    c.strokeStyle = 'rgba(70,60,50,.7)';
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    for (let i = S.birds.length - 1; i >= 0; i--) {
      const b = S.birds[i];
      b.x += b.v * dt;
      b.y += Math.sin(t * 1.4 + b.ph) * 12 * dt;
      if (b.x < -60 || b.x > w + 60) { S.birds.splice(i, 1); continue; }
      const f = Math.sin(t * 9 + b.ph) * 8 * b.s;
      c.beginPath();
      c.moveTo(b.x - 14 * b.s, b.y + f * 0.3);
      c.quadraticCurveTo(b.x - 7 * b.s, b.y - 6 * b.s - f, b.x, b.y);
      c.quadraticCurveTo(b.x + 7 * b.s, b.y - 6 * b.s - f, b.x + 14 * b.s, b.y + f * 0.3);
      c.stroke();
    }
    // pollen
    if (S.motes.length < 30) S.motes.push({ x: R() * w, y: h * (0.5 + R() * 0.5), v: 4 + R() * 10, s: 1 + R() * 1.6, ph: R() * 6 });
    for (let i = S.motes.length - 1; i >= 0; i--) {
      const m = S.motes[i];
      m.y -= m.v * dt;
      m.x += Math.sin(t * 0.8 + m.ph) * 10 * dt;
      if (m.y < 0) { S.motes.splice(i, 1); continue; }
      c.fillStyle = `rgba(255,252,220,${0.3 + 0.4 * Math.sin(t + m.ph) ** 2})`;
      c.beginPath();
      c.arc(m.x, m.y, m.s, 0, TAU);
      c.fill();
    }
  },

  ocean(c, w, h, t, dt, e, S, sc) {
    const swell = 0.62 + 0.38 * Math.sin(t * TAU * 0.105);
    // moon
    const mx = w * 0.5, my = h * 0.24;
    const g = c.createRadialGradient(mx, my, 0, mx, my, 160);
    g.addColorStop(0, 'rgba(230,250,250,.5)');
    g.addColorStop(1, 'rgba(230,250,250,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(244,252,250,.95)';
    c.beginPath();
    c.arc(mx, my, 24, 0, TAU);
    c.fill();
    // reflection
    for (let i = 0; i < 18; i++) {
      const y = h * 0.5 + i * 14;
      const ww = (40 - i * 1.6) * (0.6 + 0.4 * Math.sin(t * 2 + i));
      c.fillStyle = `rgba(230,250,250,${0.22 - i * 0.01})`;
      c.fillRect(mx - ww / 2 + Math.sin(t * 0.9 + i) * 6, y, ww, 3);
    }
    const layers = [
      { y: 0.5, a: 14, k: 0.011, sp: 0.5, col: 'rgba(70,150,165,.45)' },
      { y: 0.6, a: 20, k: 0.009, sp: 0.38, col: 'rgba(40,110,130,.6)' },
      { y: 0.72, a: 26, k: 0.007, sp: 0.3, col: 'rgba(22,76,98,.78)' },
      { y: 0.85, a: 30, k: 0.006, sp: 0.22, col: 'rgba(12,48,66,.92)' },
    ];
    layers.forEach((L, li) => {
      c.fillStyle = L.col;
      c.beginPath();
      c.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 8) {
        const y = h * L.y + Math.sin(x * L.k + t * L.sp * (li % 2 ? -1 : 1) + li) * L.a * swell + Math.sin(x * L.k * 2.3 + t * L.sp * 1.7) * L.a * 0.3;
        c.lineTo(x, y);
      }
      c.lineTo(w, h);
      c.fill();
    });
  },

  piano(c, w, h, t, dt, e, S, sc) {
    // stars
    if (!S.stars) S.stars = Array.from({ length: 70 }, () => ({ x: R(), y: R() * 0.7, r: 0.5 + R() * 1.3, p: R() * 6 }));
    for (const s of S.stars) {
      c.fillStyle = `rgba(230,236,255,${0.2 + 0.6 * Math.sin(t * 0.8 + s.p) ** 2})`;
      c.beginPath();
      c.arc(s.x * w, s.y * h, s.r, 0, TAU);
      c.fill();
    }
    // aurora ribbons
    for (let k = 0; k < 3; k++) {
      const g = c.createLinearGradient(0, h * 0.2, 0, h * 0.62);
      g.addColorStop(0, rgba(['#7f8cff', '#69d7c2', '#b18cff'][k], 0));
      g.addColorStop(0.5, rgba(['#7f8cff', '#69d7c2', '#b18cff'][k], 0.12 + e * 0.12));
      g.addColorStop(1, rgba(['#7f8cff', '#69d7c2', '#b18cff'][k], 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, h * 0.62);
      for (let x = 0; x <= w; x += 10) c.lineTo(x, h * (0.34 + k * 0.05) + Math.sin(x * 0.008 + t * 0.2 * (k + 1) + k * 2) * 40);
      for (let x = w; x >= 0; x -= 10) c.lineTo(x, h * (0.5 + k * 0.04) + Math.sin(x * 0.01 + t * 0.15 + k) * 30);
      c.fill();
    }
    // notes
    for (let i = S.notes.length - 1; i >= 0; i--) {
      const n = S.notes[i];
      n.life += dt;
      n.y -= n.v * dt;
      n.x += Math.sin(n.life * 1.5 + n.ph) * 6 * dt;
      const a = Math.max(0, 1 - n.life / 7);
      if (a <= 0) { S.notes.splice(i, 1); continue; }
      const rg = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, 34 * n.s);
      rg.addColorStop(0, rgba('#e3e8ff', 0.9 * a));
      rg.addColorStop(0.3, rgba('#9aa7ff', 0.4 * a));
      rg.addColorStop(1, rgba('#9aa7ff', 0));
      c.fillStyle = rg;
      c.beginPath();
      c.arc(n.x, n.y, 34 * n.s, 0, TAU);
      c.fill();
    }
    // constellation lines
    c.lineWidth = 1;
    for (let i = 1; i < S.notes.length; i++) {
      const a = S.notes[i - 1], b = S.notes[i];
      const al = Math.max(0, 0.35 - (a.life + b.life) / 30);
      if (al <= 0) continue;
      c.strokeStyle = rgba('#c9d1ff', al);
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
    // moon
    const g = c.createRadialGradient(w * 0.8, h * 0.14, 0, w * 0.8, h * 0.14, 90);
    g.addColorStop(0, 'rgba(235,238,255,.5)');
    g.addColorStop(1, 'rgba(235,238,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h * 0.4);
    c.fillStyle = '#f2f4ff';
    c.beginPath();
    c.arc(w * 0.8, h * 0.14, 15, 0, TAU);
    c.fill();
  },

  fire(c, w, h, t, dt, e, S, sc) {
    const cx = w / 2, by = h * 0.56;
    const flick = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3) + e * 0.25;
    const g = c.createRadialGradient(cx, by - 60, 10, cx, by - 60, 320 * flick);
    g.addColorStop(0, 'rgba(255,170,80,.4)');
    g.addColorStop(0.5, 'rgba(255,110,50,.12)');
    g.addColorStop(1, 'rgba(255,110,50,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // logs
    c.save();
    c.fillStyle = '#2a1510';
    c.translate(cx, by + 16);
    c.rotate(-0.16);
    c.beginPath(); c.roundRect(-96, -10, 192, 24, 12); c.fill();
    c.rotate(0.32);
    c.fillStyle = '#331a12';
    c.beginPath(); c.roundRect(-96, -10, 192, 24, 12); c.fill();
    c.restore();
    // flames
    const tongues = [
      { dx: 0, hh: 230, ww: 70, col: ['#e8581f', '#f58a2c'] },
      { dx: -38, hh: 150, ww: 50, col: ['#ea6a22', '#f9a03e'] },
      { dx: 40, hh: 170, ww: 52, col: ['#ea6a22', '#f9a03e'] },
      { dx: 0, hh: 160, ww: 44, col: ['#f79a3a', '#ffd37a'] },
      { dx: -8, hh: 100, ww: 28, col: ['#ffc562', '#fff0b8'] },
    ];
    tongues.forEach((f, i) => {
      const n = Math.sin(t * (4 + i) + i * 2) * 0.5 + Math.sin(t * (7.3 + i) + i) * 0.3;
      const hh = f.hh * (0.88 + 0.16 * n + e * 0.2);
      const sway = Math.sin(t * (2 + i * 0.5) + i) * 12;
      const x0 = cx + f.dx;
      const gr = c.createLinearGradient(0, by, 0, by - hh);
      gr.addColorStop(0, f.col[0]);
      gr.addColorStop(1, rgba(f.col[1], 0.0));
      c.fillStyle = gr;
      c.globalAlpha = 0.88;
      c.beginPath();
      c.moveTo(x0 - f.ww / 2, by);
      c.bezierCurveTo(x0 - f.ww * 0.7, by - hh * 0.4, x0 - f.ww * 0.2 + sway, by - hh * 0.7, x0 + sway * 1.4, by - hh);
      c.bezierCurveTo(x0 + f.ww * 0.2 + sway, by - hh * 0.7, x0 + f.ww * 0.7, by - hh * 0.4, x0 + f.ww / 2, by);
      c.fill();
    });
    c.globalAlpha = 1;
    // embers
    S.acc = (S.acc || 0) + dt * (7 + e * 14);
    while (S.acc > 1) { S.acc--; S.embers.push({ x: cx + (R() - 0.5) * 70, y: by - 20, vx: (R() - 0.5) * 18, vy: -(40 + R() * 70), life: 0, s: 1 + R() * 2 }); }
    if (S.event) { for (let i = 0; i < 8; i++) S.embers.push({ x: cx + (R() - 0.5) * 60, y: by - 30, vx: (R() - 0.5) * 50, vy: -(80 + R() * 90), life: 0, s: 1.5 + R() * 2 }); S.event = false; }
    for (let i = S.embers.length - 1; i >= 0; i--) {
      const m = S.embers[i];
      m.life += dt;
      m.x += (m.vx + Math.sin(t * 3 + i) * 14) * dt;
      m.y += m.vy * dt;
      const a = 1 - m.life / 3.2;
      if (a <= 0) { S.embers.splice(i, 1); continue; }
      c.fillStyle = `rgba(255,${150 + 80 * a | 0},80,${a})`;
      c.beginPath();
      c.arc(m.x, m.y, m.s * a + 0.4, 0, TAU);
      c.fill();
    }
  },
};

