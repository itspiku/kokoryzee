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

