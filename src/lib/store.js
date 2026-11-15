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

function defaultCarePlans() {
  const approved = Object.fromEntries(INTERVENTIONS.map((i) => [i.id, true]));
  const mk = (extra = {}) => ({
    approved: { ...approved, ...extra.approved },
    notes: extra.notes ?? 'Keep evening wind-down. Gentle outings only when energy allows — no targets.',
    escalation: extra.escalation ?? 'Support request → clinician response within 2 h (working hours). Review alerts persisting ≥ 3 days → bring appointment forward.',
    reviewT: extra.reviewT ?? null,
    updatedAt: Date.now() - 2.5 * DAY,
  });
  return {
    alex: mk(),
    maria: mk({ approved: { games: false } }),
    daniel: mk({ approved: { outings: false, circle: true } }),
    priya: mk({ approved: { games: false, letter: false } }),
    tom: mk(),
  };
}

export function defaults(now = Date.now()) {
  return {
    v: VERSION,
    role: null,
    onboarded: false,
    prefs: { theme: 'auto', scene: 'auto', sound: true, haptics: true, volume: 0.7 },
    consent: {
      wearable: { hr: true, sleep: true, activity: true, temp: false },
      phone: { night: true, social: false, screen: false },
      imaging: { eeg: true, mri: true },
      circle: { share: true },
      shareDoctor: { insights: true, checkins: true, journal: false },
      research: false,
    },
    checkins: [
      { id: uid('c'), t: now - 1 * DAY - 3 * HOUR, weather: 'partly', mood: 4 },
      { id: uid('c'), t: now - 2 * DAY - 2 * HOUR, weather: 'cloud', mood: 3 },
      { id: uid('c'), t: now - 3 * DAY, weather: 'cloud', mood: 3 },
    ],
    journal: seedJournal(now),
    letters: seedLetters(now),
    feedback: seedFeedback(now),
    suggestionLog: [],
    circle: SEED_CIRCLE,
    threads: seedThreads(now),
    appts: seedAppts(now),
    alerts: seedAlerts(now),
    audit: seedAudit(now),
    carePlans: defaultCarePlans(),
    twinNotes: [
      { id: uid('n'), patientId: 'alex', t: now - 1.5 * DAY, by: 'Dr. Elena Marsh', text: 'Left DLPFC engagement proxy tracks the TMS course. Watch the sleep-timing shift before session 26.' },
    ],
    outings: { saved: [], done: [] },
    cognitive: [],
    lastScene: 'evening-meditation',
    createdAt: now,
  };
}

// ── store core ────────────────────────────────────────────
let state = load();
const subs = new Set();
let saveTimer = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === VERSION) return parsed;
    }
  } catch {}
  return defaults();
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, 120);
}
function emit() {
  subs.forEach((f) => f());
}
export const getState = () => state;
export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
  if (next === state) return;
  state = next;
  setHapticsEnabled(state.prefs.haptics);
  if (typeof window !== 'undefined') window.__kzSound = state.prefs.sound;
  emit();
  persist();
}
setHapticsEnabled(state.prefs.haptics);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        const n = JSON.parse(e.newValue);
        if (n && n.v === VERSION) {
          state = n;
          emit();
        }
      } catch {}
    }
  });
}

function subscribe(f) {
  subs.add(f);
  return () => subs.delete(f);
}
export function useStore(selector = (s) => s) {
  return useSyncExternalStore(subscribe, () => selector(state));
}
export function useNow(ms = 30000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return n;
}

// ── actions ───────────────────────────────────────────────
const upd = (fn) => setState((s) => fn(s));
const prepend = (arr, x, max = 500) => [x, ...arr].slice(0, max);

