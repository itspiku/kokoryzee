// Personal digital twin (experimental decision-support) ───────
// The twin turns a person's own signals into *relative, proxy* region-level estimates:
//   0 = bottom of this person's own range, 1 = top of this person's own range.
// These are NOT measurements of brain activity. They are modelled proxies built from
// wearable / phone / cognitive signals (and, when connected, clinic EEG / MRI).

import { median, mean, clamp, sum } from '../lib/util.js';
import { BRAIN_REGIONS } from '../data/content.js';
import { isNum } from './baseline.js';
import { SIGNAL_META } from '../data/signals.js';

const KEYS = ['sleepDur', 'sleepEff', 'sleepMid', 'restHR', 'hrv', 'steps', 'activeMin', 'nightPhone', 'social', 'reaction', 'mood'];

function rankFn(series, key) {
  const v = series.map((r) => r[key]).filter(isNum).sort((a, b) => a - b);
  return (x) => {
    if (!isNum(x) || v.length < 4) return 0.5;
    let lo = 0, hi = v.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (v[m] < x) lo = m + 1;
      else hi = m;
    }
    return lo / v.length;
  };
}

/** goodness 0..1 for a signal (1 = favourable end of own range) */
function makeGoodness(series) {
  const ranks = Object.fromEntries(KEYS.map((k) => [k, rankFn(series, k)]));
  return (key, x) => {
    const r = ranks[key](x);
    const bad = SIGNAL_META[key].badDir;
    return bad === 0 ? 0.5 : bad > 0 ? 1 - r : r;
  };
}

function smoothAt(series, key, i, w = 3) {
  const vals = [];
  for (let k = Math.max(0, i - w + 1); k <= i; k++) if (isNum(series[k][key])) vals.push(series[k][key]);
  return vals.length ? mean(vals) : NaN;
}

export function makeTwin(series) {
  const good = makeGoodness(series);
  const g = (key, i) => {
    // fall back to a wider window for sparse signals
    let v = smoothAt(series, key, i, key === 'mood' || key === 'reaction' ? 7 : 3);
    return isNum(v) ? good(key, v) : 0.5;
  };
  const regionAt = (i) => {
    const sleepDur = g('sleepDur', i), sleepEff = g('sleepEff', i), mood = g('mood', i), cog = g('reaction', i);
    const act = g('activeMin', i), steps = g('steps', i), social = g('social', i), hrv = g('hrv', i), hr = g('restHR', i);
    const night = g('nightPhone', i), mid = g('sleepMid', i);
    return {
      dlpfc: clamp(0.4 * sleepDur + 0.3 * act + 0.15 * mood + 0.15 * cog),
      acc: clamp(0.45 * mood + 0.3 * social + 0.25 * sleepDur),
      amyg: clamp(0.5 * (1 - hrv) + 0.3 * (1 - sleepEff) + 0.2 * (1 - hr)),
      hipp: clamp(0.5 * sleepEff + 0.3 * sleepDur + 0.2 * cog),
      dmn: clamp(0.5 * (1 - night) + 0.3 * (1 - steps) + 0.2 * (1 - mid)),
      str: clamp(0.5 * steps + 0.3 * social + 0.2 * act),
    };
  };
  // functional-connectivity proxy between region pairs (co-movement over trailing 14 days)
  const pairs = [['dlpfc', 'acc'], ['dlpfc', 'str'], ['acc', 'amyg'], ['acc', 'hipp'], ['amyg', 'hipp'], ['dmn', 'acc'], ['str', 'acc'], ['dmn', 'hipp']];
  const links = (i) => {
    const a = regionAt(i);
    const b = regionAt(Math.max(0, i - 7));
    return pairs.map(([p, q]) => {
      const base = 1 - Math.abs(a[p] - a[q]);
      const trend = 1 - Math.abs(b[p] - b[q]);
      return { a: p, b: q, w: clamp(0.25 + 0.6 * base), delta: base - trend };
    });
  };
  const all = series.map((_, i) => regionAt(i));
  return { regionAt, links, all };
}

/** Pearson r between two arrays with nulls */
function pearson(a, b) {
  const xs = [], ys = [];
  for (let i = 0; i < a.length; i++) if (isNum(a[i]) && isNum(b[i])) { xs.push(a[i]); ys.push(b[i]); }
  if (xs.length < 8) return NaN;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); dx += (x - mx) ** 2; dy += (ys[i] - my) ** 2; });
  return num / Math.sqrt(dx * dy || 1);
}

/** Which signals moved with self-reported mood (association — never causation). */
export function associations(series) {
  const mood = series.map((r) => (isNum(r.mood) ? r.mood : null));
  const out = [];
  for (const k of ['sleepDur', 'sleepEff', 'hrv', 'restHR', 'steps', 'activeMin', 'nightPhone', 'social', 'sleepMid', 'reaction']) {
    const sm = series.map((_, i) => smoothAt(series, k, i, 3));
    const r = pearson(sm, mood);
    if (isNum(r)) out.push({ key: k, label: SIGNAL_META[k].label, r });
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 4);
}
