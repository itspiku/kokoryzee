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
export const sceneById = (id) => SCENES.find((s) => s.id === id);
export const SOUND_CATS = ['All', 'Meditation', 'Nature', 'Sleep', 'Focus'];

// ── Breathing ──────────────────────────────────────────────
export const BREATHS = [
  {
    id: 'gentle',
    name: 'Gentle',
    blurb: 'In for 4, out for 6. The easiest place to start.',
    phases: [
      { k: 'in', label: 'Breathe in', secs: 4 },
      { k: 'out', label: 'Breathe out', secs: 6 },
    ],
  },
  {
    id: 'box',
    name: 'Box',
    blurb: 'Four even sides. Steadying when thoughts race.',
    phases: [
      { k: 'in', label: 'Breathe in', secs: 4 },
      { k: 'hold', label: 'Hold softly', secs: 4 },
      { k: 'out', label: 'Breathe out', secs: 4 },
      { k: 'rest', label: 'Rest', secs: 4 },
    ],
  },
  {
    id: '478',
    name: 'Settle',
    blurb: 'In 4, hold 7, out 8. A slow wind-down for nights.',
    phases: [
      { k: 'in', label: 'Breathe in', secs: 4 },
      { k: 'hold', label: 'Hold softly', secs: 7 },
      { k: 'out', label: 'Breathe out', secs: 8 },
    ],
  },
  {
    id: 'wave',
    name: 'Wave',
    blurb: 'Five and a half each way. Like the tide.',
    phases: [
      { k: 'in', label: 'Breathe in', secs: 5.5 },
      { k: 'out', label: 'Breathe out', secs: 5.5 },
    ],
  },
];

export const GROUND_STEPS = [
  { n: 5, sense: 'see', icon: 'Eye', line: 'Look around. Name five things you can see.', hint: 'The colour of a mug. A crack in the ceiling. Light on the floor.' },
  { n: 4, sense: 'feel', icon: 'Hand', line: 'Notice four things you can feel.', hint: 'Your feet on the floor. The weight of your clothes. A cool breeze.' },
  { n: 3, sense: 'hear', icon: 'Ear', line: 'Listen for three sounds.', hint: 'Far-off traffic. Your own breath. The hum of something electric.' },
  { n: 2, sense: 'smell', icon: 'Flower2', line: 'Find two things you can smell.', hint: "Tea, soap, fresh air. If nothing, remember a smell you love." },
  { n: 1, sense: 'taste', icon: 'Coffee', line: 'Notice one thing you can taste.', hint: "Or take a slow sip of water, and notice it." },
];

// ── Journal ────────────────────────────────────────────────
export const JOURNAL_PROMPTS = [
  { id: 'today', title: "Keep today's thoughts", sub: 'Just write what comes', icon: 'PenLine', tint: 'sage', seed: 'Today I noticed…' },
  { id: 'want', title: 'Capture what you want', sub: 'Small wants count too', icon: 'Sprout', tint: 'butter', seed: 'Something I would like more of is…' },
  { id: 'joy', title: 'Remember a joy', sub: 'Even a tiny one', icon: 'Sun', tint: 'apricot', seed: 'A small good moment today was…' },
  { id: 'shift', title: 'Shift a tough thought', sub: 'Gently, with a friend’s voice', icon: 'Wind', tint: 'lav', seed: 'The thought that keeps visiting me is…' },
];
