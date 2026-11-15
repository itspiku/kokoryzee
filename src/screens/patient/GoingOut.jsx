import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, Sheet, SectionTitle, Pill, TopBar, toast } from '../../components/ui.jsx';
import { simulateReply } from './Circle.jsx';
import { useStore, actions } from '../../lib/store.js';
import { usePatientData } from '../../engine/useData.js';
import { OUTINGS, OUTING_CATS, SMALL_STEPS } from '../../data/content.js';
import { haptic, partOfDay, greeting } from '../../lib/util.js';
import { engine } from '../../audio/engine.js';

export function OutingArt({ art, grad, h = 132 }) {
  const stroke = 'rgba(36,64,47,.55)';
  const scenes = {
    walk: (
      <>
        <path d="M-10 118 C80 80 160 112 330 84 L330 140 L-10 140Z" fill="rgba(255,255,255,.35)" />
        <path d="M120 140 C140 112 170 100 210 90" stroke="rgba(255,255,255,.7)" strokeWidth="10" strokeLinecap="round" fill="none" />
        {[40, 80, 250, 290].map((x, i) => <g key={x} className="o-sway" style={{ animationDelay: `${i * 0.6}s`, transformOrigin: `${x}px 112px` }}><rect x={x - 2} y="86" width="4" height="26" fill={stroke} opacity=".6" /><circle cx={x} cy="74" r={18 + (i % 2) * 5} fill="rgba(52,88,64,.45)" /></g>)}
        <circle cx="240" cy="30" r="16" fill="rgba(255,255,255,.7)" />
      </>
    ),
    cafe: (
      <>
        <ellipse cx="160" cy="118" rx="70" ry="8" fill="rgba(0,0,0,.08)" />
        <path d="M118 62 h84 v26 a38 34 0 0 1 -84 0z" fill="#fff" opacity=".92" />
        <path d="M202 70 h12 a13 13 0 0 1 0 26 h-14" stroke="#fff" strokeWidth="7" fill="none" opacity=".92" />
        <rect x="100" y="108" width="120" height="8" rx="4" fill="rgba(255,255,255,.7)" />
        {[0, 1, 2].map((i) => <path key={i} className="o-steam" style={{ animationDelay: `${i * 0.7}s` }} d={`M${140 + i * 20} 54 q-8 -10 0 -20 q8 -10 0 -20`} stroke="rgba(255,255,255,.8)" strokeWidth="4" strokeLinecap="round" fill="none" />)}
      </>
    ),
    garden: (
      <>
        <path d="M-10 108 C90 90 200 112 330 94 L330 140 L-10 140Z" fill="rgba(90,60,40,.28)" />
        {[60, 120, 180, 240, 290].map((x, i) => <g key={x} className="o-sway" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${x}px 108px` }}><path d={`M${x} 108 q-2 -${22 + i * 5} 2 -${34 + i * 6}`} stroke="rgba(255,255,255,.85)" strokeWidth="4" strokeLinecap="round" fill="none" /><path d={`M${x} ${88 - i * 3} q-18 -10 -22 -2 q12 12 22 2z M${x + 2} ${78 - i * 4} q18 -12 22 -4 q-12 12 -22 4z`} fill="rgba(255,255,255,.75)" /></g>)}
      </>
    ),
    pottery: (
      <>
        <ellipse cx="160" cy="120" rx="76" ry="8" fill="rgba(0,0,0,.08)" />
        <path d="M130 40 h60 c18 20 22 46 8 76 h-76 c-14 -30 -10 -56 8 -76z" fill="rgba(255,255,255,.88)" />
        <path d="M132 64 q28 12 56 0" stroke="rgba(136,120,200,.5)" strokeWidth="4" fill="none" />
        <path d="M128 84 q32 14 64 0" stroke="rgba(136,120,200,.4)" strokeWidth="4" fill="none" />
        <circle cx="262" cy="46" r="20" fill="rgba(255,255,255,.4)" />
      </>
    ),
    stretch: (
      <>
        {[-60, -30, 0, 30, 60].map((r, i) => <motion.ellipse key={r} cx="160" cy="96" rx="20" ry="52" fill="rgba(255,255,255,.7)" style={{ transformOrigin: '160px 120px', rotate: r }} animate={{ rotate: [r, r * 1.06, r] }} transition={{ duration: 6, repeat: Infinity, delay: i * 0.3 }} />)}
        <ellipse cx="160" cy="118" rx="60" ry="8" fill="rgba(255,255,255,.4)" />
      </>
    ),
    book: (
      <>
        {[[100, 76, 120, 18, '#fff'], [112, 58, 100, 18, 'rgba(255,255,255,.75)'], [104, 40, 112, 18, '#fff']].map(([x, y, w, hh, f], i) => <rect key={i} x={x} y={y + 14} width={w} height={hh} rx="4" fill={f} opacity=".92" />)}
        <rect x="92" y="108" width="136" height="10" rx="5" fill="rgba(255,255,255,.6)" />
        <path d="M240 40 q10 -14 22 0 q-10 14 -22 0z" fill="rgba(255,255,255,.7)" />
      </>
    ),
    hike: (
      <>
        <path d="M-10 118 L80 54 L130 92 L190 36 L270 108 L330 80 L330 140 L-10 140Z" fill="rgba(255,255,255,.45)" />
        <path d="M190 36 l-18 22 l12 -6 l6 8 l6 -8 l12 6z" fill="rgba(255,255,255,.9)" />
        <circle cx="262" cy="34" r="18" fill="rgba(255,255,255,.75)" />
      </>
    ),
    music: (
      <>
        {[70, 120, 170, 220, 270].map((x, i) => <motion.rect key={x} x={x - 6} width="12" rx="6" fill="rgba(255,255,255,.8)" animate={{ y: [100 - 20 - i * 5, 100 - 60 - (i % 3) * 12, 100 - 20 - i * 5], height: [20 + i * 5, 60 + (i % 3) * 12, 20 + i * 5] }} transition={{ duration: 1.8 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }} />)}
        <path d="M40 116 H280" stroke="rgba(255,255,255,.5)" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 320 132" width="100%" height={h} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id={`og-${art}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={grad[0]} /><stop offset="1" stopColor={grad[1]} /></linearGradient></defs>
      <rect width="320" height="132" fill={`url(#og-${art})`} />
      {scenes[art]}
    </svg>
  );
}

