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
export const REFLECTION_STEPS = [
  { q: 'What is the thought, in one sentence?', ph: 'e.g. “I’m letting everyone down.”' },
  { q: 'How does it feel in your body?', ph: 'Heavy chest, tight jaw, tired…' },
  { q: 'What would you say to a friend who thought this?', ph: 'Be as kind as you would be to them.' },
  { q: 'Is there a kinder, still-honest way to say it?', ph: 'e.g. “I’m struggling, and I’m still trying.”' },
];
export const QUOTES = [
  'Slow is a speed too.',
  'Small steps still count as steps.',
  'You don’t have to feel better to be doing better.',
  'Rest isn’t earned. It’s allowed.',
  'Some days, the only job is to be kind to yourself.',
  'Growth rarely looks dramatic from the inside.',
  'Today can be quiet and still be enough.',
];
export const THEME_WORDS = {
  rest: ['sleep', 'tired', 'rest', 'nap', 'bed', 'exhaust'],
  family: ['mum', 'mom', 'dad', 'sister', 'brother', 'family', 'kids'],
  friends: ['friend', 'jordan', 'priya', 'call', 'text', 'chat'],
  nature: ['walk', 'park', 'tree', 'river', 'sun', 'rain', 'garden', 'outside'],
  work: ['work', 'job', 'boss', 'email', 'deadline'],
  worry: ['worry', 'anxious', 'afraid', 'nervous', 'scared', 'stress'],
  gratitude: ['grateful', 'thankful', 'glad', 'lucky', 'kind'],
  hope: ['hope', 'better', 'tomorrow', 'proud', 'progress'],
};

// ── Check-in "weather inside" ──────────────────────────────
export const WEATHER = [
  { id: 'sun', label: 'Clear', mood: 5, icon: 'Sun', color: '#f2b84b' },
  { id: 'partly', label: 'Mostly bright', mood: 4, icon: 'CloudSun', color: '#e8a964' },
  { id: 'cloud', label: 'A bit cloudy', mood: 3, icon: 'Cloud', color: '#9fb4b0' },
  { id: 'rain', label: 'Rainy', mood: 2, icon: 'CloudRain', color: '#7fa7c0' },
  { id: 'storm', label: 'Stormy', mood: 1, icon: 'CloudLightning', color: '#8f86c0' },
];

// ── Circle ─────────────────────────────────────────────────
export const CIRCLE_HUES = ['#e68d57', '#7aa774', '#8878c8', '#6aa7bd', '#d47468', '#c9a24b'];
export const SUPPORT_MESSAGES = [
  'Could you call me tonight?',
  'Heavy day. No need to fix anything — just wanted you to know.',
  'Fancy a short walk this week?',
  'Thinking of you ❤️',
];
export const CIRCLE_REPLIES = {
  mum: ['I’m here, love. I’ll call you in ten minutes.', 'Always. Kettle’s on — want me to come over?', 'Thank you for telling me. I love you.'],
  jordan: ['Always up for a walk — Saturday morning? I’ll bring coffee.', 'Got you. No fixing, just company. Call me anytime.', 'Sending a big hug. Free after 6 if you want to talk.'],
  priya: ['Calling you tonight. Don’t cook, I’ll bring dinner.', 'I’m glad you told me. Proud of you for reaching out.', 'Thinking of you too. Walk on the weekend?'],
  default: ['Thanks for reaching out. I’m here.', 'Glad you told me. Want to talk later?'],
};
export const SEED_CIRCLE = [
  { id: 'mum', name: 'Mum', full: 'Sarah Morgan', rel: 'Mother', hue: '#e68d57', note: 'Usually replies within the hour', perms: { okay: true, mood: false, rhythm: false } },
  { id: 'jordan', name: 'Jordan', full: 'Jordan Reyes', rel: 'Close friend', hue: '#6aa7bd', note: 'Great for walks & a good laugh', perms: { okay: true, mood: false, rhythm: false } },
  { id: 'priya', name: 'Priya', full: 'Priya Morgan', rel: 'Sister', hue: '#8878c8', note: 'Night owl — replies late', perms: { okay: true, mood: true, rhythm: false } },
];

