import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '../lib/util.js';
import './koko.css';

/**
 * Koko — a small, soft companion. Breathes, blinks, follows your finger with its eyes,
 * squishes when tapped and sends a little heart. Never speaks of scores or streaks.
 */
export default function Koko({ size = 140, mood = 'calm', follow = true, tilt = 0, interactive = true, glow = true, className = '', style, onTap }) {
  const ref = useRef(null);
  const uid = useId().replace(/:/g, '');
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [hearts, setHearts] = useState([]);
  const [blink, setBlink] = useState(false);
  const [wave, setWave] = useState(0);

  // eyes follow the pointer
  useEffect(() => {
    if (!follow) return;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.55;
        const px = e.touches ? e.touches[0].clientX : e.clientX;
        const py = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = px - cx;
        const dy = py - cy;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 220);
        setLook({ x: (dx / d) * 5 * k, y: (dy / d) * 4 * k });
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('touchmove', move);
      cancelAnimationFrame(raf);
    };
  }, [follow]);

  // random blinking
  useEffect(() => {
    let t;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, 2200 + Math.random() * 3600);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  const tap = useCallback(() => {
    if (!interactive) return;
    haptic(14);
    setWave((w) => w + 1);
    const id = Math.random();
    setHearts((h) => [...h, { id, x: (Math.random() - 0.5) * 50 }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1800);
    onTap?.();
  }, [interactive, onTap]);

  const happy = mood === 'happy';
  const sleepy = mood === 'sleepy';
  const listening = mood === 'listening';
  const caring = mood === 'caring';
  const eyesClosed = sleepy || blink;

  return (
    <motion.div
      ref={ref}
      className={`koko ${className}`}
      style={{ width: size, height: size, ...style }}
      onClick={tap}
      whileTap={interactive ? { scaleX: 1.07, scaleY: 0.92 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 14 }}
      animate={{ rotate: caring ? -4 + tilt : tilt }}
    >
      {glow && <div className="koko-glow" />}
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Koko, your companion">
        <defs>
          <radialGradient id={`kk-body-${uid}`} cx="34%" cy="26%" r="85%">
            <stop offset="0" stopColor="#e6f2d9" />
            <stop offset="0.5" stopColor="#a8cd9b" />
            <stop offset="1" stopColor="#6aa075" />
          </radialGradient>
          <radialGradient id={`kk-belly-${uid}`} cx="50%" cy="40%" r="60%">
            <stop offset="0" stopColor="#fbfff2" stopOpacity="0.95" />
            <stop offset="1" stopColor="#e5f1d6" stopOpacity="0.4" />
          </radialGradient>
          <linearGradient id={`kk-leaf-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b9e0a8" />
            <stop offset="1" stopColor="#5d9a63" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="178" rx="54" ry="8.5" fill="rgba(36,64,47,.16)" className="koko-shadow" />
        <g className="koko-body">
          {/* sprout */}
          <g className="koko-sprout">
            <path d="M100 46 C100 32 102 22 108 12" stroke="#5b8f5f" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <path d="M107 14 C118 2 138 6 140 18 C128 26 114 24 107 14Z" fill={`url(#kk-leaf-${uid})`} />
            <path d="M101 36 C92 24 74 24 68 34 C78 44 94 44 101 36Z" fill={`url(#kk-leaf-${uid})`} opacity="0.92" />
            <path d="M109 15 C117 14 126 15 134 19" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
          {/* feet & arms */}
          <ellipse cx="72" cy="174" rx="17" ry="9" fill="#5e9468" />
          <ellipse cx="128" cy="174" rx="17" ry="9" fill="#5e9468" />
          <motion.ellipse
            cx="36" cy="124" rx="11" ry="17" fill="#79ad82"
            style={{ originX: '42px', originY: '110px' }}
            animate={{ rotate: wave ? [0, -40, 10, -30, 0] : 12 }}
            transition={{ duration: 0.9 }}
            key={`arm-${wave}`}
          />
          <ellipse cx="164" cy="124" rx="11" ry="17" fill="#79ad82" transform="rotate(-12 158 110)" />
          {/* body */}
          <path d="M100 176 C58 176 33 150 33 112 C33 68 63 38 100 38 C137 38 167 68 167 112 C167 150 142 176 100 176 Z" fill={`url(#kk-body-${uid})`} />
          <path d="M60 70 C68 54 84 46 98 46" stroke="rgba(255,255,255,.55)" strokeWidth="6" strokeLinecap="round" fill="none" />
          <ellipse cx="100" cy="144" rx="38" ry="27" fill={`url(#kk-belly-${uid})`} />
          {/* face */}
          <g style={{ transform: `translate(${look.x}px, ${look.y}px)`, transition: 'transform .18s ease-out' }}>
            {happy && !blink ? (
              <>
                <path d="M66 110 Q77 96 88 110" stroke="#1f382a" strokeWidth="5" fill="none" strokeLinecap="round" />
                <path d="M112 110 Q123 96 134 110" stroke="#1f382a" strokeWidth="5" fill="none" strokeLinecap="round" />
              </>
            ) : eyesClosed ? (
              <>
                <path d="M68 108 Q77 115 86 108" stroke="#1f382a" strokeWidth="4.6" fill="none" strokeLinecap="round" />
                <path d="M114 108 Q123 115 132 108" stroke="#1f382a" strokeWidth="4.6" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="77" cy="108" rx={listening ? 9 : 7.6} ry={listening ? 11 : 9.4} fill="#1f382a" />
                <ellipse cx="123" cy="108" rx={listening ? 9 : 7.6} ry={listening ? 11 : 9.4} fill="#1f382a" />
                <circle cx="80" cy="104" r="2.8" fill="#fff" />
                <circle cx="126" cy="104" r="2.8" fill="#fff" />
                <circle cx="74.5" cy="112" r="1.2" fill="#fff" opacity=".7" />
                <circle cx="120.5" cy="112" r="1.2" fill="#fff" opacity=".7" />
              </>
            )}
          </g>
          <ellipse cx="58" cy="128" rx="10" ry="6" fill="#f4a77d" opacity={caring || happy ? 0.75 : 0.5} />
          <ellipse cx="142" cy="128" rx="10" ry="6" fill="#f4a77d" opacity={caring || happy ? 0.75 : 0.5} />
          {happy ? (
            <path d="M88 124 Q100 142 112 124 Q100 128 88 124Z" fill="#1f382a" stroke="#1f382a" strokeWidth="2.5" strokeLinejoin="round" />
          ) : listening ? (
            <ellipse cx="100" cy="130" rx="4.5" ry="5.5" fill="#1f382a" />
          ) : sleepy ? (
            <path d="M94 128 Q100 131 106 128" stroke="#1f382a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M89 125 Q100 136 111 125" stroke="#1f382a" strokeWidth="3.8" fill="none" strokeLinecap="round" />
          )}
        </g>
        {sleepy && (
          <g className="koko-z" fill="#6aa075" fontFamily="Fraunces Variable, serif" fontWeight="600">
            <text x="150" y="52" fontSize="22">z</text>
            <text x="166" y="34" fontSize="16">z</text>
          </g>
        )}
      </svg>
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.span
            key={h.id}
            className="koko-heart"
            initial={{ opacity: 0, y: 0, x: h.x, scale: 0.4 }}
            animate={{ opacity: [0, 1, 1, 0], y: -size * 0.75, scale: [0.4, 1.1, 1, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          >
            ♥
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
