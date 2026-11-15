import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon.jsx';
import Koko from './Koko.jsx';
import { go } from '../lib/nav.js';
import { useStore, actions } from '../lib/store.js';
import { useEngine } from '../audio/useEngine.js';
import { engine } from '../audio/engine.js';
import { sceneById } from '../data/content.js';
import { haptic, fmtTime } from '../lib/util.js';
import { Btn } from './ui.jsx';

// ── ambient living background ──
export function Ambient({ mood = 'calm' }) {
  return (
    <div className={`ambient mood-${mood}`} aria-hidden="true">
      <div className="blob a" />
      <div className="blob b" />
      <div className="blob c" />
      <div className="grain" />
    </div>
  );
}

// ── fake OS status bar (desktop frame only) ──
export function StatusBar() {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setT(Date.now()), 15000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="statusbar" aria-hidden="true">
      <span>{fmtTime(t).replace(/\s?[AP]M/, '')}</span>
      <span className="sb-icons">
        <Icon name="Signal" size={16} stroke={2.4} />
        <Icon name="Wifi" size={16} stroke={2.4} />
        <Icon name="BatteryFull" size={20} stroke={2.2} />
      </span>
    </div>
  );
}

const PATIENT_TABS = [
  { id: 'home', label: 'Today', icon: 'Home', to: '/p/home' },
  { id: 'sounds', label: 'Sounds', icon: 'Music2', to: '/p/sounds' },
  { id: 'support', label: 'Support', icon: 'LifeBuoy', to: '/p/support', center: true },
  { id: 'journal', label: 'Journal', icon: 'PenLine', to: '/p/journal' },
  { id: 'circle', label: 'Circle', icon: 'Users', to: '/p/circle' },
];
const CLIN_TABS = [
  { id: 'overview', label: 'Overview', icon: 'LayoutGrid', to: '/c/overview' },
  { id: 'alerts', label: 'Alerts', icon: 'BellRing', to: '/c/alerts' },
  { id: 'twin', label: 'Twin', icon: 'Brain', to: '/c/twin', center: true },
  { id: 'messages', label: 'Messages', icon: 'MessageCircle', to: '/c/messages' },
  { id: 'trust', label: 'Trust', icon: 'ShieldCheck', to: '/c/trust' },
];

