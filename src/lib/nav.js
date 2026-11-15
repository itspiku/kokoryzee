// Minimal hash router with direction-aware transitions ────────
// Routes are strings like "/p/home" or "/c/patient/alex". Each route has a "level":
//   0 = tab root · 1 = pushed screen · 2 = immersive/overlay screen
// Direction is derived from level change so transitions feel native.

import { useSyncExternalStore } from 'react';

let current = parse(typeof location !== 'undefined' ? location.hash : '');
let direction = 'swap';
let presetDir = null;
let depth = 0;
const subs = new Set();

function parse(hash) {
  const raw = (hash || '').replace(/^#/, '') || '';
  const [path, qs] = raw.split('?');
  const params = {};
  if (qs) for (const [k, v] of new URLSearchParams(qs)) params[k] = v;
  return { path: path || '', params, raw };
}

export function levelOf(path) {
  if (!path) return 0;
  const seg = path.split('/').filter(Boolean); // [role, name, ...]
  const name = seg[1];
  const TABS = ['home', 'sounds', 'support', 'journal', 'circle', 'overview', 'alerts', 'twin', 'messages', 'trust'];
  if (seg.length <= 2 && TABS.includes(name)) return 0;
  const IMMERSIVE = ['breathe', 'ground', 'player', 'video', 'game', 'welcome', 'record', 'letter-play'];
  if (IMMERSIVE.includes(name)) return 2;
  return 1;
}

function emit() {
  subs.forEach((f) => f());
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const next = parse(location.hash);
    if (next.path === current.path && next.raw === current.raw) return;
    const a = levelOf(current.path);
    const b = levelOf(next.path);
    direction = presetDir || (b > a ? 'forward' : b < a ? 'back' : 'swap');
    depth = direction === 'back' ? Math.max(0, depth - 1) : depth + 1;
    presetDir = null;
    current = next;
    emit();
  });
}

export function go(path, opts = {}) {
  const next = path.split('?')[0];
  const a = levelOf(current.path);
  const b = levelOf(next);
  if ('#' + path === location.hash) return;
  presetDir = opts.dir || (b > a ? 'forward' : b < a ? 'back' : 'swap');
  if (opts.replace) location.replace('#' + path);
  else location.hash = path;
}
export function back(fallback) {
  if (depth > 0) {
    presetDir = 'back';
    history.back();
  } else if (fallback) go(fallback, { dir: 'back', replace: true });
}
export const getRoute = () => current;
export const getDirection = () => direction;

function subscribe(f) {
  subs.add(f);
  return () => subs.delete(f);
}
export function useRoute() {
  return useSyncExternalStore(subscribe, () => current);
}
