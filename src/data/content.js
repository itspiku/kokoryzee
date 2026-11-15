// Static content: scenes, prompts, people, events ─────────────
// All names and places are fictional.

export const DOCTOR = {
  id: 'marsh',
  name: 'Dr. Elena Marsh',
  short: 'Dr. Marsh',
  role: 'Consultant psychiatrist · TMS lead',
  clinic: 'Harbour Mind Clinic',
  hue: '#5c8f86',
};

export const PATIENT = {
  id: 'alex',
  name: 'Alex Morgan',
  first: 'Alex',
};

// ── Sounds ─────────────────────────────────────────────────
export const LAYER_META = {
  rain: { label: 'Rain', icon: 'CloudRain' },
  ocean: { label: 'Ocean', icon: 'Waves' },
  wind: { label: 'Soft wind', icon: 'Wind' },
  birds: { label: 'Birdsong', icon: 'Bird' },
  fire: { label: 'Hearth', icon: 'Flame' },
  bowl: { label: 'Singing bowl', icon: 'Bell' },
  pad: { label: 'Warm pad', icon: 'AudioLines' },
  piano: { label: 'Soft piano', icon: 'Music2' },
};

export const SCENES = [
  {
    id: 'evening-meditation',
    title: 'Evening meditation',
    sub: 'Singing bowl & a warm, slow pad',
    cat: 'Meditation',
    art: 'bowl',
    grad: ['#2d2a52', '#a6657a', '#f0b48b'],
    accent: '#f3c29a',
    mix: { bowl: 0.85, pad: 0.55, wind: 0.12 },
    best: 'winding down',
    minutes: 12,
  },
  {
    id: 'forest-rain',
    title: 'Forest rain',
    sub: 'Rain on leaves & far-off birds',
    cat: 'Nature',
    art: 'rain',
    grad: ['#14291f', '#2f5a45', '#86b988'],
    accent: '#a9d6a4',
    mix: { rain: 0.9, wind: 0.22, birds: 0.1 },
    best: 'unwinding & focus',
    minutes: 20,
  },
  {
    id: 'morning-birdsong',
    title: 'Morning birdsong',
    sub: 'A gentle dawn chorus',
    cat: 'Nature',
    art: 'birds',
    grad: ['#e9a97e', '#f3d9a6', '#cfe3c3'],
    accent: '#fff1c9',
    mix: { birds: 0.85, wind: 0.18, pad: 0.25 },
    best: 'mornings',
    minutes: 10,
    light: true,
  },
  {
    id: 'ocean-breath',
    title: 'Ocean breath',
    sub: 'Slow tide for deep calm',
    cat: 'Sleep',
    art: 'ocean',
    grad: ['#0f2b38', '#256071', '#86c4ce'],
    accent: '#a9dde0',
    mix: { ocean: 0.92, wind: 0.14, pad: 0.18 },
    best: 'sleep',
    minutes: 30,
  },
  {
    id: 'moonlight-piano',
    title: 'Moonlight piano',
    sub: 'Soft, never-repeating piano',
    cat: 'Sleep',
    art: 'piano',
    grad: ['#10152f', '#2f3a6b', '#8a96cf'],
    accent: '#c6cdf2',
    mix: { piano: 0.85, pad: 0.42, rain: 0.1 },
    best: 'sleep & stillness',
    minutes: 30,
  },
  {
    id: 'warm-hearth',
    title: 'Warm hearth',
    sub: 'A crackling fire in a quiet room',
    cat: 'Focus',
    art: 'fire',
    grad: ['#24120e', '#7e4224', '#ef9f58'],
    accent: '#f7c385',
    mix: { fire: 0.85, pad: 0.25, piano: 0.14 },
    best: 'reading & focus',
    minutes: 25,
  },
];
