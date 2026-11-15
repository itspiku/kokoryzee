// Small shared helpers ───────────────────────────────────────

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const sum = (a) => a.reduce((x, y) => x + y, 0);
export const mean = (a) => (a.length ? sum(a) / a.length : NaN);
export const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(rng) {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
export const rand = (a, b) => a + Math.random() * (b - a);

// ── time ──
const DAY = 86400000;
export const MIN = 60000;
export const HOUR = 3600000;
export { DAY };
export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const fmtTime = (t) =>
  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const fmtDay = (t, opts = { weekday: 'short', month: 'short', day: 'numeric' }) =>
  new Date(t).toLocaleDateString([], opts);
export const fmtShortDay = (t) => new Date(t).toLocaleDateString([], { weekday: 'short' });
export const fmtDateTime = (t) => `${fmtDay(t)} · ${fmtTime(t)}`;
export function timeAgo(t, now = Date.now()) {
  const s = Math.max(0, (now - t) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 2) return 'yesterday';
  return `${Math.round(s / 86400)} days ago`;
}
export const hhmm = (hFloat) => {
  // hours (can exceed 24 or be negative) → "h:mm AM"
  let h = ((hFloat % 24) + 24) % 24;
  let H = Math.floor(h);
  let M = Math.round((h - H) * 60);
  if (M === 60) {
    H = (H + 1) % 24;
    M = 0;
  }
  const ap = H >= 12 ? 'PM' : 'AM';
  const h12 = H % 12 === 0 ? 12 : H % 12;
  return `${h12}:${String(M).padStart(2, '0')} ${ap}`;
};
export const fmtDur = (hFloat) => {
  const h = Math.floor(hFloat);
  const m = Math.round((hFloat - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};
export const fmtClock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function partOfDay(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 5) return 'night';
  if (h < 11.5) return 'morning';
  if (h < 17.5) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}
export function greeting(d = new Date(), name = '') {
  const p = partOfDay(d);
  const g = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Hello' }[p];
  return name ? `${g}, ${name}` : g;
}

// ── device ──
export const haptic = (ms = 10) => {
  try {
    if (navigator.vibrate && getHapticsEnabled()) navigator.vibrate(ms);
  } catch {}
};
let _haptics = true;
export const setHapticsEnabled = (v) => (_haptics = v);
