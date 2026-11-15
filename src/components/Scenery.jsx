import { useMemo, useId } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { mulberry32 } from '../lib/util.js';
import './scenery.css';

export const PALETTES = {
  morning: {
    sky: ['#fde4cb', '#faeed8', '#e9f2e0'], sun: ['#fff1c8', '#ffcf8a'], sunPos: [300, 78], hills: ['#d3e3c8', '#b6d3a8', '#92bb8c', '#6d9f72'], cloud: 'rgba(255,255,255,.85)', light: false, stars: 0,
  },
  afternoon: {
    sky: ['#bddfe9', '#d9ebee', '#eef3e2'], sun: ['#fffbe0', '#ffe9a6'], sunPos: [292, 58], hills: ['#cbe1d0', '#abcfb2', '#86b68e', '#609b6f'], cloud: 'rgba(255,255,255,.92)', light: false, stars: 0,
  },
  evening: {
    sky: ['#5e5391', '#c9827f', '#f6c397'], sun: ['#ffe2b5', '#ff9d6a'], sunPos: [290, 196], hills: ['#9b86b1', '#6a8a82', '#436f5c', '#2f5646'], cloud: 'rgba(255,214,190,.55)', light: true, stars: 14,
  },
  night: {
    sky: ['#0d1830', '#1b3350', '#2a4b55'], sun: ['#fffbe8', '#e9e2bd'], sunPos: [292, 62], hills: ['#2a4660', '#20494a', '#183e39', '#102d2b'], cloud: 'rgba(120,150,190,.18)', light: true, stars: 38,
  },
};

export function sceneFor(pod) {
  return pod === 'morning' ? 'morning' : pod === 'afternoon' ? 'afternoon' : pod === 'evening' ? 'evening' : 'night';
}

