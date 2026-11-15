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

/** One-sentence "this week in plain words" */
export function weekInWords(a) {
  if (a.status === 'forming') return 'Kokoryze is still getting to know your rhythm. Just wear your watch — nothing else is needed.';
  if (a.status === 'review' || a.status === 'shift') return 'A few signals have shifted gently from your usual. Nothing to fix. Small kind things tend to help.';
  if (a.status === 'better') return 'Things look a little brighter than your usual lately. Notice it.';
  return 'Your week looks steady and close to your usual. Quiet is good.';
}

// ── suggestion engine: one gentle suggestion at a time ──
export function suggest({ now = new Date(), analysis, stats, log, approved, mood, hasLetter }) {
  const hour = now.getHours() + now.getMinutes() / 60;
  const pod = partOfDay(now);
  const ok = (k) => approved?.[k] !== false;
  const rate = (kind, d = 0.5) => (stats?.[kind] ? stats[kind].rate : d);
  const helped = (kind) => (stats?.[kind] ? `${stats[kind].helpedCount} of ${stats[kind].n}` : null);
  const sh = analysis?.shifted?.map((s) => s.key) || [];
  const lowMood = isNum(mood) && mood <= 2;
  const tiredLately = sh.includes('sleepDur') || sh.includes('sleepMid');
  const stressed = sh.includes('restHR') || sh.includes('hrv');
  const lowMove = sh.includes('steps') || sh.includes('activeMin');

  const C = [];
  if (ok('sounds') || ok('sleep')) {
    const scene = pod === 'evening' || pod === 'night' ? (rate('sound:evening-meditation') >= rate('sound:forest-rain') ? 'evening-meditation' : 'forest-rain') : 'forest-rain';
    const kind = `sound:${scene}`;
    C.push({
      id: `sound-${scene}`,
      fit: pod === 'evening' ? 1 : pod === 'night' ? 0.95 : 0.35 + (stressed ? 0.25 : 0),
      kind,
      title: pod === 'evening' || pod === 'night' ? 'Ease into the evening' : 'A calm pause',
      body: pod === 'evening' || pod === 'night' ? `Ten quiet minutes of ${sceneById(scene).title.toLowerCase()} before you wind down.` : `A few minutes of ${sceneById(scene).title.toLowerCase()} to settle your mind.`,
      reason: helped(kind) ? `This has helped you ${helped(kind)} times.` : 'Gentle sound often helps the body let go.',
      cta: 'Play softly',
      icon: 'Music2',
      tint: 'lav',
      to: `/p/player?scene=${scene}`,
      feedbackKind: kind,
    });
  }
  if (ok('breathing')) {
    C.push({
      id: 'breath',
      fit: 0.45 + (stressed ? 0.4 : 0) + (pod === 'afternoon' ? 0.15 : 0),
      kind: 'breathing:gentle',
      title: 'Three slow breaths… or thirty',
      body: 'A paced-breathing minute to steady things.',
      reason: helped('breathing:gentle') ? `Gentle breathing helped ${helped('breathing:gentle')} times.` : 'Slow exhales calm the body’s alarm system.',
      cta: 'Breathe with me',
      icon: 'Wind',
      tint: 'sky',
      to: '/p/breathe',
      feedbackKind: 'breathing:gentle',
    });
  }
  if (ok('outings')) {
    C.push({
      id: 'walk',
      fit: (pod === 'morning' || pod === 'afternoon' ? 0.8 : 0.1) + (lowMove ? 0.2 : 0),
      kind: 'outing:walk',
      title: 'Five minutes of daylight?',
      body: 'No target. Just step outside, look up, come back.',
      reason: helped('outing:walk') ? `Short walks helped ${helped('outing:walk')} times.` : 'Light and movement are quiet mood-lifters.',
      cta: 'See ideas',
      icon: 'Footprints',
      tint: 'apricot',
      to: '/p/going-out',
      feedbackKind: 'outing:walk',
    });
  }
  if (ok('circle')) {
    C.push({
      id: 'circle',
      fit: 0.25 + (lowMood ? 0.5 : 0) + (pod === 'evening' ? 0.2 : 0),
      kind: 'circle:call',
      title: 'Say a small hello',
      body: 'One tap to let someone you trust know you’re thinking of them.',
      reason: helped('circle:call') ? `Reaching out helped ${helped('circle:call')} times.` : 'Connection is a gentle support.',
      cta: 'Open my circle',
      icon: 'HeartHandshake',
      tint: 'butter',
      to: '/p/circle',
      feedbackKind: 'circle:call',
    });
  }
  if (ok('journal')) {
    C.push({
      id: 'journal',
      fit: (pod === 'evening' || pod === 'night' ? 0.6 : 0.3) + (lowMood ? 0.15 : 0),
      kind: 'journal:write',
      title: 'A line or two, just for you',
      body: 'Write or say what is on your mind. Only you can read it.',
      reason: helped('journal:write') ? `Journaling helped ${helped('journal:write')} times.` : 'Putting a thought outside your head can lighten it.',
      cta: 'Open journal',
      icon: 'PenLine',
      tint: 'sage',
      to: '/p/journal',
      feedbackKind: 'journal:write',
    });
  }
  if (ok('letter') && hasLetter && lowMood) {
    C.push({
      id: 'letter',
      fit: 0.9,
      kind: 'letter:open',
      title: 'A letter from a better day',
      body: 'You wrote something for this moment. Only if you’d like to.',
      reason: 'You asked for it to be offered when things feel heavy.',
      cta: 'Read it',
      icon: 'Mail',
      tint: 'apricot',
      to: '/p/letters',
      feedbackKind: 'letter:open',
    });
  }

  const day = Math.floor(now.getTime() / 86400000);
  const scored = C.map((c, i) => {
    const recent = (log || []).filter((l) => l.id === c.id && now.getTime() - l.t < 24 * HOUR);
    const declined = recent.some((l) => l.action === 'declined');
    const shownRecently = (log || []).some((l) => l.id === c.id && now.getTime() - l.t < 2 * HOUR);
    const personal = rate(c.kind, 0.5);
    const jitter = ((Math.sin(day * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1 * 0.08;
    const score = c.fit * (0.55 + 0.9 * personal) - (declined ? 0.7 : 0) - (shownRecently ? 0.35 : 0) + jitter;
    return { ...c, score };
  }).sort((a, b) => b.score - a.score);
  return scored.filter((c) => c.score > 0.12);
}

// ── pre-visit brief ──
export function buildBrief({ patient, series, analysis: a, stats, plan, phq, journalShared = 0 }) {
  const first = patient.name.split(' ')[0];
  const worse = a.shifted.slice(0, 4);
  const better = a.improved.slice(0, 3);
  const changed = [
    ...worse.map((s) => ({ tone: 'soft', text: `${s.meta.label}: ${deltaText(s)} vs. personal baseline`, key: s.key })),
    ...better.map((s) => ({ tone: 'good', text: `${s.meta.label}: ${deltaText(s)} — better than baseline`, key: s.key })),
  ];
  if (!changed.length) changed.push({ tone: 'good', text: 'No meaningful change from personal baseline across core signals.' });

  const used = Object.values(stats || {}).filter((o) => o.n >= 2).sort((x, y) => y.n - x.n);
  const tried = used
    .filter((o) => !plan || plan.approved[o.kind.split(':')[0] === 'sound' ? 'sounds' : o.kind.split(':')[0] === 'ground' ? 'breathing' : o.kind.split(':')[0]] !== false)
    .slice(0, 5)
    .map((o) => ({ label: o.label, n: o.n, rate: o.rate }));
  const helped = used.filter((o) => o.n >= 3).sort((x, y) => y.rate - x.rate).slice(0, 3).map((o) => ({ label: o.label, yes: o.yes, some: o.some, n: o.n, rate: o.rate }));

  const phqNow = phq?.[phq.length - 1];
  const phqStart = phq?.[0];
  const symptoms = phq?.length
    ? `PHQ-9 ${phqStart}${phq.length > 1 ? ` → ${phqNow}` : ''} (${phqNow >= 20 ? 'severe' : phqNow >= 15 ? 'moderately severe' : phqNow >= 10 ? 'moderate' : phqNow >= 5 ? 'mild' : 'minimal'})`
    : 'No clinician-rated scale on file';

  const questions = [];
  if (worse.some((s) => s.key === 'sleepMid' || s.key === 'sleepDur')) questions.push('How has sleep felt in the last week? Any change in routine, caffeine, or worry at bedtime?');
  if (worse.some((s) => s.key === 'steps' || s.key === 'activeMin')) questions.push('Has energy or motivation changed? Is anything making it harder to get outside?');
  if (worse.some((s) => s.key === 'social')) questions.push('Have you been in touch with your circle as much as you’d like?');
  if (helped[0]) questions.push(`${helped[0].label} appears to help — would you like it more prominent in the plan?`);
  questions.push('Is there anything about the sessions or side-effects you’d like to raise?');

  return {
    headline: a.status === 'review' ? `${first}: gentle shift in the last ${a.recentDays} days after a strong stretch` : a.status === 'better' ? `${first}: brighter than baseline` : `${first}: steady against personal baseline`,
    changed,
    tried,
    helped,
    symptoms,
    questions: questions.slice(0, 4),
    quality: `${a.wearDays} of last ${a.recentDays} days with wearable data · baseline ${Math.round(a.baseCoverage * 100)}% complete · confidence ${confidenceLabel(a.confidence).toLowerCase()} (${a.confidence.toFixed(2)})`,
    journalShared,
  };
}

export function moodFromCheckins(checkins, days = 3) {
  const cutoff = Date.now() - days * 86400000;
  const v = checkins.filter((c) => c.t >= cutoff).map((c) => c.mood);
  return v.length ? mean(v) : NaN;
}
