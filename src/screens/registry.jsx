import { lazy } from 'react';

const L = (f) => lazy(f);
const named = (imp, name) => lazy(() => imp().then((m) => ({ default: m[name] })));

const Welcome = L(() => import('./patient/Welcome.jsx'));
const Home = L(() => import('./patient/Home.jsx'));
const Support = L(() => import('./patient/Support.jsx'));
const Breathe = L(() => import('./patient/Breathe.jsx'));
const Ground = L(() => import('./patient/Ground.jsx'));
const Sounds = L(() => import('./patient/Sounds.jsx'));
const Player = L(() => import('./patient/Player.jsx'));
const Journal = L(() => import('./patient/Journal.jsx'));
const JournalNew = named(() => import('./patient/Journal.jsx'), 'JournalNew');
const JournalEntry = named(() => import('./patient/Journal.jsx'), 'JournalEntry');
const Circle = L(() => import('./patient/Circle.jsx'));
const CircleChat = named(() => import('./patient/Circle.jsx'), 'CircleChat');
const Insights = L(() => import('./patient/Insights.jsx'));
const GoingOut = L(() => import('./patient/GoingOut.jsx'));
const Messages = L(() => import('./patient/Messages.jsx'));
const PatientVideo = named(() => import('./patient/Messages.jsx'), 'PatientVideo');
const Privacy = L(() => import('./patient/Privacy.jsx'));
const Letters = L(() => import('./patient/Letters.jsx'));
const LetterNew = named(() => import('./patient/Letters.jsx'), 'LetterNew');
const LetterView = named(() => import('./patient/Letters.jsx'), 'LetterView');
const Games = L(() => import('./patient/Games.jsx'));
const GameReact = named(() => import('./patient/Games.jsx'), 'GameReact');
const GameEcho = named(() => import('./patient/Games.jsx'), 'GameEcho');
const Me = L(() => import('./patient/Me.jsx'));

const Overview = L(() => import('./clinician/Overview.jsx'));
const Alerts = L(() => import('./clinician/Alerts.jsx'));
const AlertDetail = named(() => import('./clinician/Alerts.jsx'), 'AlertDetail');
const Twin = L(() => import('./clinician/Twin.jsx'));
const PatientDetail = L(() => import('./clinician/Patient.jsx'));
const ClinMessages = L(() => import('./clinician/ClinMessages.jsx'));
const ClinThread = named(() => import('./clinician/ClinMessages.jsx'), 'ClinThread');
const ClinVideo = named(() => import('./clinician/ClinMessages.jsx'), 'ClinVideo');
const Trust = L(() => import('./clinician/Trust.jsx'));

// [pattern, component, options]
const TABLE = [
  ['/welcome', Welcome, { mood: 'calm' }],
  ['/p/home', Home, { tab: 'home' }],
  ['/p/support', Support, { tab: 'support', mood: 'warm' }],
  ['/p/breathe', Breathe, {}],
  ['/p/ground', Ground, {}],
  ['/p/sounds', Sounds, { tab: 'sounds', dark: true }],
  ['/p/player', Player, {}],
  ['/p/journal', Journal, { tab: 'journal' }],
  ['/p/journal/new', JournalNew, {}],
  ['/p/journal/:id', JournalEntry, {}],
  ['/p/circle', Circle, { tab: 'circle' }],
  ['/p/circle/:id', CircleChat, {}],
  ['/p/insights', Insights, {}],
  ['/p/going-out', GoingOut, {}],
  ['/p/messages', Messages, {}],
  ['/p/video', PatientVideo, {}],
  ['/p/privacy', Privacy, {}],
  ['/p/letters', Letters, {}],
  ['/p/letters/new', LetterNew, {}],
  ['/p/letters/:id', LetterView, {}],
  ['/p/games', Games, {}],
  ['/p/game/react', GameReact, {}],
  ['/p/game/echo', GameEcho, {}],
  ['/p/me', Me, {}],
  ['/c/overview', Overview, { tab: 'overview', mood: 'cool' }],
  ['/c/alerts', Alerts, { tab: 'alerts', mood: 'cool' }],
  ['/c/alerts/:id', AlertDetail, { mood: 'cool' }],
  ['/c/twin', Twin, { tab: 'twin', dark: true }],
  ['/c/patient/:id', PatientDetail, { mood: 'cool' }],
  ['/c/messages', ClinMessages, { tab: 'messages', mood: 'cool' }],
  ['/c/messages/:pid', ClinThread, { mood: 'cool' }],
  ['/c/video', ClinVideo, {}],
  ['/c/trust', Trust, { tab: 'trust', mood: 'cool' }],
];

