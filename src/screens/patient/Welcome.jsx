import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Scenery, { sceneFor } from '../../components/Scenery.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Switch, Avatar, Sheet, Pill } from '../../components/ui.jsx';
import { go } from '../../lib/nav.js';
import { useStore, actions } from '../../lib/store.js';
import { DOCTOR } from '../../data/content.js';
import { engine } from '../../audio/engine.js';
import { haptic, partOfDay } from '../../lib/util.js';

const STEPS = ['hello', 'how', 'team', 'consent', 'watch', 'meet'];

const slide = {
  enter: (d) => ({ opacity: 0, x: d > 0 ? 70 : -70 }),
  center: { opacity: 1, x: 0 },
  exit: (d) => ({ opacity: 0, x: d > 0 ? -70 : 70 }),
};

export default function Welcome() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [clin, setClin] = useState(false);
  const next = () => { haptic(10); setDir(1); setStep((s) => Math.min(STEPS.length - 1, s + 1)); };
  const prev = () => { setDir(-1); setStep((s) => Math.max(0, s - 1)); };
  const id = STEPS[step];

  const finish = () => {
    engine.chime(79, 0.06);
    actions.finishOnboarding();
    go('/p/home', { dir: 'forward' });
  };

  return (
    <Screen tabs={false} noScroll theme={id === 'hello' || id === 'meet' ? undefined : undefined}>
      {/* progress */}
      <div className="onb-top">
        {step > 0 ? (
          <button className="icon-btn" onClick={prev} aria-label="Back"><Icon name="ChevronLeft" size={22} /></button>
        ) : <div style={{ width: 44 }} />}
        <div className="onb-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <motion.i key={s} animate={{ width: i === step ? 26 : 8, opacity: i <= step ? 1 : 0.35 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }} />
          ))}
        </div>
        {step < STEPS.length - 1 ? (
          <button className="t-sm bold" style={{ color: 'var(--ink-3)', width: 44 }} onClick={() => { setDir(1); setStep(STEPS.length - 1); }}>Skip</button>
        ) : <div style={{ width: 44 }} />}
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={id}
          custom={dir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 220, damping: 28, opacity: { duration: 0.22 } }}
          className="onb-body"
        >
          {id === 'hello' && <Hello onNext={next} onClin={() => setClin(true)} />}
          {id === 'how' && <How onNext={next} />}
          {id === 'team' && <Team onNext={next} />}
          {id === 'consent' && <Consent onNext={next} />}
          {id === 'watch' && <Watch onNext={next} />}
          {id === 'meet' && <Meet onDone={finish} />}
        </motion.div>
      </AnimatePresence>

      <ClinSignIn open={clin} onClose={() => setClin(false)} />
    </Screen>
  );
}

function Hello({ onNext, onClin }) {
  return (
    <div className="stack" style={{ height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', left: -20, right: -20, top: -70, height: 420 }}>
        <Scenery time={sceneFor(partOfDay())} height={420} koko={<Koko size={150} mood="happy" />} />
      </div>
      <div style={{ marginTop: 300, position: 'relative', zIndex: 2 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 100, damping: 18 }}>
          <div className="eyebrow"><Icon name="Sparkles" size={14} /> Welcome</div>
          <h1 className="display mt-8" style={{ fontSize: 44, lineHeight: 1 }}>Kokoryze</h1>
          <p className="h2 mt-12 t-soft" style={{ fontWeight: 400, fontSize: 21, lineHeight: 1.3 }}>
            A quiet companion for your mind — one that notices, so you don’t have to.
          </p>
        </motion.div>
        <motion.div className="stack gap-12 mt-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 18 }}>
          <Btn kind="primary" size="lg" block onClick={onNext} iconRight="ArrowRight">Begin gently</Btn>
          <button className="t-sm bold center" style={{ color: 'var(--ink-2)', padding: 8 }} onClick={onClin}>
            I’m a clinician <Icon name="ArrowUpRight" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function How({ onNext }) {
  const items = [
    { icon: 'Watch', tint: 'sage', title: 'It notices, quietly', body: 'Sleep, heart rate, movement and a few optional signals are read in the background. There is nothing to log or fill in.' },
    { icon: 'Lightbulb', tint: 'butter', title: 'It explains, kindly', body: 'You’ll see what changed, why we think so and how sure we are — in plain words, never scores or streaks.' },
    { icon: 'HeartHandshake', tint: 'apricot', title: 'It connects you to people', body: 'Your clinician and the few people you trust can help at the right time. Kokoryze supports them. It never replaces them.' },
  ];
  return (
    <div className="stack" style={{ height: '100%' }}>
      <h1 className="h1 mt-8">You don’t have to do anything.</h1>
      <p className="t-body t-soft mt-8">That’s the whole idea. Here’s how it works:</p>
      <div className="stack gap-12 mt-20">
        {items.map((it, i) => (
          <motion.div key={it.title} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 120, damping: 18 }}>
            <Card tint={it.tint} className="row-flex gap-14" style={{ alignItems: 'flex-start', gap: 14 }}>
              <motion.div className="ico-dot lg" style={{ background: 'var(--glass-soft)' }} animate={{ y: [0, -3, 0] }} transition={{ duration: 3.4 + i, repeat: Infinity, ease: 'easeInOut' }}>
                <Icon name={it.icon} size={24} />
              </motion.div>
              <div>
                <div className="h3">{it.title}</div>
                <p className="t-sm t-soft mt-4">{it.body}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <Btn kind="primary" size="lg" block onClick={onNext} iconRight="ArrowRight">Makes sense</Btn>
    </div>
  );
}

