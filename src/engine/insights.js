// Turning numbers into understandable, honest sentences ───────
// Patient-facing text is gentle (no scores, no red, no streaks, no comparisons).
// Clinician-facing text is precise, shows the contributing signals & confidence.

import { uid, HOUR, fmtDur, hhmm, mean, median, clamp, partOfDay } from '../lib/util.js';
import { isNum, MODEL_VERSION, confidenceLabel } from './baseline.js';
import { SIGNAL_META } from '../data/signals.js';
import { DOCTOR, sceneById } from '../data/content.js';

// ── formatting helpers ──
const round = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d);
const signed = (v, d = 0) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(round(v, d)).toLocaleString()}`;
export function deltaText(a) {
  const d = a.delta;
  switch (a.key) {
    case 'sleepDur':
      return `${signed(d, 1)} h / night`;
    case 'sleepEff':
      return `${signed(d, 0)} % efficiency`;
    case 'sleepMid':
      return `${Math.abs(Math.round(d * 60))} min ${d >= 0 ? 'later' : 'earlier'}`;
    case 'restHR':
      return `${signed(d, 0)} bpm`;
    case 'hrv':
      return `${signed(d, 0)} ms`;
    case 'steps':
      return `${signed(Math.round(d / 100) / 10, 1)}k steps (${signed((d / a.baseMed) * 100, 0)}%)`;
    case 'activeMin':
      return `${signed(d, 0)} min active`;
    case 'nightPhone':
      return `${signed(d, 0)} min after midnight`;
    case 'social':
      return `${signed(d, 1)} contacts / day`;
    case 'reaction':
      return `${signed(d, 0)} ms`;
    case 'mood':
      return `${signed(d, 1)} / 5`;
    default:
      return `${signed(d, 1)} ${a.meta.unit}`;
  }
}
export function valueText(key, v) {
  if (!isNum(v)) return '—';
  switch (key) {
    case 'sleepDur':
      return fmtDur(v);
    case 'sleepMid':
      return hhmm(v);
    case 'steps':
      return Math.round(v).toLocaleString();
    case 'restHR':
      return `${Math.round(v)} bpm`;
    case 'hrv':
      return `${Math.round(v)} ms`;
    case 'activeMin':
      return `${Math.round(v)} min`;
    case 'nightPhone':
      return `${Math.round(v)} min`;
    case 'social':
      return `${Math.round(v)}`;
    case 'reaction':
      return `${Math.round(v)} ms`;
    case 'sleepEff':
      return `${Math.round(v)}%`;
    case 'skinTemp':
      return `${v >= 0 ? '+' : ''}${v.toFixed(2)} °C`;
    default:
      return String(round(v, 1));
  }
}

