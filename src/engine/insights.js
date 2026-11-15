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

// ── clinician alert from an analysis ──
export function alertFromAnalysis(patient, a, now, { ageH = 2 } = {}) {
  const first = patient.name.split(' ')[0];
  const createdAt = now - ageH * HOUR;
  const base = { id: uid('al'), patientId: patient.id, createdAt, owner: DOCTOR.name, model: MODEL_VERSION, status: 'new' };
  const top = a.shifted.slice(0, 5).map((s) => ({ key: s.key, label: s.meta.label, delta: deltaText(s), badness: s.badness, z: s.z }));
  const mkAudit = (extra = []) => [
    { t: createdAt, actor: MODEL_VERSION, action: 'Created', note: 'Rule matched on personal baseline' },
    { t: createdAt + 4000, actor: 'System', action: 'Routed to Dr. Elena Marsh', note: 'Responsible clinician' },
    ...extra,
  ];

  if (a.status === 'review') {
    return {
      ...base,
      level: 'review',
      title: `Review suggested · ${patient.name}`,
      reason: `Over the last ${a.recentDays} days, ${a.shifted.length} of 8 core signals moved away from ${first}’s own 14-day baseline in the same direction — ${a.shifted
        .slice(0, 3)
        .map((s) => s.meta.short.toLowerCase())
        .join(', ')}. Agreement across independent sensors makes a single-sensor artefact less likely. This is a prompt to look, not a diagnosis.`,
      signals: top,
      confidence: a.confidence,
      window: `Last ${a.recentDays} days vs. personal 14-day baseline`,
      rule: '≥ 3 core signals shifted > 0.9 σ (personal) · composite ≥ 0.85 · confidence ≥ 0.55',
      audit: mkAudit(),
    };
  }
  if (a.status === 'shift') {
    return {
      ...base,
      level: 'watch',
      title: `Gentle shift · ${patient.name}`,
      reason: `${a.shifted.length} signals have moved slightly from ${first}’s baseline. Below the review threshold; shown for awareness.`,
      signals: top,
      confidence: a.confidence,
      window: `Last ${a.recentDays} days vs. personal 14-day baseline`,
      rule: '≥ 2 core signals shifted > 0.9 σ (personal) · composite ≥ 0.55',
      audit: mkAudit(),
    };
  }
  if (a.status === 'gap') {
    return {
      ...base,
      level: 'data',
      title: `Wearable not synced · ${patient.name}`,
      reason: `No wearable data for ${a.trailingGap} days. This is usually a charging or connection issue, not a health signal. Consider a friendly nudge — no change to the care plan is needed.`,
      signals: [],
      confidence: 0.9,
      window: `${a.trailingGap} days without sync`,
      rule: 'No wearable data ≥ 3 consecutive days',
      audit: mkAudit(),
    };
  }
  if (a.status === 'forming') {
    return {
      ...base,
      level: 'data',
      title: `Baseline still forming · ${patient.name}`,
      reason: `Only ${a.wearDays} of the last ${a.recentDays} days have wearable data and the personal baseline needs about two weeks. Alerts stay quiet until then so no one is compared with a population average.`,
      signals: [],
      confidence: a.confidence,
      window: 'Baseline window not yet complete',
      rule: 'Insufficient baseline data (< 14 days)',
      audit: mkAudit(),
    };
  }
  return null;
}

