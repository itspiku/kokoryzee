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

function seedThreads(now) {
  const m = (from, text, ago, r = {}) => ({ id: uid('m'), from, text, t: now - ago, r: { p: true, c: true, ...r }, kind: 'text' });
  return {
    'dr:alex': [
      m('marsh', 'Hi Alex — lovely to see you at session 21. Your sleep notes are encouraging. Keep the evening wind-down going and tell me how it feels.', 3 * DAY + 2 * HOUR),
      m('alex', 'Thank you Dr. Marsh. The rain sounds really help me fall asleep.', 3 * DAY),
      m('marsh', 'That’s great to hear. I’ve added them to your plan. See you Thursday.', 2.9 * DAY),
    ],
    'dr:maria': [m('maria', 'Hi doctor, can I move Thursday’s visit to the afternoon?', 6 * HOUR, { c: false }), m('marsh', 'Of course Maria — 2:00 PM works. See you then.', 5 * HOUR)],
    'dr:daniel': [m('daniel', 'Slept badly again this week, not sure why.', 21 * HOUR, { c: false })],
    'dr:priya': [m('marsh', 'Welcome to Kokoryze, Priya. Wear your watch as much as you can in the first two weeks — no need to do anything else.', 2 * DAY)],
    'dr:tom': [m('tom', 'Is it ok if my watch is charging for a few days? Travelling.', 3 * DAY)],
    'circle:mum': [m('mum', 'Thinking of you today, love. Dinner Sunday?', 1.2 * DAY)],
    'circle:jordan': [m('jordan', 'Saw this café you’d love. Saturday?', 2 * DAY)],
    'circle:priya': [],
  };
}

function seedJournal(now) {
  return [
    { id: uid('j'), t: now - 1 * DAY - 2 * HOUR, type: 'text', title: 'A walk that helped', body: 'Went to the river after the session. Cold hands, warm tea. For the first time in a while I noticed the colours.', prompt: 'joy', themes: ['nature', 'hope'], shared: false },
    { id: uid('j'), t: now - 3 * DAY - 5 * HOUR, type: 'text', title: 'Hard morning', body: 'Woke up at five and couldn’t get back to sleep. Heavy start, but I still made breakfast and that counts.', prompt: 'today', themes: ['rest'], shared: false },
    { id: uid('j'), t: now - 6 * DAY, type: 'text', title: 'Small win', body: 'Replied to Jordan’s message without overthinking it. Felt lighter after.', prompt: 'joy', themes: ['friends', 'hope'], shared: false },
  ];
}

function seedLetters(now) {
  return [
    {
      id: uid('l'),
      t: now - 12 * DAY,
      title: 'For a heavy day',
      text:
        'Dear me,\n\nIf you’re reading this, it’s probably because things feel heavy. I’m writing on a good afternoon, sun on the desk, so please trust me on this: it has been heavy before, and it moved.\n\nYou are not behind. You don’t have to explain yourself to anyone today. Drink some water, open a window, and text one person who loves you. The rest can wait.\n\nI’m proud of you for still being here.\n\n— Alex, on a better day',
      audioId: null,
      photos: [],
      offer: 'heavy',
      date: null,
    },
  ];
}

function seedAudit(now) {
  const e = (ago, actor, role, action, detail = '') => ({ id: uid('a'), t: now - ago, actor, role, action, subject: 'Alex Morgan', detail });
  return [
    e(2.6 * DAY, 'Dr. Elena Marsh', 'clinician', 'Viewed patient overview', 'Sleep & rhythm summary'),
    e(2.5 * DAY, 'Dr. Elena Marsh', 'clinician', 'Updated care plan', 'Added: Calming sounds, Sleep wind-down'),
    e(1 * DAY, MODEL_VERSION, 'system', 'Baseline refreshed', 'Rolling 14-day personal baseline'),
    e(0.4 * DAY, MODEL_VERSION, 'system', 'Pre-visit brief generated', 'For Thursday video review'),
    e(3 * HOUR, MODEL_VERSION, 'system', 'Gentle-shift review created', 'Confidence-qualified, awaiting clinician review'),
  ];
}

function seedAppts(now) {
  const t0 = startOfDay(new Date(now));
  const at = (days, hour) => addDays(t0, days).getTime() + hour * HOUR;
  const out = [];
  for (const p of PATIENTS) {
    out.push({ id: uid('ap'), patientId: p.id, t: at(p.next.in, p.next.hour), kind: p.next.kind, mins: p.next.kind.includes('TMS') ? 45 : 25, mode: p.next.kind.includes('Video') || p.next.kind.includes('call') ? 'video' : 'clinic', status: 'scheduled' });
  }
  // today's schedule for the doctor
  out.push({ id: uid('ap'), patientId: 'maria', t: at(0, 9.5), kind: 'TMS maintenance', mins: 30, mode: 'clinic', status: 'scheduled' });
  out.push({ id: uid('ap'), patientId: 'daniel', t: at(0, 11), kind: 'TMS session 19', mins: 45, mode: 'clinic', status: 'scheduled' });
  out.push({ id: uid('ap'), patientId: 'alex', t: at(0, 9), kind: 'TMS session 24', mins: 45, mode: 'clinic', status: 'done' });
  return out.sort((a, b) => a.t - b.t);
}