// ── Going out ──────────────────────────────────────────────
export const OUTING_CATS = ['All', 'Nature', 'Café', 'Creative', 'Movement', 'Quiet', 'Together'];
export const OUTINGS = [
  { id: 'o1', title: 'Riverside slow walk', place: 'Millstream Path', when: 'Today · 4:30 PM', dist: '12 min away', cat: 'Nature', art: 'walk', energy: 1, vibe: 'Quiet · 6 people', grad: ['#cfe6c0', '#a8cfae'], ice: ['“Do you come here often, or is this a new route?”', '“What’s your favourite season for walking?”'] },
  { id: 'o2', title: 'Quiet-hour café', place: 'Little Fern Café', when: 'Today · 3:00 PM', dist: '8 min away', cat: 'Café', art: 'cafe', energy: 1, vibe: 'Soft music · seats by the window', grad: ['#fadcc0', '#f3c3a0'], ice: ['“That looks good — what did you order?”', '“Have you tried their cinnamon bun?”'] },
  { id: 'o3', title: 'Community garden morning', place: 'Elm Street Garden', when: 'Sat · 9:00 AM', dist: '15 min away', cat: 'Together', art: 'garden', energy: 2, vibe: 'Friendly · 10 people · no talking required', grad: ['#d9e8b8', '#b5d6a0'], ice: ['“What are you planting?”', '“Is there a job that needs an extra pair of hands?”'] },
  { id: 'o4', title: 'Beginner pottery', place: 'Kiln & Co. Studio', when: 'Wed · 6:00 PM', dist: '20 min away', cat: 'Creative', art: 'pottery', energy: 2, vibe: 'Small group · 8 people', grad: ['#ddd5f3', '#c6bbea'], ice: ['“Is this your first time with clay?”', '“Mine looks like a potato — yours is great.”'] },
  { id: 'o5', title: 'Gentle stretch & tea', place: 'Willow Studio', when: 'Thu · 8:00 AM', dist: '10 min away', cat: 'Movement', art: 'stretch', energy: 1, vibe: 'Slow · all levels', grad: ['#c9e3ea', '#a6cfdb'], ice: ['“Mind if I borrow a block?”', '“Which tea are you having?”'] },
  { id: 'o6', title: 'Library reading hour', place: 'Central Library, 2nd floor', when: 'Daily · open', dist: '14 min away', cat: 'Quiet', art: 'book', energy: 1, vibe: 'Silent · armchairs', grad: ['#f2dc8e', '#ecc872'], ice: ['“Any recommendation for a gentle read?”'] },
  { id: 'o7', title: 'Sunset beginner hike', place: 'Pine Ridge trail', when: 'Sat · 5:00 PM', dist: '25 min away', cat: 'Nature', art: 'hike', energy: 3, vibe: 'Guided · 12 people · easy pace', grad: ['#f6c49c', '#e69b78'], ice: ['“Is this your first time on this trail?”', '“Isn’t that light incredible?”'] },
  { id: 'o8', title: 'Listen-only open mic', place: 'The Lantern Room', when: 'Fri · 7:30 PM', dist: '18 min away', cat: 'Quiet', art: 'music', energy: 2, vibe: 'Cosy · you only have to listen', grad: ['#dcc9ea', '#b9a3dc'], ice: ['“Who’s your favourite act so far?”'] },
];
export const SMALL_STEPS = [
  { id: 's1', text: 'Step outside for five minutes', icon: 'DoorOpen' },
  { id: 's2', text: 'Walk to the end of the street and back', icon: 'Footprints' },
  { id: 's3', text: 'Drink tea by a window', icon: 'Coffee' },
  { id: 's4', text: 'Sit in a patch of sunlight', icon: 'Sun' },
  { id: 's5', text: 'Water a plant', icon: 'Sprout' },
];

// ── Care plan catalogue ────────────────────────────────────
export const INTERVENTIONS = [
  { id: 'breathing', label: 'Guided breathing', blurb: 'Short paced-breathing sessions', icon: 'Wind', tint: 'sky' },
  { id: 'sounds', label: 'Calming sounds & music', blurb: 'Personalised soundscapes', icon: 'Music2', tint: 'lav' },
  { id: 'journal', label: 'Private journal', blurb: 'Writing, voice notes & guided reflection', icon: 'PenLine', tint: 'sage' },
  { id: 'outings', label: 'Gentle outings', blurb: 'Low-pressure things to do outside', icon: 'Footprints', tint: 'apricot' },
  { id: 'circle', label: 'Circle check-ins', blurb: 'Reaching trusted people', icon: 'Users', tint: 'butter' },
  { id: 'games', label: 'Memory & reaction games', blurb: 'Optional, short, never scored', icon: 'Brain', tint: 'sky' },
  { id: 'letter', label: 'Letter to future me', blurb: 'A message from a better day', icon: 'Mail', tint: 'apricot' },
  { id: 'sleep', label: 'Sleep wind-down', blurb: 'Evening routine & sleep sounds', icon: 'Moon', tint: 'lav' },
];