export const actions = {
  setRole: (role) => upd((s) => ({ ...s, role })),
  finishOnboarding: () => upd((s) => ({ ...s, onboarded: true, role: 'patient' })),
  setPref: (k, v) => upd((s) => ({ ...s, prefs: { ...s.prefs, [k]: v } })),
  setConsent: (group, key, value) =>
    upd((s) => {
      const c = { ...s.consent };
      c[group] = key == null ? value : { ...c[group], [key]: value };
      const audit = prepend(s.audit, {
        id: uid('a'), t: Date.now(), actor: PATIENT.name, role: 'patient', action: 'Changed data permission',
        subject: PATIENT.name, detail: `${group}${key ? '.' + key : ''} → ${key == null ? JSON.stringify(value) : value ? 'on' : 'off'}`,
      });
      return { ...s, consent: c, audit };
    }),

  addCheckin: (weather, mood) =>
    upd((s) => ({ ...s, checkins: prepend(s.checkins, { id: uid('c'), t: Date.now(), weather, mood }) })),
  addJournal: (entry) =>
    upd((s) => ({ ...s, journal: prepend(s.journal, { id: uid('j'), t: Date.now(), shared: false, themes: [], ...entry }) })),
  updateJournal: (id, patch) => upd((s) => ({ ...s, journal: s.journal.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
  deleteJournal: (id) => upd((s) => ({ ...s, journal: s.journal.filter((j) => j.id !== id) })),
  addLetter: (l) => upd((s) => ({ ...s, letters: prepend(s.letters, { id: uid('l'), t: Date.now(), photos: [], ...l }) })),
  deleteLetter: (id) => upd((s) => ({ ...s, letters: s.letters.filter((l) => l.id !== id) })),

  addFeedback: (kind, label, helped) =>
    upd((s) => ({ ...s, feedback: [...s.feedback, { id: uid('fb'), t: Date.now(), kind, label, helped, hour: new Date().getHours() }] })),
  logSuggestion: (id, action) =>
    upd((s) => ({ ...s, suggestionLog: [{ id, action, t: Date.now() }, ...s.suggestionLog].slice(0, 80) })),

  sendMessage: (thread, from, text, extra = {}) =>
    upd((s) => {
      const msg = { id: uid('m'), from, text, t: Date.now(), kind: 'text', r: { p: from === 'alex', c: from === 'marsh' }, ...extra };
      return { ...s, threads: { ...s.threads, [thread]: [...(s.threads[thread] || []), msg] } };
    }),
  markRead: (thread, who) =>
    upd((s) => {
      const list = s.threads[thread];
      if (!list || !list.some((m) => m.r && !m.r[who])) return s;
      return { ...s, threads: { ...s.threads, [thread]: list.map((m) => (m.r && !m.r[who] ? { ...m, r: { ...m.r, [who]: true } } : m)) } };
    }),

  addCircle: (p) => upd((s) => (s.circle.length >= 5 ? s : { ...s, circle: [...s.circle, { id: uid('cp'), perms: { okay: true, mood: false, rhythm: false }, ...p }] })),
  removeCircle: (id) => upd((s) => ({ ...s, circle: s.circle.filter((c) => c.id !== id) })),
  setCirclePerm: (id, k, v) => upd((s) => ({ ...s, circle: s.circle.map((c) => (c.id === id ? { ...c, perms: { ...c.perms, [k]: v } } : c)) })),

  saveOuting: (id) =>
    upd((s) => {
      const saved = s.outings.saved.includes(id) ? s.outings.saved.filter((x) => x !== id) : [...s.outings.saved, id];
      return { ...s, outings: { ...s.outings, saved } };
    }),
  doneOuting: (id, felt) => upd((s) => ({ ...s, outings: { ...s.outings, done: [{ id, felt, t: Date.now() }, ...s.outings.done] } })),

  addCognitive: (r) => upd((s) => ({ ...s, cognitive: prepend(s.cognitive, { id: uid('g'), t: Date.now(), ...r }) })),
  setLastScene: (id) => upd((s) => ({ ...s, lastScene: id })),

  // care team
  toggleCare: (patientId, id) =>
    upd((s) => {
      const cp = s.carePlans[patientId];
      const next = { ...cp, approved: { ...cp.approved, [id]: !cp.approved[id] }, updatedAt: Date.now() };
      const audit = prepend(s.audit, {
        id: uid('a'), t: Date.now(), actor: DOCTOR.name, role: 'clinician', action: 'Updated care plan',
        subject: patientNameOf(patientId), detail: `${INTERVENTIONS.find((i) => i.id === id)?.label}: ${next.approved[id] ? 'approved' : 'paused'}`,
      });
      return { ...s, carePlans: { ...s.carePlans, [patientId]: next }, audit };
    }),
  setCareField: (patientId, k, v) =>
    upd((s) => ({ ...s, carePlans: { ...s.carePlans, [patientId]: { ...s.carePlans[patientId], [k]: v, updatedAt: Date.now() } } })),
  addTwinNote: (patientId, text) =>
    upd((s) => ({ ...s, twinNotes: prepend(s.twinNotes, { id: uid('n'), patientId, t: Date.now(), by: DOCTOR.name, text }) })),

  addAudit: (action, detail = '', subject = PATIENT.name, actor = DOCTOR.name, role = 'clinician') =>
    upd((s) => ({ ...s, audit: prepend(s.audit, { id: uid('a'), t: Date.now(), actor, role, action, subject, detail }) })),

  alertAct: (alertId, action, note = '') =>
    upd((s) => {
      const status = { ack: 'ack', action: 'actioned', dismiss: 'dismissed', reopen: 'new' }[action] || 'ack';
      const label = { ack: 'Acknowledged', action: 'Marked as actioned', dismiss: 'Dismissed', reopen: 'Reopened' }[action];
      const alerts = s.alerts.map((a) =>
        a.id === alertId ? { ...a, status, audit: [...a.audit, { t: Date.now(), actor: DOCTOR.name, action: label, note }] } : a
      );
      const al = s.alerts.find((a) => a.id === alertId);
      const audit = prepend(s.audit, {
        id: uid('a'), t: Date.now(), actor: DOCTOR.name, role: 'clinician', action: `Alert ${label.toLowerCase()}`,
        subject: al ? patientNameOf(al.patientId) : '', detail: note || al?.title || '',
      });
      return { ...s, alerts, audit };
    }),
  alertView: (alertId) =>
    upd((s) => {
      const al = s.alerts.find((a) => a.id === alertId);
      if (!al || al.audit.some((x) => x.action === 'Viewed')) return s;
      return { ...s, alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, audit: [...a.audit, { t: Date.now(), actor: DOCTOR.name, action: 'Viewed', note: '' }] } : a)) };
    }),

  // patient asks for human help → alert + message + audit (human escalation)
  requestSupport: (note = '') =>
    upd((s) => {
      const now = Date.now();
      const alert = {
        id: uid('al'),
        patientId: 'alex',
        level: 'urgent',
        title: 'Alex asked their care team for support',
        reason: note || 'Alex tapped “Let my care team know” in the I-need-support flow. No data thresholds were involved — this was a direct, human request.',
        signals: [],
        confidence: 1,
        window: 'Direct request',
        rule: 'patient-initiated · always escalates to a human',
        model: 'n/a',
        createdAt: now,
        status: 'new',
        owner: DOCTOR.name,
        audit: [{ t: now, actor: PATIENT.name, action: 'Requested support', note }],
      };
      const msg = { id: uid('m'), from: 'system', kind: 'system', text: 'Alex asked for support. Dr. Marsh’s team has been notified and will reach out.', t: now, r: { p: true, c: false } };
      const audit = prepend(s.audit, { id: uid('a'), t: now, actor: PATIENT.name, role: 'patient', action: 'Requested human support', subject: PATIENT.name, detail: 'Care team notified' });
      return { ...s, alerts: [alert, ...s.alerts], threads: { ...s.threads, 'dr:alex': [...(s.threads['dr:alex'] || []), msg] }, audit };
    }),

  bookAppt: (patientId, t, kind = 'Check-in call', mode = 'video') =>
    upd((s) => ({ ...s, appts: [...s.appts, { id: uid('ap'), patientId, t, kind, mins: 20, mode, status: 'requested' }].sort((a, b) => a.t - b.t) })),

  resetAll: async () => {
    await clearBlobs();
    state = defaults();
    emit();
    persist();
  },
};

