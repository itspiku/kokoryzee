// Simulated, privacy-safe signal generator ───────────────────
// Everything here is synthetic demo data. A hidden "wellness" latent curve drives
// plausible wearable / phone / cognitive signals with realistic noise and gaps.

import { mulberry32, gauss, smoothstep, clamp, startOfDay, addDays } from '../lib/util.js';

export const SIGNAL_META = {
  sleepDur: { key: 'sleepDur', label: 'Sleep duration', short: 'Sleep', unit: 'h', badDir: -1, group: 'sleep', digits: 1 },
  sleepEff: { key: 'sleepEff', label: 'Sleep efficiency', short: 'Efficiency', unit: '%', badDir: -1, group: 'sleep', digits: 0 },
  sleepMid: { key: 'sleepMid', label: 'Sleep timing (midpoint)', short: 'Timing', unit: 'h', badDir: +1, group: 'rhythm', digits: 2 },
  restHR: { key: 'restHR', label: 'Resting heart rate', short: 'Resting HR', unit: 'bpm', badDir: +1, group: 'heart', digits: 0 },
  hrv: { key: 'hrv', label: 'Heart-rate variability', short: 'HRV', unit: 'ms', badDir: -1, group: 'heart', digits: 0 },
  steps: { key: 'steps', label: 'Daily steps', short: 'Steps', unit: '', badDir: -1, group: 'movement', digits: 0 },
  activeMin: { key: 'activeMin', label: 'Active minutes', short: 'Active', unit: 'min', badDir: -1, group: 'movement', digits: 0 },
  skinTemp: { key: 'skinTemp', label: 'Skin temperature', short: 'Skin temp', unit: '°C', badDir: 0, group: 'heart', digits: 2 },
  nightPhone: { key: 'nightPhone', label: 'Phone use after midnight', short: 'Night phone', unit: 'min', badDir: +1, group: 'rhythm', digits: 0 },
  social: { key: 'social', label: 'Social contacts', short: 'Contacts', unit: '', badDir: -1, group: 'social', digits: 0 },
  reaction: { key: 'reaction', label: 'Reaction time', short: 'Reaction', unit: 'ms', badDir: +1, group: 'cognition', digits: 0 },
  mood: { key: 'mood', label: 'Mood check-in', short: 'Mood', unit: '/5', badDir: -1, group: 'mood', digits: 1 },
};
export const CORE_KEYS = ['sleepDur', 'sleepMid', 'restHR', 'hrv', 'steps', 'activeMin', 'nightPhone', 'social'];

export const ARCHETYPES = {
  // Recovering well after TMS, with a gentle shift in the last few days
  dip: { base: 0.22, peak: 0.66, riseStart: -34, riseEnd: -16, dipStart: -6, dipDepth: 0.2, wear: 0.95, days: 84 },
  steadyUp: { base: 0.24, peak: 0.7, riseStart: -50, riseEnd: -6, dipStart: -1, dipDepth: 0, wear: 0.96, days: 84 },
  lateShift: { base: 0.3, peak: 0.6, riseStart: -50, riseEnd: -22, dipStart: -7, dipDepth: 0.19, wear: 0.92, days: 84 },
  newStart: { base: 0.3, peak: 0.34, riseStart: -9, riseEnd: -1, dipStart: -1, dipDepth: 0, wear: 0.68, days: 12 },
  steadyGap: { base: 0.5, peak: 0.64, riseStart: -60, riseEnd: -20, dipStart: -1, dipDepth: 0, wear: 0.96, days: 84, gapDays: 3 },
};

export function latent(arch, x) {
  const w =
    arch.base +
    (arch.peak - arch.base) * smoothstep(arch.riseStart, arch.riseEnd, x) -
    arch.dipDepth * smoothstep(arch.dipStart, 0, x);
  return clamp(w, 0.05, 0.95);
}

/**
 * Generate day records oldest → newest (last record = today).
 */
export function generateSeries({ seed = 1, archetype = 'dip', today = new Date() } = {}) {
  const arch = ARCHETYPES[archetype];
  const rng = mulberry32(seed * 7919 + 13);
  const t0 = startOfDay(today);
  const ar = {};
  const noise = (k, sd, phi = 0.35) => {
    ar[k] = (ar[k] || 0) * phi + gauss(rng) * sd * Math.sqrt(1 - phi * phi);
    return ar[k];
  };
  const out = [];
  for (let i = arch.days - 1; i >= 0; i--) {
    const x = -i;
    const date = addDays(t0, x);
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6;
    const w = latent(arch, x);
    const gap = arch.gapDays && i < arch.gapDays;
    const wear = !gap && rng() < arch.wear;
    const phone = !gap && rng() < Math.min(0.97, arch.wear + 0.03);
    const rec = { i: arch.days - 1 - i, x, date, wear, phone, w };

    if (wear) {
      rec.sleepDur = clamp(5.4 + 2.6 * w + noise('sd', 0.5) + (weekend ? 0.35 : 0), 3.5, 10);
      rec.sleepEff = clamp(78 + 15 * w + noise('se', 3), 60, 98);
      rec.sleepMid = 4.6 - 1.6 * w + noise('sm', 0.24) + (weekend ? 0.3 : 0);
      rec.restHR = 78 - 12 * w + noise('hr', 1.5);
      rec.hrv = clamp(24 + 30 * w + noise('hv', 4), 10, 80);
      rec.steps = Math.max(300, Math.round(2800 + 7000 * w + noise('st', 1100) * (weekend ? 1.1 : 1) - (weekend ? 400 : 0)));
      rec.activeMin = Math.max(0, Math.round(8 + 55 * w + noise('am', 9)));
      rec.skinTemp = 0.15 - 0.3 * w + noise('sk', 0.14);
    }
    if (phone) {
      rec.nightPhone = Math.max(0, Math.round(85 - 80 * w + noise('np', 18)));
      rec.social = Math.max(0, Math.round(1 + 7 * w + noise('so', 1.5)));
    }
    if (rng() < 0.38) rec.reaction = Math.round(480 - 110 * w + gauss(rng) * 26);
    if (rng() < 0.5) rec.mood = clamp(Math.round((1.6 + 2.9 * w + gauss(rng) * 0.45) * 2) / 2, 1, 5);
    out.push(rec);
  }
  return out;
}

/** TMS course: 30 weekday sessions beginning `startX` days from today. */
export function tmsSessions(startX = -27, today = new Date(), total = 30) {
  const t0 = startOfDay(today);
  const sessions = [];
  let x = startX;
  while (sessions.length < total) {
    const d = addDays(t0, x);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) sessions.push({ n: sessions.length + 1, x, date: d, done: x <= 0 });
    x++;
  }
  return sessions;
}
