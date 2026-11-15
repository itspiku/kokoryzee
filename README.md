# Kokoryze

> A quiet companion for your mind.

Kokoryze is a **mobile-first web app** for personal brain and mental-health monitoring and care support. It quietly notices patterns (sleep, heart rate, movement, optional behaviour and cognition signals), explains what changed in plain words, learns what helps each person, and connects them with their care team — **without ever replacing a clinician**.

Its first use case is supporting people at home during recovery from depression, particularly after TMS. This repository is an interactive **prototype with simulated data**. It is not a diagnostic tool.

## Run it

Double-click **`start-kokoryze.bat`**, or:

```bash
npm install      # first time only
npm run dev      # http://localhost:5173
```

On a phone on the same Wi-Fi, open the *Network* address Vite prints (e.g. `http://192.168.x.x:5173`).
On a desktop the app appears inside a phone frame, with a side panel to switch between **Alex (patient)** and **Dr. Elena Marsh (clinician)**.

Tip: open the page in **two windows** — one as Alex, one as Dr. Marsh. Messages, support requests, care-plan changes and consent changes sync live between them (via `localStorage`).

## What's inside

### Patient app (Alex)
| Screen | What it does |
| --- | --- |
| **Today** | A living landscape that follows the time of day, Koko the companion, *one* gentle suggestion at a time (declining is respected and remembered), an optional one-tap “weather inside” check-in, rhythm cards in plain words, next visit. |
| **I need support** | “What would feel helpful right now?” — two context-aware suggestions, breathing, 5-4-3-2-1 grounding, reaching someone, and **Let my care team know** (a human escalation that creates an audited alert). Crisis lines are always visible. |
| **Sounds** | A music-app–style library of **generative** soundscapes (rain, ocean, birdsong, hearth, singing bowl, soft piano) synthesised live with the Web Audio API — no audio files. Live-reactive artwork, sleep timer, a mixer, and “did this help?” feedback that feeds personalisation. |
| **Breathe / Ground** | Guided paced breathing with a breathing orb, haptics and soft tones; a calm grounding exercise. |
| **Journal** | Private writing, on-device **voice notes**, and a guided reflection (“shift a tough thought”). Entries can be individually shared with the doctor. |
| **My circle** | 2–5 trusted people shown as a constellation; one-tap “thinking of you”, pre-written gentle messages, per-person visibility settings. |
| **Going out** | Gentle, energy-aware outing ideas with generated illustrations, ice-breakers, “who to go with”, and “how did it feel?” learning what is restorative. |
| **Insights** | Plain-language patterns against the person's **own** baseline, 24-hour rhythm rings, “what contributed / how sure are we / why it matters”, “what tends to help you”. No scores, streaks, red graphs or comparisons. |
| **Letters to future me** | Record a voice letter or write one (with photos) on a better day; choose when it may be offered again. |
| **Messages & visits** | Secure chat with Dr. Marsh, common-question chips, appointment requests, video waiting room. |
| **Privacy** | Granular consent (wearable, phone, brain imaging, circle, research), export and delete, and a visible log of **who looked at your data**. |
| **Tiny games** | Optional reaction (“Leaf bloom”) and memory (“Echo garden”) games — never scored. |

### Clinician app (one doctor for now)
| Screen | What it does |
| --- | --- |
| **Overview** | Caseload prioritised by reasons, change-from-baseline sparklines, today's schedule, good news. |
| **Alerts** | Every alert has a **reason, contributing signals, confidence, rule, model version, responsible clinician and audit trail**; acknowledge, action, message, bring forward, or dismiss with a required reason. |
| **Patient** | One-page **pre-visit brief** (what changed / what was tried / what helped), scrubbable multi-lane **timeline**, **care plan** (clinician-approved interventions that directly control what the patient app may suggest), and per-intervention response history. |
| **Brain twin** | A procedural 3D cortex (three.js) with proxy region-level estimates, activity / connectivity / regions layers, a TMS target marker, time scrubbing, a damped-trend “if patterns continue” projection with uncertainty, signal–mood associations, data provenance and clinician notes. Clearly labelled **experimental decision-support**. |
| **Messages** | Inbox, threads, templates, video visit with pre-visit brief. |
| **Trust** | Consent status per patient, role-based access matrix, hash-chained audit log, model monitoring, human-escalation procedure, data rights. |

## How the intelligence works (honest version)

* **Personal baseline** — each signal is compared with the person's own recent median, scaled by that person's own day-to-day noise (estimated from successive differences, so slow trends don't inflate it). No population thresholds. See `src/engine/baseline.js`.
* **Alerts** need agreement: ≥3 core signals shifting the same way, a composite threshold and a confidence floor. Confidence blends data coverage, baseline completeness and cross-signal agreement.
* **Suggestions** (`src/engine/insights.js → suggest`) score context (time of day, recent shifts, mood), the person's own “did this help?” history, the clinician-approved care plan, and recent declines.
* **Twin** (`src/engine/twin.js`) maps each person's signals to *relative, proxy* region estimates (0–100 % of their own range). These are **not measurements of brain activity**; the brain shown is a generic template, not the patient's scan.
* All people, signals, places and the brain are **synthetic**.

## Principles baked in

1. **Passive intelligence** — nothing required; every check-in is optional.
2. **Personal understanding** — only ever compared with yourself.
3. **Meaningful intelligence** — what changed, why, and how sure we are.
4. **Human-centred support** — one gentle suggestion at a time; people stay in the loop.
5. **Trust & control** — consent, audit trails and human oversight are in the architecture.

The five tests (zero-effort, worst-day, guilt, human, “so what”) are applied to every feature: e.g. no streaks or scores (guilt), crisis help is one tap on the worst day, and every insight links to a gentle action.

