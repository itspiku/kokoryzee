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

