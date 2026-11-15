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

// ── patient-facing gentle language ──
function lastVals(series, key, n = 14) {
  return series.slice(-n).map((r) => (isNum(r[key]) ? r[key] : null));
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function patientCards(series, a) {
  const S = a.signals;
  const dayLabel = (n) => (n >= 5 ? 'most days' : `${n} of the last 5 days`);
  const conf = (key) => {
    const s = S[key];
    if (!s) return { label: 'Still learning', text: 'We need a few more days of data before saying anything.' };
    const frac = s.nRecent / 5;
    return frac >= 0.8
      ? { label: 'Fairly sure', text: `Based on ${plural(s.nRecent, 'recent day')} of watch data compared with your last ${s.nBase} days.` }
      : { label: 'Less sure', text: `Only ${plural(s.nRecent, 'recent day')} of data, so please treat this lightly.` };
  };
  const cards = [];

  // Sleep
  if (S.sleepDur) {
    const s = S.sleepDur;
    const m = Math.round(Math.abs(s.delta) * 60);
    let tone = 'steady',
      headline = 'Your sleep is close to your usual.',
      detail = 'Nothing has changed much lately.';
    if (s.badness >= 0.9) {
      tone = 'soft';
      headline = 'Sleep has been a little lighter than usual.';
      detail = `About ${m} minutes less each night over ${dayLabel(s.nRecent)}.`;
    } else if (s.badness <= -0.9) {
      tone = 'bright';
      headline = 'You’ve been getting more rest than usual.';
      detail = `About ${m} minutes more each night. That’s good for the brain.`;
    }
    cards.push({
      id: 'sleep',
      title: 'Sleep',
      icon: 'Moon',
      tone,
      headline,
      detail,
      keys: ['sleepDur'],
      unitFmt: (v) => fmtDur(v),
      series: lastVals(series, 'sleepDur'),
      band: s.band,
      contributors: [
        S.sleepMid ? `Bedtime timing (${deltaText(S.sleepMid)})` : null,
        S.nightPhone ? `Phone use late at night (${deltaText(S.nightPhone)})` : null,
        S.restHR ? `Resting heart rate (${deltaText(S.restHR)})` : null,
      ].filter(Boolean),
      confidence: conf('sleepDur'),
      why: 'Sleep is when your brain consolidates memories and resets mood circuits. Small shifts are normal, and a few lighter nights are rarely a concern on their own.',
      suggestion: { label: 'Try a wind-down sound tonight', to: '/p/sounds' },
    });
  }
  // Heart & stress
  if (S.restHR || S.hrv) {
    const hr = S.restHR;
    const hv = S.hrv;
    const worse = (hr && hr.badness >= 0.9) || (hv && hv.badness >= 0.9);
    const better = (hr && hr.badness <= -0.9) || (hv && hv.badness <= -0.9);
    cards.push({
      id: 'heart',
      title: 'Heart & calm',
      icon: 'HeartPulse',
      tone: worse ? 'soft' : better ? 'bright' : 'steady',
      headline: worse ? 'Your body has been working a touch harder.' : better ? 'Your body seems more settled than usual.' : 'Your heart rhythm looks steady.',
      detail: worse
        ? 'Your resting heart has been a little busier and your recovery signal a little quieter. Often this follows lighter sleep or a stressful stretch.'
        : better
        ? 'Resting heart is calmer and recovery is stronger than your usual.'
        : 'Resting heart and recovery are right around your normal.',
      keys: ['restHR'],
      unitFmt: (v) => `${Math.round(v)} bpm`,
      series: lastVals(series, 'restHR'),
      band: hr?.band,
      contributors: [hr ? `Resting heart rate (${deltaText(hr)})` : null, hv ? `Recovery / HRV (${deltaText(hv)})` : null].filter(Boolean),
      confidence: conf('restHR'),
      why: 'Resting heart rate and HRV reflect how rested and stressed your body is. They move with sleep, illness, caffeine and mood, so they’re hints, not answers.',
      suggestion: { label: 'Take a three-minute breather', to: '/p/breathe' },
    });
  }
  // Movement
  if (S.steps) {
    const s = S.steps;
    const k = Math.round(Math.abs(s.delta) / 100) / 10;
    cards.push({
      id: 'move',
      title: 'Movement',
      icon: 'Footprints',
      tone: s.badness >= 0.9 ? 'soft' : s.badness <= -0.9 ? 'bright' : 'steady',
      headline: s.badness >= 0.9 ? 'Gentler days lately — that’s okay.' : s.badness <= -0.9 ? 'You’ve been moving more than usual.' : 'Your movement is about your usual.',
      detail:
        s.badness >= 0.9
          ? `About ${k}k fewer steps a day than your usual. Even a short stroll can lift the mood.`
          : s.badness <= -0.9
          ? `About ${k}k more steps a day than your usual — nicely done.`
          : `Around ${Math.round(s.recentMean).toLocaleString()} steps a day.`,
      keys: ['steps'],
      unitFmt: (v) => Math.round(v).toLocaleString(),
      series: lastVals(series, 'steps'),
      band: s.band,
      contributors: [S.activeMin ? `Active minutes (${deltaText(S.activeMin)})` : null].filter(Boolean),
      confidence: conf('steps'),
      why: 'Light movement is one of the most reliable gentle supports for mood and sleep, but there is no target here. Rest is part of recovery.',
      suggestion: { label: 'See a gentle outing', to: '/p/going-out' },
    });
  }
  // Rhythm
  if (S.sleepMid) {
    const s = S.sleepMid;
    const m = Math.round(Math.abs(s.delta) * 60);
    cards.push({
      id: 'rhythm',
      title: 'Daily rhythm',
      icon: 'Sunrise',
      tone: s.badness >= 0.9 ? 'soft' : 'steady',
      headline: s.badness >= 0.9 ? 'Your body clock has drifted a little later.' : 'Your daily rhythm is steady.',
      detail: s.badness >= 0.9 ? `Sleep is centred about ${m} minutes later than usual. Morning light can help nudge it back.` : 'Sleep and wake times are close to your usual pattern.',
      keys: ['sleepMid'],
      unitFmt: (v) => hhmm(v),
      series: lastVals(series, 'sleepMid'),
      band: s.band,
      contributors: [S.nightPhone ? `Phone use after midnight (${deltaText(S.nightPhone)})` : null].filter(Boolean),
      confidence: conf('sleepMid'),
      why: 'A steady body clock supports mood. Regular light, meals and wake-times are among the most helpful rhythms.',
      suggestion: { label: 'Step into daylight', to: '/p/going-out' },
    });
  }
  // Connection
  if (S.social) {
    const s = S.social;
    cards.push({
      id: 'connect',
      title: 'Connection',
      icon: 'HeartHandshake',
      tone: s.badness >= 0.9 ? 'soft' : s.badness <= -0.9 ? 'bright' : 'steady',
      headline: s.badness >= 0.9 ? 'Quieter on the people side lately.' : s.badness <= -0.9 ? 'More connection than usual — lovely.' : 'You’re in touch with people about as usual.',
      detail: s.badness >= 0.9 ? 'No pressure — one small hello often goes a long way.' : 'Calls and messages are a quiet source of support.',
      keys: ['social'],
      unitFmt: (v) => `${Math.round(v)}`,
      series: lastVals(series, 'social'),
      band: s.band,
      contributors: [],
      confidence: conf('social'),
      why: 'We only count how many people you were in touch with — never who, and never what you said.',
      suggestion: { label: 'Say hello to someone in your circle', to: '/p/circle' },
    });
  }
  return cards;
}

