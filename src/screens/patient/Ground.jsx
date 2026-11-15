import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, TopBar, toast } from '../../components/ui.jsx';
import { back } from '../../lib/nav.js';
import { actions } from '../../lib/store.js';
import { GROUND_STEPS } from '../../data/content.js';
import { engine } from '../../audio/engine.js';
import { haptic } from '../../lib/util.js';

const HUES = ['#7aa774', '#6aa7bd', '#8878c8', '#e68d57', '#c9a24b'];

export default function Ground() {
  const [i, setI] = useState(0);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const step = GROUND_STEPS[i];

  const tap = () => {
    haptic(16);
    engine.chime(72 + count * 2, 0.04);
    const c = count + 1;
    setCount(c);
    if (c >= step.n) {
      setTimeout(() => {
        if (i === GROUND_STEPS.length - 1) {
          setDone(true);
          engine.chime(84, 0.06);
        } else {
          setI(i + 1);
          setCount(0);
        }
      }, 650);
    }
  };

  const feed = (h) => {
    actions.addFeedback('ground:54321', 'Grounding (5-4-3-2-1)', h);
    toast('Thank you. Noted.', { icon: 'Heart' });
    back('/p/support');
  };

  return (
    <Screen tabs={false} theme="evening" bg="linear-gradient(180deg,#1e3a33,#16292a 60%,#10201e)">
      <TopBar onBack={() => back('/p/support')} sub="Grounding" title={done ? undefined : 'Come back to here'} />
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key={i} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ type: 'spring', stiffness: 200, damping: 26 }} className="center stack" style={{ alignItems: 'center' }}>
            <div className="ground-n" style={{ '--c': HUES[i] }}>
              <motion.span key={`${i}-${count}`} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{step.n - count}</motion.span>
              <i />
            </div>
            <div className="row-flex gap-8 mt-12" style={{ color: HUES[i] }}><Icon name={step.icon} size={22} /><span className="t-cap" style={{ color: 'inherit' }}>{step.sense}</span></div>
            <h2 className="h1 mt-8" style={{ maxWidth: 300 }}>{step.line}</h2>
            <p className="t-sm t-soft mt-8" style={{ maxWidth: 290 }}>{step.hint}</p>
            <div className="ground-dots mt-24">
              {Array.from({ length: step.n }, (_, k) => (
                <motion.i key={k} animate={k < count ? { scale: [1, 1.5, 1], background: HUES[i] } : { scale: 1 }} style={{ background: k < count ? HUES[i] : 'var(--line-2)' }} />
              ))}
            </div>
            <Btn kind="primary" size="lg" block className="mt-24" onClick={tap} style={{ background: `linear-gradient(180deg, ${HUES[i]}, color-mix(in srgb, ${HUES[i]} 70%, #000))`, color: '#fff' }}>
              {count >= step.n ? 'Lovely' : 'I noticed one'}
            </Btn>
            <p className="t-xs t-faint mt-12">Tap each time you notice something. Take as long as you need.</p>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="center stack" style={{ alignItems: 'center' }}>
            <Koko size={150} mood="happy" />
            <h1 className="h1 mt-16">You’re here.</h1>
            <p className="t-body t-soft mt-8">Feet on the floor, breath in your body. That’s all this moment needs.</p>
            <div className="stack gap-8 mt-24" style={{ width: '100%' }}>
              <Btn kind="primary" block icon="Smile" onClick={() => feed('yes')}>That helped</Btn>
              <Btn kind="soft" block icon="Meh" onClick={() => feed('some')}>A little</Btn>
              <Btn kind="ghost" block onClick={() => feed('no')}>Not really</Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
