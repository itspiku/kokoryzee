// Personal-baseline engine ───────────────────────────────────
// Every person is compared with *themselves*: a robust personal baseline (median)
// and personal day-to-day variability (noise from successive differences), then
// recent days are expressed as "effect sizes" in units of that person's own noise.
// No population thresholds. Outputs are decision support, never diagnoses.

import { median, mean, clamp, sum } from '../lib/util.js';
import { SIGNAL_META, CORE_KEYS } from '../data/signals.js';

export const MODEL_VERSION = 'kz-baseline 0.3.1';
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

const mad = (arr) => {
  const m = median(arr);
  return median(arr.map((v) => Math.abs(v - m)));
};

/** Personal day-to-day noise, independent of slow trends. */
export function noiseSd(values) {
  const v = values.filter(isNum);
  const d = [];
  for (let i = 1; i < v.length; i++) d.push(v[i] - v[i - 1]);
  let s = d.length >= 4 ? (1.4826 * mad(d)) / Math.SQRT2 : NaN;
  if (!isNum(s) || s <= 0) {
    const m = mean(v);
    s = Math.sqrt(mean(v.map((x) => (x - m) ** 2))) || 1;
  }
  return Math.max(s, 1e-6);
}

export const DEFAULTS = { recent: 5, baseWin: 14, gap: 0 };

/** Analyse one signal at index `end` (inclusive). Returns null if too little data. */
export function analyseSignal(series, key, end = series.length - 1, opts = {}) {
  const { recent, baseWin } = { ...DEFAULTS, ...opts };
  const recentSlice = series.slice(Math.max(0, end - recent + 1), end + 1).map((r) => r[key]).filter(isNum);
  const baseStart = Math.max(0, end - recent - baseWin + 1);
  const baseAll = series.slice(baseStart, end - recent + 1).map((r) => r[key]);
  const baseSlice = baseAll.filter(isNum);
  if (recentSlice.length < 2 || baseSlice.length < 6) return null;
  const baseMed = median(baseSlice);
  const noise = noiseSd(baseAll.length > 8 ? baseAll : series.slice(Math.max(0, end - 40), end + 1).map((r) => r[key]));
  const recentMean = mean(recentSlice);
  const delta = recentMean - baseMed;
  const es = delta / noise; // effect size in personal-noise units
  const meta = SIGNAL_META[key];
  const badness = meta.badDir * es;
  return {
    key,
    meta,
    baseMed,
    noise,
    recentMean,
    delta,
    es,
    z: es * Math.sqrt(recentSlice.length),
    badness,
    nRecent: recentSlice.length,
    nBase: baseSlice.length,
    band: [baseMed - noise * 1.1, baseMed + noise * 1.1],
  };
}

