// App state ───────────────────────────────────────────────────
// A tiny external store persisted to localStorage and synced across tabs, so the
// patient app and the clinician app (in two windows) feel genuinely connected.

import { useSyncExternalStore, useEffect, useState } from 'react';
import { uid, mulberry32, startOfDay, addDays, DAY, HOUR, MIN, setHapticsEnabled } from './util.js';
import { generateSeries } from '../data/signals.js';
import { analysePatient, MODEL_VERSION, confidenceLabel } from '../engine/baseline.js';
import { alertFromAnalysis } from '../engine/insights.js';
import { PATIENTS, SEED_CIRCLE, INTERVENTIONS, DOCTOR, PATIENT } from '../data/content.js';
import { clearBlobs } from './idb.js';

export const EMPTY = Object.freeze([]);
const KEY = 'kokoryze:v1';
const VERSION = 5;

// ── seeds ─────────────────────────────────────────────────
function seedFeedback(now) {
  const rng = mulberry32(42);
  const out = [];
  const spec = [
    ['sound:forest-rain', 'Forest rain', [9, 2, 1], [19, 23]],
    ['sound:evening-meditation', 'Evening meditation', [6, 1, 0], [20, 23]],
    ['sound:ocean-breath', 'Ocean breath', [3, 2, 2], [22, 24]],
    ['sound:moonlight-piano', 'Moonlight piano', [4, 2, 1], [21, 24]],
    ['breathing:gentle', 'Gentle breathing', [8, 3, 1], [8, 22]],
    ['breathing:box', 'Box breathing', [3, 2, 2], [9, 18]],
    ['outing:walk', 'A short walk outside', [5, 2, 1], [10, 17]],
    ['circle:call', 'Talking with someone close', [4, 1, 0], [17, 21]],
    ['journal:write', 'Journaling', [6, 3, 1], [19, 23]],
    ['ground:54321', 'Grounding (5-4-3-2-1)', [3, 1, 0], [10, 20]],
  ];
  for (const [kind, label, [y, s, n], [h0, h1]] of spec) {
    const arr = [...Array(y).fill('yes'), ...Array(s).fill('some'), ...Array(n).fill('no')];
    arr.sort(() => rng() - 0.5);
    arr.forEach((helped, i) => {
      const day = Math.floor(rng() * 40) + 2;
      const hour = h0 + rng() * (h1 - h0);
      out.push({ id: uid('fb'), t: startOfDay(new Date(now - day * DAY)).getTime() + hour * HOUR, kind, label, helped, hour: Math.floor(hour % 24), seed: true });
    });
  }
  return out.sort((a, b) => a.t - b.t);
}

function seedAlerts(now) {
  const today = new Date(now);
  const alerts = [];
  const mk = (p, extra = {}) => {
    const series = generateSeries({ seed: p.seed, archetype: p.archetype, today });
    const a = analysePatient(series);
    return alertFromAnalysis(p, a, now, extra);
  };
  const alex = PATIENTS[0];
  const alexAlert = mk(alex, { ageH: 3 });
  if (alexAlert) alerts.push(alexAlert);
  const dan = PATIENTS[2];
  const danAlert = mk(dan, { ageH: 20 });
  if (danAlert) alerts.push(danAlert);
  const tom = PATIENTS[4];
  const tomAlert = mk(tom, { ageH: 30 });
  if (tomAlert) alerts.push(tomAlert);
  const pri = PATIENTS[3];
  const priAlert = mk(pri, { ageH: 50 });
  if (priAlert) alerts.push(priAlert);
  return alerts.filter(Boolean);
}

