import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, TopBar, Pill, toast } from '../../components/ui.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions } from '../../lib/store.js';
import { usePatientData } from '../../engine/useData.js';
import { engine } from '../../audio/engine.js';
import { haptic, mean } from '../../lib/util.js';

export default function Games() {
  const cog = useStore((s) => s.cognitive);
  const approved = useStore((s) => s.carePlans.alex.approved);
  const react = cog.filter((c) => c.game === 'react').slice(0, 5);
  const echo = cog.filter((c) => c.game === 'echo').slice(0, 5);
  return (
    <Screen tabs={false}>
      <TopBar backTo="/p/insights" sub="Optional" title="Tiny brain games" />
      <p className="t-body t-soft">About a minute each. Never scored, never compared. They simply help {`Dr. Marsh`} see how your thinking feels from week to week — and you can stop any time.</p>
      {approved.games === false && <Card flat className="mt-16 t-sm t-soft">These are paused in your care plan.</Card>}
      <div className="stack gap-14" style={{ gap: 14, marginTop: 18 }}>
        <Rise i={1}>
          <Card tint="sage" onClick={() => go('/p/game/react')} className="game-card">
            <div className="game-art"><Bloom /></div>
            <div className="h2">Leaf bloom</div>
            <div className="t-sm t-soft">Tap when the bud opens. Five quick rounds.</div>
            <div className="row-flex between mt-12"><Pill icon="Timer">~1 min</Pill>{react.length > 0 && <span className="t-xs t-faint">Last: {Math.round(react[0].ms)} ms</span>}</div>
          </Card>
        </Rise>
        <Rise i={2}>
          <Card tint="lav" onClick={() => go('/p/game/echo')} className="game-card">
            <div className="game-art"><EchoArt /></div>
            <div className="h2">Echo garden</div>
            <div className="t-sm t-soft">Watch the petals glow, then repeat the pattern.</div>
            <div className="row-flex between mt-12"><Pill icon="Brain">~1 min</Pill>{echo.length > 0 && <span className="t-xs t-faint">Last: {echo[0].span} petals</span>}</div>
          </Card>
        </Rise>
      </div>
    </Screen>
  );
}

function Bloom({ open }) {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%">
      {[0, 60, 120, 180, 240, 300].map((r, i) => (
        <motion.ellipse key={r} cx="60" cy="38" rx="13" ry="26" fill={open ? '#f6a7c0' : '#bfe0aa'} style={{ transformOrigin: '60px 64px', rotate: r }} animate={{ scaleY: open ? 1 : 0.55, scaleX: open ? 1 : 0.5, fill: open ? '#f6b6cc' : '#a8d392' }} transition={{ type: 'spring', stiffness: 180, damping: 11, delay: i * 0.02 }} />
      ))}
      <motion.circle cx="60" cy="64" r="11" fill="#f7d36a" animate={{ scale: open ? 1.2 : 0.8 }} style={{ transformOrigin: '60px 64px' }} />
    </svg>
  );
}
function EchoArt() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%">
      {[['#f6a7c0', 60, 30], ['#a9c8f2', 90, 60], ['#f2d576', 60, 90], ['#a8d392', 30, 60]].map(([c, x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r="17" fill={c} animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.7 }} style={{ transformOrigin: `${x}px ${y}px` }} />
      ))}
    </svg>
  );
}