export default function Scenery({ time = 'afternoon', height = 330, scrollY, children, fade = true, className = '', koko }) {
  const P = PALETTES[time] || PALETTES.afternoon;
  const rng = useMemo(() => mulberry32(time.length * 31 + 7), [time]);
  const stars = useMemo(() => Array.from({ length: P.stars }, () => ({ x: rng() * 390, y: rng() * 150, r: 0.7 + rng() * 1.4, d: rng() * 4 })), [P.stars, rng]);
  const trees = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ x: 20 + i * 54 + rng() * 22, s: 0.7 + rng() * 0.7, type: rng() > 0.45 ? 'pine' : 'round' })), [rng]);
  const flies = useMemo(() => Array.from({ length: P.stars ? 12 : 0 }, () => ({ x: 20 + rng() * 350, y: 190 + rng() * 80, d: rng() * 6, k: 1 + Math.floor(rng() * 3) })), [P.stars, rng]);
  const zero = useMotionValue(0);
  const sy = scrollY || zero;
  const y1 = { y: useTransform(sy, (v) => v * 0.04) };
  const y2 = { y: useTransform(sy, (v) => v * 0.1) };
  const y3 = { y: useTransform(sy, (v) => v * 0.18) };
  const y4 = { y: useTransform(sy, (v) => v * 0.3) };
  const gid = `sc${useId().replace(/:/g, '')}`;
  return (
    <div className={`scenery ${className}`} style={{ height }} data-light={P.light ? '1' : '0'}>
      <svg viewBox="0 0 390 330" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" aria-hidden="true">
        <defs>
          <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={P.sky[0]} />
            <stop offset="0.55" stopColor={P.sky[1]} />
            <stop offset="1" stopColor={P.sky[2]} />
          </linearGradient>
          <radialGradient id={`${gid}-sun`}>
            <stop offset="0" stopColor={P.sun[0]} />
            <stop offset="0.45" stopColor={P.sun[1]} />
            <stop offset="1" stopColor={P.sun[1]} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${gid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--bg)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--bg)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="390" height="330" fill={`url(#${gid}-sky)`} />
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" className="star" style={{ animationDelay: `${s.d}s` }} />
        ))}
        <motion.g style={y1}>
          <circle cx={P.sunPos[0]} cy={P.sunPos[1]} r="92" fill={`url(#${gid}-sun)`} opacity="0.75" className="sun-glow" />
          {time === 'night' ? (<g><mask id={`${gid}-moon`}><rect width="390" height="330" fill="#fff" /><circle cx={P.sunPos[0] + 9} cy={P.sunPos[1] - 5} r="15" fill="#000" /></mask><circle cx={P.sunPos[0]} cy={P.sunPos[1]} r="18" fill={P.sun[0]} mask={`url(#${gid}-moon)`} /></g>) : <circle cx={P.sunPos[0]} cy={P.sunPos[1]} r="26" fill={P.sun[0]} />}
          
        </motion.g>
        <motion.g style={y1}>
          {[0, 1, 2].map((i) => (
            <g key={i} className={`cloud c${i}`} style={{ animationDelay: `${-i * 31}s` }}>
              <g transform={`translate(0 ${48 + i * 34})`} fill={P.cloud}>
                <ellipse cx="0" cy="8" rx="34" ry="11" />
                <ellipse cx="-14" cy="2" rx="17" ry="12" />
                <ellipse cx="10" cy="-2" rx="21" ry="15" />
              </g>
            </g>
          ))}
        </motion.g>
        {!P.stars && (
          <g className="birds">
            {[0, 1].map((i) => (
              <path key={i} className={`bird b${i}`} d="M0 0 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="rgba(52,88,64,.45)" strokeWidth="1.6" strokeLinecap="round" />
            ))}
          </g>
        )}
        <motion.path style={y2} d="M-20 224 C40 170 110 180 170 205 C230 228 300 160 410 196 L410 340 L-20 340Z" fill={P.hills[0]} />
        <motion.path style={y3} d="M-20 252 C50 208 120 214 190 238 C260 260 330 206 410 236 L410 340 L-20 340Z" fill={P.hills[1]} />
        <motion.g style={y3}>
          {trees.slice(0, 5).map((t, i) => (
            <g key={i} transform={`translate(${t.x + 10} ${232 - (i % 2) * 10}) scale(${t.s * 0.6})`} className="tree" style={{ animationDelay: `${i * 0.7}s` }}>
              {t.type === 'pine' ? (
                <>
                  <rect x="-2" y="0" width="4" height="12" fill={P.hills[3]} opacity="0.7" />
                  <path d="M0 -34 L14 -6 L-14 -6Z M0 -22 L17 6 L-17 6Z" fill={P.hills[2]} />
                </>
              ) : (
                <>
                  <rect x="-2" y="0" width="4" height="13" fill={P.hills[3]} opacity="0.7" />
                  <circle cx="0" cy="-8" r="15" fill={P.hills[2]} />
                </>
              )}
            </g>
          ))}
        </motion.g>
        <motion.path style={y4} d="M-20 292 C60 248 130 256 205 278 C280 298 340 252 410 272 L410 340 L-20 340Z" fill={P.hills[2]} />
        <motion.g style={y4}>
          {trees.slice(4).map((t, i) => (
            <g key={i} transform={`translate(${t.x * 1.1} ${274 + (i % 2) * 6}) scale(${t.s})`} className="tree" style={{ animationDelay: `${i * 0.9}s` }}>
              {t.type === 'pine' ? (
                <>
                  <rect x="-2.5" y="0" width="5" height="14" fill={P.hills[3]} />
                  <path d="M0 -40 L16 -8 L-16 -8Z M0 -26 L20 8 L-20 8Z" fill={P.hills[3]} />
                </>
              ) : (
                <>
                  <rect x="-2.5" y="0" width="5" height="16" fill={P.hills[3]} />
                  <circle cx="0" cy="-10" r="18" fill={P.hills[3]} />
                </>
              )}
            </g>
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <path key={i} className="grass" style={{ animationDelay: `${i * 0.35}s`, transformOrigin: `${14 + i * 36}px ${300 + (i % 3) * 6}px` }} d={`M${14 + i * 36} ${300 + (i % 3) * 6} q-2 -10 -5 -14 M${14 + i * 36} ${300 + (i % 3) * 6} q1 -12 3 -16 M${14 + i * 36} ${300 + (i % 3) * 6} q3 -8 7 -10`} stroke={P.hills[3]} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          ))}
        </motion.g>
        <path d="M-20 318 C70 292 150 300 230 312 C300 322 360 300 410 308 L410 340 L-20 340Z" fill={P.hills[3]} />
        {flies.map((f, i) => (
          <circle key={i} cx={f.x} cy={f.y} r="2" fill="#fff6b0" className={`firefly f${f.k}`} style={{ animationDelay: `${f.d}s` }} />
        ))}
      </svg>
      {koko && <div className="scenery-koko">{koko}</div>}
      {children}
    </div>
  );
}
