import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Switch, TopBar, Segmented } from '../../components/ui.jsx';
import { back } from '../../lib/nav.js';
import { actions } from '../../lib/store.js';
import { engine } from '../../audio/engine.js';
import { BREATHS } from '../../data/content.js';
import { haptic, fmtClock } from '../../lib/util.js';
import { toast } from '../../components/ui.jsx';

const sleep = (ms, ref) => new Promise((res) => { const t = setTimeout(res, ms); ref.timers.push(t); });

export default function Breathe() {
  const [stage, setStage] = useState('pick'); // pick | run | done
  const [pattern, setPattern] = useState(BREATHS[0]);
  const [mins, setMins] = useState(2);
  const [sound, setSound] = useState(true);
  const [cur, setCur] = useState(null);
  const [left, setLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const scale = useMotionValue(0.55);
  const idleScale = useMotionValue(0.8);
  const ref = useRef({ alive: false, timers: [] });
  const total = mins * 60;

  const stop = () => {
    ref.current.alive = false;
    ref.current.timers.forEach(clearTimeout);
    ref.current.timers = [];
    engine.breathStop();
  };
  useEffect(() => () => stop(), []);

  const start = async () => {
    haptic(20);
    setStage('run');
    ref.current.alive = true;
    if (sound) await engine.breathStart();
    const t0 = Date.now();
    scale.set(0.55);
    let idx = 0;
    const tickIv = setInterval(() => ref.current.alive && setElapsed((Date.now() - t0) / 1000), 250);
    ref.current.timers.push(tickIv);
    while (ref.current.alive) {
      const ph = pattern.phases[idx % pattern.phases.length];
      setCur({ ...ph, n: idx });
      const target = ph.k === 'in' ? 1 : ph.k === 'out' ? 0.55 : scale.get();
      if (ph.k === 'in' || ph.k === 'out') animate(scale, target, { duration: ph.secs, ease: [0.37, 0, 0.63, 1] });
      if (sound) engine.breathPhase(ph.k, ph.secs);
      haptic(ph.k === 'in' ? 18 : ph.k === 'out' ? 10 : 4);
      let remain = Math.ceil(ph.secs);
      setLeft(remain);
      const cd = setInterval(() => setLeft((l) => Math.max(1, l - 1)), 1000);
      ref.current.timers.push(cd);
      await sleep(ph.secs * 1000, ref.current);
      clearInterval(cd);
      idx++;
      if ((Date.now() - t0) / 1000 >= total && (ph.k === 'out' || ph.k === 'rest')) break;
    }
    clearInterval(tickIv);
    if (ref.current.alive) {
      ref.current.alive = false;
      engine.breathStop();
      engine.chime(79, 0.06);
      setStage('done');
    }
  };

  const end = () => {
    stop();
    setStage('done');
  };

  const feed = (helped) => {
    actions.addFeedback(`breathing:${pattern.id}`, `${pattern.name} breathing`, helped);
    toast(helped === 'no' ? 'Thanks — I’ll remember that.' : 'Lovely. Noted for next time.', { icon: 'Heart' });
    back('/p/home');
  };

  const phaseKey = cur?.k || 'in';
  const bg = {
    pick: 'linear-gradient(180deg,#14282b,#10211f 60%,#0f1b17)',
    in: 'linear-gradient(180deg,#1b4a52,#16393d 55%,#12292b)',
    hold: 'linear-gradient(180deg,#27446a,#1b3151 55%,#142238)',
    out: 'linear-gradient(180deg,#2d3f66,#25335a 55%,#1b2342)',
    rest: 'linear-gradient(180deg,#1f2b4a,#1a2340 55%,#131a30)',
    done: 'linear-gradient(180deg,#1d3b2c,#162d22 60%,#102019)',
  }[stage === 'run' ? phaseKey : stage];

  return (
    <Screen tabs={false} theme="evening" bg={bg} style={{ transition: 'background 2.5s' }}>
      <div style={{ position: 'absolute', inset: 0, background: bg, transition: 'background 3s ease', zIndex: -1 }} />
      <TopBar onBack={() => { stop(); back('/p/support'); }} sub={stage === 'run' ? `${pattern.name} · ${fmtClock(Math.max(0, total - elapsed))} left` : 'Breathe'} title={stage === 'pick' ? 'A minute for you' : undefined} />

      <AnimatePresence mode="wait">
        {stage === 'pick' && (
          <motion.div key="pick" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}>
            <div className="orb-preview">
              <BreathOrb scale={idleScale} idle />
            </div>
            <div className="stack gap-8 mt-8">
              {BREATHS.map((b) => (
                <Card key={b.id} tight onClick={() => { haptic(8); setPattern(b); }} className="row-flex gap-12" style={{ borderColor: pattern.id === b.id ? 'var(--primary-2)' : undefined, borderWidth: 1.5 }}>
                  <div className="ico-dot"><Icon name="Wind" size={18} /></div>
                  <div className="grow"><div className="bold t-sm">{b.name}</div><div className="t-xs t-faint">{b.blurb}</div></div>
                  {pattern.id === b.id && <Icon name="Check" size={18} stroke={2.6} style={{ color: 'var(--primary)' }} />}
                </Card>
              ))}
            </div>
            <div className="row-flex between mt-16">
              <Segmented id="mins" small options={[{ value: 1, label: '1 min' }, { value: 2, label: '2 min' }, { value: 5, label: '5 min' }]} value={mins} onChange={setMins} />
              <div className="row-flex gap-8 t-sm t-soft"><Icon name={sound ? 'Volume2' : 'VolumeX'} size={18} /> <Switch on={sound} onChange={setSound} label="Sound" /></div>
            </div>
            <Btn kind="primary" size="lg" block className="mt-20" icon="Play" onClick={start}>Begin</Btn>
            <p className="t-xs t-faint center mt-12">Follow the circle. Close your eyes whenever you like.</p>
          </motion.div>
        )}

        {stage === 'run' && (
          <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="breath-run">
            <div className="breath-stage">
              <svg className="breath-progress" viewBox="0 0 320 320">
                <circle cx="160" cy="160" r="152" stroke="rgba(255,255,255,.08)" strokeWidth="3" fill="none" />
                <circle cx="160" cy="160" r="152" stroke="rgba(255,255,255,.55)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 152} strokeDashoffset={2 * Math.PI * 152 * (1 - Math.min(1, elapsed / total))} transform="rotate(-90 160 160)" style={{ transition: 'stroke-dashoffset .3s linear' }} />
              </svg>
              <BreathOrb scale={scale} />
              <div className="breath-label">
                <AnimatePresence mode="wait">
                  <motion.div key={cur?.n} initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: 0.5 }}>
                    <div className="serif" style={{ fontSize: 28 }}>{cur?.label}</div>
                  </motion.div>
                </AnimatePresence>
                <div className="t-num" style={{ opacity: 0.6, fontSize: 18, marginTop: 4 }}>{left}</div>
              </div>
            </div>
            <div className="row-flex gap-12" style={{ justifyContent: 'center', marginTop: 28 }}>
              <button className="icon-btn" onClick={() => { setSound(!sound); sound ? engine.breathStop() : engine.breathStart(); }} aria-label="Toggle sound"><Icon name={sound ? 'Volume2' : 'VolumeX'} size={20} /></button>
              <Btn kind="line" onClick={end}>I’m done</Btn>
            </div>
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="center stack" style={{ alignItems: 'center' }}>
            <Koko size={150} mood="happy" />
            <h1 className="h1 mt-16">That was lovely.</h1>
            <p className="t-body t-soft mt-8">How do you feel now?</p>
            <div className="stack gap-8 mt-20" style={{ width: '100%' }}>
              <Btn kind="primary" block icon="Smile" onClick={() => feed('yes')}>Calmer</Btn>
              <Btn kind="soft" block icon="Meh" onClick={() => feed('some')}>A little better</Btn>
              <Btn kind="ghost" block onClick={() => feed('no')}>About the same</Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}

function BreathOrb({ scale, idle }) {
  const s = scale;
  const ring1 = useTransform(s, (v) => 0.9 + v * 0.35);
  const ring2 = useTransform(s, (v) => 0.8 + v * 0.55);
  const ring3 = useTransform(s, (v) => 0.7 + v * 0.8);
  const glow = useTransform(s, [0.55, 1], [0.35, 0.9]);
  const o1 = useTransform(s, [0.55, 1], [0.1, 0.3]);
  const o2 = useTransform(s, [0.55, 1], [0.15, 0.4]);
  const o3 = useTransform(s, [0.55, 1], [0.2, 0.5]);
  const pScale = useTransform(s, [0.55, 1], [0.7, 1.15]);
  const pRot = useTransform(s, [0.55, 1], [0, 45]);
  return (
    <div className="breath-orb">
      <motion.div className="ring" style={{ scale: ring3, opacity: o1 }} />
      <motion.div className="ring" style={{ scale: ring2, opacity: o2 }} />
      <motion.div className="ring" style={{ scale: ring1, opacity: o3 }} />
      <motion.div className="petals" style={{ scale: pScale, rotate: pRot }}>
        {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 45}deg) translateY(-52px)` }} />)}
      </motion.div>
      <motion.div className="core" style={{ scale: s }}>
        <motion.div className="core-glow" style={{ opacity: glow }} />
      </motion.div>
      {idle && <motion.div className="idle-pulse" animate={{ scale: [0.9, 1.15, 0.9] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />}
    </div>
  );
}

