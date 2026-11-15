import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import Chat from '../../components/Chat.jsx';
import { Btn, Card, Rise, Sheet, SectionTitle, Switch, Avatar, Pill, TopBar, toast } from '../../components/ui.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions, EMPTY } from '../../lib/store.js';
import { CIRCLE_HUES, SUPPORT_MESSAGES, CIRCLE_REPLIES } from '../../data/content.js';
import { haptic, timeAgo, pick } from '../../lib/util.js';
import { engine } from '../../audio/engine.js';

export function simulateReply(person, delay = [2600, 5200]) {
  const lines = CIRCLE_REPLIES[person.id] || CIRCLE_REPLIES.default;
  const d = delay[0] + Math.random() * (delay[1] - delay[0]);
  setTimeout(() => {
    const line = pick(lines);
    actions.sendMessage(`circle:${person.id}`, person.id, line, { r: { p: false, c: true } });
    if (!location.hash.includes(`/p/circle/${person.id}`)) toast(`${person.name}: ${line.slice(0, 48)}${line.length > 48 ? '…' : ''}`, { icon: 'Heart', ms: 4200 });
    haptic([14, 40, 14]);
  }, d);
}

function Constellation({ people, onPick }) {
  const R = 104;
  return (
    <div className="constellation" aria-hidden="false">
      <div className="const-rings"><i /><i /><i /></div>
      <svg className="const-lines" viewBox="-150 -150 300 300">
        {people.map((p, i) => {
          const a = (i / people.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <g key={p.id} className="const-orbit" style={{ animationDelay: '0s' }}>
              <motion.line x1="0" y1="0" x2={Math.cos(a) * R} y2={Math.sin(a) * R} stroke={p.hue} strokeWidth="1.5" strokeDasharray="3 5" opacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4 + i * 0.15, duration: 1 }} />
              <circle r="3.2" fill={p.hue} className="const-pulse" style={{ ['--tx']: `${Math.cos(a) * R}px`, ['--ty']: `${Math.sin(a) * R}px`, animationDelay: `${i * 0.8}s` }} />
            </g>
          );
        })}
      </svg>
      <div className="const-orbit-wrap">
        {people.map((p, i) => {
          const a = (i / people.length) * 360 - 90;
          return (
            <div key={p.id} className="const-slot" style={{ transform: `rotate(${a}deg) translateX(${R}px) rotate(${-a}deg)` }}>
              <motion.button className="const-person" whileTap={{ scale: 0.9 }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 200, damping: 14 }} onClick={() => onPick(p)}>
                <Avatar name={p.name} hue={p.hue} size={52} />
                <span className="t-xs bold">{p.name}</span>
              </motion.button>
            </div>
          );
        })}
      </div>
      <div className="const-center"><Koko size={88} mood="happy" glow={false} /></div>
    </div>
  );
}

