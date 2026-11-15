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