// ── Messages ───────────────────────────────────────────────
export const COMMON_QUESTIONS = [
  'Can I move my appointment?',
  'I have a question about my sleep',
  'How are my sessions going?',
  'I’d like to talk sooner',
];
export const CLINICIAN_TEMPLATES = [
  'Thanks for letting me know. I looked at your recent patterns and would like to check in — does a short call tomorrow work?',
  'That sounds like a hard stretch. You did the right thing reaching out. Let’s talk through it at your next session.',
  'Good to hear. Keep doing what’s helping — we’ll review at your next visit.',
  'I’ve adjusted your plan. Take a look when you’re ready; nothing is urgent.',
];

// ── Patients (clinician caseload) ──────────────────────────
export const PATIENTS = [
  { id: 'alex', name: 'Alex Morgan', age: 34, seed: 1, archetype: 'dip', phase: 'TMS · week 5 of 6', focus: 'Left DLPFC · 10 Hz', hue: '#e68d57', live: true, phq: [19, 16, 13, 11, 9], tmsStart: -33, next: { in: 2, hour: 10.5, kind: 'Video review' } },
  { id: 'maria', name: 'Maria Lopez', age: 47, seed: 2, archetype: 'steadyUp', phase: 'Maintenance · month 3', focus: 'Post-TMS follow-up', hue: '#7aa774', phq: [18, 14, 10, 7, 5], tmsStart: -80, next: { in: 9, hour: 14, kind: 'Clinic visit' } },
  { id: 'daniel', name: 'Daniel Okafor', age: 29, seed: 3, archetype: 'lateShift', phase: 'TMS · week 4 of 6', focus: 'Left DLPFC · iTBS', hue: '#6aa7bd', phq: [21, 18, 14, 13, 12], tmsStart: -26, next: { in: 1, hour: 9, kind: 'TMS session' } },
  { id: 'priya', name: 'Priya Nair', age: 52, seed: 4, archetype: 'newStart', phase: 'Starting · day 12', focus: 'Baseline forming', hue: '#8878c8', phq: [17], tmsStart: -2, next: { in: 4, hour: 11, kind: 'Intake review' } },
  { id: 'tom', name: 'Tom Whitfield', age: 41, seed: 5, archetype: 'steadyGap', phase: 'Maintenance · month 5', focus: 'Stable', hue: '#c9a24b', phq: [15, 11, 8, 6, 6], tmsStart: -140, next: { in: 12, hour: 16, kind: 'Check-in call' } },
];
export const patientById = (id) => PATIENTS.find((p) => p.id === id);

export const BRAIN_REGIONS = [
  { id: 'dlpfc', name: 'Dorsolateral prefrontal cortex', short: 'DLPFC', tag: 'TMS target', pos: [-0.5, 0.36, 0.7], r: 0.42, deep: false, color: '#f0b35a', blurb: 'Executive control and mood regulation. The stimulation site for this course of TMS.', drivers: ['sleepDur', 'activeMin', 'mood'] },
  { id: 'acc', name: 'Anterior cingulate', short: 'ACC', tag: 'Mood & motivation', pos: [0.0, 0.18, 0.52], r: 0.4, deep: true, color: '#8fd3c4', blurb: 'Links emotion, motivation and attention.', drivers: ['mood', 'social', 'sleepDur'] },
  { id: 'amyg', name: 'Amygdala', short: 'AMY', tag: 'Stress reactivity (proxy)', pos: [-0.3, -0.2, 0.26], r: 0.3, deep: true, color: '#e8907a', blurb: 'Threat and stress response. Proxy built from HRV, sleep disruption and resting heart rate.', drivers: ['hrv', 'sleepEff', 'restHR'] },
  { id: 'hipp', name: 'Hippocampus', short: 'HIP', tag: 'Memory & sleep', pos: [0.32, -0.22, -0.05], r: 0.32, deep: true, color: '#a9a0e8', blurb: 'Memory formation and sleep-dependent consolidation.', drivers: ['sleepEff', 'sleepDur', 'reaction'] },
  { id: 'dmn', name: 'Default-mode network', short: 'DMN', tag: 'Rumination (proxy)', pos: [0.0, 0.56, -0.46], r: 0.5, deep: false, color: '#78b6e8', blurb: 'Self-referential thinking. Proxy built from night-time phone use, inactivity and sleep timing.', drivers: ['nightPhone', 'steps', 'sleepMid'] },
  { id: 'str', name: 'Reward circuit', short: 'STR', tag: 'Drive & pleasure (proxy)', pos: [0.16, -0.02, 0.32], r: 0.3, deep: true, color: '#f2d576', blurb: 'Motivation and reward. Proxy built from movement and social contact.', drivers: ['steps', 'social', 'activeMin'] },
];

export const SAFETY_LINES = [
  { id: '988', name: '988 Suicide & Crisis Lifeline', sub: 'Call or text 988 · United States · 24/7', href: 'tel:988' },
  { id: 'emerg', name: 'Emergency services', sub: 'If you’re in immediate danger, call your local number (911 in the US)', href: 'tel:911' },
];
