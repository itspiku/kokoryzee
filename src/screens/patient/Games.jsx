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

// ───────────────────────────── Leaf bloom (reaction)
export function GameReact() {
  const { analysis } = usePatientData('alex');
  const [phase, setPhase] = useState('intro'); // intro | wait | go | early | result
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [last, setLast] = useState(null);
  const t0 = useRef(0);
  const tm = useRef(null);
  const ROUNDS = 5;

  const arm = () => {
    setPhase('wait');
    clearTimeout(tm.current);
    tm.current = setTimeout(() => { t0.current = performance.now(); setPhase('go'); engine.chime(88, 0.03); }, 1400 + Math.random() * 2800);
  };
  useEffect(() => () => clearTimeout(tm.current), []);

  const tap = () => {
    if (phase === 'wait') { clearTimeout(tm.current); haptic(6); setPhase('early'); return; }
    if (phase === 'go') {
      const ms = performance.now() - t0.current;
      haptic(18);
      setLast(ms);
      const next = [...times, ms];
      setTimes(next);
      if (next.length >= ROUNDS) {
        const avg = mean(next);
        actions.addCognitive({ game: 'react', ms: avg });
        setPhase('result');
      } else { setRound(next.length); setPhase('between'); setTimeout(arm, 900); }
    }
  };

  const avg = times.length ? mean(times) : 0;
  const s = analysis.signals.reaction;
  const rel = !s ? null : avg < s.baseMed - s.noise ? 'a touch quicker than your usual' : avg > s.baseMed + s.noise ? 'a little slower than your usual — it’s a very ordinary thing, especially on a tired day' : 'right around your usual';

  return (
    <Screen tabs={false} bg="linear-gradient(180deg,#e2eed4,#eef2e2 60%,var(--bg))" theme={undefined} noScroll>
      <TopBar onBack={() => { clearTimeout(tm.current); back('/p/games'); }} sub="Leaf bloom" title={phase === 'result' ? 'All done' : `Round ${Math.min(round + 1, ROUNDS)} of ${ROUNDS}`} />
      <div className="game-stage" onPointerDown={phase === 'wait' || phase === 'go' ? tap : undefined} style={{ touchAction: 'manipulation' }}>
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="i" className="center stack" style={{ alignItems: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ width: 160, height: 160 }}><Bloom /></div>
              <h2 className="h2 mt-16">Tap the moment it blooms.</h2>
              <p className="t-sm t-soft mt-8" style={{ maxWidth: 260 }}>If you tap too early, no worries — we just try again.</p>
              <Btn kind="primary" size="lg" className="mt-24" onClick={arm} icon="Play">Start</Btn>
            </motion.div>
          )}
          {(phase === 'wait' || phase === 'go' || phase === 'between') && (
            <motion.div key="g" className="center stack" style={{ alignItems: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ width: 240, height: 240 }}><Bloom open={phase === 'go'} /></div>
              <h2 className="h2 mt-8">{phase === 'go' ? 'Now!' : phase === 'between' ? `${Math.round(last)} ms` : 'Wait for it…'}</h2>
              <p className="t-sm t-soft mt-4">{phase === 'wait' ? 'Breathe. Let the bud rest.' : phase === 'between' ? 'Lovely.' : 'Tap anywhere'}</p>
            </motion.div>
          )}
          {phase === 'early' && (
            <motion.div key="e" className="center stack" style={{ alignItems: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Koko size={110} mood="caring" />
              <h2 className="h2 mt-12">A little early — no worries.</h2>
              <Btn kind="primary" className="mt-16" onClick={arm}>Try again</Btn>
            </motion.div>
          )}
          {phase === 'result' && (
            <motion.div key="r" className="center stack" style={{ alignItems: 'center' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Koko size={120} mood="happy" />
              <h2 className="h1 mt-12">{Math.round(avg)} ms</h2>
              <p className="t-body t-soft mt-8" style={{ maxWidth: 280 }}>{rel ? `That’s ${rel}.` : 'Thanks — this helps Kokoryze learn your usual.'}</p>
              <div className="row-flex gap-8 mt-24"><Btn kind="primary" onClick={() => back('/p/games')}>Done</Btn><Btn kind="soft" onClick={() => { setTimes([]); setRound(0); setPhase('intro'); }}>Again</Btn></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Screen>
  );
}

// ───────────────────────────── Echo garden (memory)
const PETALS = [
  { c: '#f4a0bd', n: 72, x: 50, y: 18 },
  { c: '#9fc3f0', n: 76, x: 82, y: 50 },
  { c: '#f0d06a', n: 79, x: 50, y: 82 },
  { c: '#9ccf86', n: 84, x: 18, y: 50 },
];
export function GameEcho() {
  const [phase, setPhase] = useState('intro'); // intro | show | input | fail | done
  const [seq, setSeq] = useState([]);
  const [idx, setIdx] = useState(0);
  const [lit, setLit] = useState(-1);
  const [best, setBest] = useState(0);
  const tms = useRef([]);
  useEffect(() => () => tms.current.forEach(clearTimeout), []);

  const flash = (i, ms = 420) => {
    setLit(i);
    engine.chime(PETALS[i].n, 0.05);
    haptic(8);
    tms.current.push(setTimeout(() => setLit(-1), ms));
  };
  const play = (s) => {
    setPhase('show');
    setIdx(0);
    s.forEach((p, k) => tms.current.push(setTimeout(() => flash(p), 700 + k * 760)));
    tms.current.push(setTimeout(() => setPhase('input'), 700 + s.length * 760));
  };
  const start = () => {
    const s = Array.from({ length: 3 }, () => Math.floor(Math.random() * 4));
    setSeq(s);
    setBest(0);
    play(s);
  };
  const press = (i) => {
    if (phase !== 'input') return;
    flash(i, 260);
    if (seq[idx] === i) {
      if (idx + 1 === seq.length) {
        setBest(seq.length);
        if (seq.length >= 8) return finish(seq.length);
        const s = [...seq, Math.floor(Math.random() * 4)];
        setSeq(s);
        setPhase('show');
        tms.current.push(setTimeout(() => play(s), 900));
      } else setIdx(idx + 1);
    } else {
      haptic([30, 40]);
      setPhase('fail');
      finish(best);
    }
  };
  const finish = (span) => {
    actions.addCognitive({ game: 'echo', span });
    setTimeout(() => setPhase((p) => (p === 'fail' ? 'fail' : 'done')), 10);
  };

  return (
    <Screen tabs={false} bg="linear-gradient(180deg,#e7e0f6,#efecf7 60%,var(--bg))" theme={undefined} noScroll>
      <TopBar onBack={() => { tms.current.forEach(clearTimeout); back('/p/games'); }} sub="Echo garden" title={phase === 'input' ? 'Your turn' : phase === 'show' ? 'Watch closely' : 'Echo garden'} />
      <div className="game-stage">
        <div className="echo-flower">
          {PETALS.map((p, i) => (
            <motion.button key={i} className="echo-petal" style={{ left: `${p.x}%`, top: `${p.y}%`, background: `radial-gradient(circle at 35% 30%, #fff8, ${p.c} 60%)` }} onPointerDown={() => press(i)} animate={lit === i ? { scale: 1.25, boxShadow: `0 0 50px 10px ${p.c}` } : { scale: 1, boxShadow: `0 8px 20px -8px ${p.c}` }} transition={{ type: 'spring', stiffness: 300, damping: 14 }} aria-label={`Petal ${i + 1}`} />
          ))}
          <div className="echo-core">{phase === 'intro' || phase === 'fail' || phase === 'done' ? <Koko size={74} mood={phase === 'fail' ? 'caring' : 'happy'} interactive={false} glow={false} /> : <span className="serif" style={{ fontSize: 28 }}>{seq.length}</span>}</div>
        </div>
        <div className="center" style={{ minHeight: 120, marginTop: 24 }}>
          {phase === 'intro' && (<><p className="t-body t-soft" style={{ maxWidth: 270, margin: '0 auto' }}>Petals glow in a pattern. Tap them back in the same order.</p><Btn kind="primary" size="lg" className="mt-16" onClick={start} icon="Play">Start</Btn></>)}
          {phase === 'show' && <p className="t-body t-soft">Watching… {seq.length} petals</p>}
          {phase === 'input' && <p className="t-body t-soft">{idx} of {seq.length}</p>}
          {(phase === 'fail' || phase === 'done') && (
            <>
              <h2 className="h2">{phase === 'done' ? 'Wonderful!' : 'That one was tricky.'}</h2>
              <p className="t-sm t-soft mt-4">You held {best} petals in mind. That’s all that matters.</p>
              <div className="row-flex gap-8 mt-16" style={{ justifyContent: 'center' }}><Btn kind="primary" onClick={() => back('/p/games')}>Done</Btn><Btn kind="soft" onClick={start}>Again</Btn></div>
            </>
          )}
        </div>
      </div>
    </Screen>
  );
}
