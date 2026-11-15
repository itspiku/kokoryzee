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

export function analysePatient(series, end = series.length - 1, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const signals = {};
  for (const k of Object.keys(SIGNAL_META)) {
    const a = analyseSignal(series, k, end, o);
    if (a) signals[k] = a;
  }
  const core = CORE_KEYS.map((k) => signals[k]).filter(Boolean);
  const composite = core.length ? mean(core.map((s) => clamp(s.badness, -3, 3))) : 0;
  const shifted = core.filter((s) => s.badness >= 0.9);
  const improved = core.filter((s) => s.badness <= -0.9);
  const recentWindow = series.slice(Math.max(0, end - o.recent + 1), end + 1);
  const wearDays = recentWindow.filter((r) => r.wear).length;
  const coverage = recentWindow.length ? wearDays / recentWindow.length : 0;
  const baseCoverage = clamp(core.length ? mean(core.map((s) => s.nBase / o.baseWin)) : 0, 0, 1);
  const agreement = core.length ? Math.max(shifted.length, improved.length) / core.length : 0;
  const confidence = clamp(0.2 + 0.35 * coverage + 0.2 * baseCoverage + 0.25 * agreement, 0, 0.93);

  // trailing missing days (device not synced)
  let trailingGap = 0;
  for (let i = end; i >= 0 && !series[i].wear; i--) trailingGap++;

  let status = 'steady';
  if (series.length < 14 || baseCoverage < 0.55) status = 'forming';
  else if (trailingGap >= 3) status = 'gap';
  else if (shifted.length >= 3 && composite >= 0.85 && confidence >= 0.55) status = 'review';
  else if (shifted.length >= 2 && composite >= 0.55) status = 'shift';
  else if (improved.length >= 3 && composite <= -0.6) status = 'better';

  return {
    end,
    signals,
    composite,
    shifted: shifted.sort((a, b) => b.badness - a.badness),
    improved: improved.sort((a, b) => a.badness - b.badness),
    coverage,
    wearDays,
    recentDays: recentWindow.length,
    baseCoverage,
    confidence,
    status,
    trailingGap,
    model: MODEL_VERSION,
  };
}

export function confidenceLabel(c) {
  if (c >= 0.8) return 'High';
  if (c >= 0.6) return 'Moderate';
  return 'Low';
}

/** Rolling composite "change from personal baseline" per day (positive = better than baseline). */
export function driftSeries(series, opts = {}) {
  const o = { recent: 3, baseWin: 14, ...opts };
  const out = [];
  for (let i = 0; i < series.length; i++) {
    if (i < o.recent + 8) {
      out.push(NaN);
      continue;
    }
    const vals = [];
    for (const k of CORE_KEYS) {
      const a = analyseSignal(series, k, i, o);
      if (a) vals.push(clamp(a.badness, -3, 3));
    }
    out.push(vals.length >= 4 ? -mean(vals) : NaN);
  }
  return out;
}

/** Simple damped-trend projection with widening uncertainty. */
export function project(values, horizon = 14) {
  const v = values.filter(isNum);
  const last = v.slice(-8);
  if (last.length < 4) return { mid: [], lo: [], hi: [] };
  const n = last.length;
  const xm = (n - 1) / 2;
  const ym = mean(last);
  let num = 0,
    den = 0;
  last.forEach((y, i) => {
    num += (i - xm) * (y - ym);
    den += (i - xm) ** 2;
  });
  const slope = den ? num / den : 0;
  const resid = Math.sqrt(mean(last.map((y, i) => (y - (ym + slope * (i - xm))) ** 2))) || 0.3;
  const start = last[n - 1];
  const mid = [],
    lo = [],
    hi = [];
  let level = start;
  let s = slope;
  for (let h = 1; h <= horizon; h++) {
    s *= 0.86; // damp
    level += s;
    const sd = resid * (1 + 0.38 * h) + 0.05 * h;
    mid.push(level);
    lo.push(level - sd * 1.3);
    hi.push(level + sd * 1.3);
  }
  return { mid, lo, hi, slope, resid };
}

export function totalDays(series) {
  return sum(series.map((r) => (r.wear ? 1 : 0)));
}