export function TabBar({ role, active, dark, badges = {} }) {
  const tabs = role === 'clinician' ? CLIN_TABS : PATIENT_TABS;
  return (
    <nav className="tabbar" data-theme={dark ? 'evening' : undefined} aria-label="Main">
      {tabs.map((t) => {
        const on = active === t.id;
        if (t.center) {
          return (
            <button key={t.id} className="tab-help" onClick={() => { haptic(14); go(t.to); }} aria-label={t.label} style={role === 'clinician' ? { color: 'var(--primary)' } : undefined}>
              <motion.span
                className="orb"
                whileTap={{ scale: 0.9 }}
                animate={on ? { scale: 1.08 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                style={role === 'clinician' ? { background: 'radial-gradient(circle at 32% 28%, #9fe0d6, #3d8d84 72%)', boxShadow: '0 14px 28px -8px rgba(61,141,132,.7), 0 0 0 5px var(--tab-bg), inset 0 2px 0 rgba(255,255,255,.5)' } : undefined}
              >
                <Icon name={t.icon} size={28} stroke={2} />
              </motion.span>
              <span>{t.label}</span>
            </button>
          );
        }
        return (
          <button key={t.id} className={`tab ${on ? 'active' : ''}`} onClick={() => { haptic(8); go(t.to); }} aria-current={on ? 'page' : undefined}>
            <span className="tab-ico">
              {on && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <motion.span animate={on ? { y: -1, scale: 1.08 } : { y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} style={{ position: 'relative', zIndex: 1, display: 'grid' }}>
                <Icon name={t.icon} size={23} stroke={on ? 2.2 : 1.8} />
              </motion.span>
              {badges[t.id] > 0 && <span className="badge">{badges[t.id]}</span>}
            </span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── mini player ──
export function MiniPlayer({ hidden }) {
  const e = useEngine();
  const last = useStore((s) => s.lastScene);
  const scene = sceneById(e.sceneId || last);
  const show = !hidden && (e.playing || (e.sceneId && engine.ctx && engine.ctx.state === 'suspended'));
  return (
    <AnimatePresence>
      {show && scene && (
        <motion.div
          className="miniplayer"
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          onClick={() => go(`/p/player?scene=${scene.id}`)}
          role="button"
          aria-label={`Now playing ${scene.title}`}
        >
          <div style={{ width: 46, height: 46, borderRadius: 16, background: `linear-gradient(145deg, ${scene.grad[0]}, ${scene.grad[2]})`, position: 'relative', overflow: 'hidden', flex: 'none' }}>
            <div className="eq">{[0, 1, 2, 3].map((i) => <i key={i} style={{ animationDelay: `${i * 0.18}s`, animationPlayState: e.playing ? 'running' : 'paused' }} />)}</div>
          </div>
          <div className="grow">
            <div className="bold truncate" style={{ fontSize: 15 }}>{scene.title}</div>
            <div className="t-xs" style={{ opacity: 0.7 }}>{e.playing ? 'Playing softly' : 'Paused'}</div>
          </div>
          <button
            className="icon-btn"
            style={{ background: 'rgba(255,255,255,.12)', border: 0, color: '#fff', boxShadow: 'none' }}
            aria-label={e.playing ? 'Pause' : 'Play'}
            onClick={(ev) => { ev.stopPropagation(); e.playing ? engine.pause() : engine.resumePlayback(); }}
          >
            <Icon name={e.playing ? 'Pause' : 'Play'} size={20} />
          </button>
          <button
            className="icon-btn"
            style={{ background: 'rgba(255,255,255,.08)', border: 0, color: '#fff', boxShadow: 'none', width: 38, height: 38 }}
            aria-label="Stop"
            onClick={(ev) => { ev.stopPropagation(); engine.stop(1.2); }}
          >
            <Icon name="X" size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── desktop side panels ──
export function SideLeft({ role, onRole }) {
  return (
    <aside className="stage-side" style={{ alignItems: 'flex-start' }}>
      <div className="row-flex gap-12">
        <Koko size={64} follow />
        <div>
          <div className="display" style={{ fontSize: 34 }}>Kokoryze</div>
          <div className="t-sm t-soft">A quiet companion for your mind</div>
        </div>
      </div>
      <p className="t-body t-soft" style={{ maxWidth: 290 }}>
        A mobile-first prototype of a personal brain &amp; mental-wellbeing platform: it quietly notices patterns, explains what changed, and connects people with their care team — never replacing it.
      </p>
      <div>
        <div className="t-cap mb-8">View as</div>
        <div className="stack gap-8">
          <button className={`side-role ${role !== 'clinician' ? 'on' : ''}`} onClick={() => onRole('patient')}>
            <Icon name="Smile" size={20} />
            <span><b>Alex</b><small>Patient app · recovering after TMS</small></span>
          </button>
          <button className={`side-role ${role === 'clinician' ? 'on' : ''}`} onClick={() => onRole('clinician')}>
            <Icon name="Stethoscope" size={20} />
            <span><b>Dr. Elena Marsh</b><small>Clinician app · one doctor for now</small></span>
          </button>
        </div>
      </div>
      <p className="t-xs t-faint" style={{ maxWidth: 290 }}>
        Tip: open this page in a second window — one as Alex, one as Dr. Marsh. Messages, support requests and care-plan changes sync live between them.
      </p>
    </aside>
  );
}

export function SideRight() {
  const principles = [
    ['Passive intelligence', 'Signals are collected quietly. Nothing to fill in.'],
    ['Personal understanding', 'Compared with your own baseline — never a population.'],
    ['Meaningful intelligence', 'What changed, why, and how sure we are.'],
    ['Human-centred support', 'Clinicians and trusted people stay in the loop.'],
    ['Trust & control', 'Consent, audit trails and human oversight by design.'],
  ];
  return (
    <aside className="stage-side">
      <div className="t-cap">Five principles</div>
      <div className="stack gap-12">
        {principles.map(([t, d], i) => (
          <div key={t} className="row-flex gap-12" style={{ alignItems: 'flex-start' }}>
            <div className="icon-btn" style={{ width: 32, height: 32, fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</div>
            <div>
              <div className="bold" style={{ fontSize: 15 }}>{t}</div>
              <div className="t-sm t-soft">{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card tight tint-butter">
        <div className="row-flex gap-8 bold t-sm"><Icon name="Info" size={16} /> Prototype · simulated data</div>
        <div className="t-xs t-soft mt-4">All people, signals and brain visuals are synthetic. Kokoryze is a monitoring and care-support concept — not a diagnostic tool.</div>
      </div>
    </aside>
  );
}
