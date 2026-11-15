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

