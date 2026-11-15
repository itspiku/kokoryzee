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

function Team({ onNext }) {
  const [state, setState] = useState('idle');
  const connect = () => {
    setState('linking');
    setTimeout(() => { setState('done'); haptic(24); engine.chime(81, 0.05); }, 1500);
  };
  return (
    <div className="stack" style={{ height: '100%' }}>
      <h1 className="h1 mt-8">Your care team is waiting.</h1>
      <p className="t-body t-soft mt-8">{DOCTOR.name} invited you to Kokoryze from {DOCTOR.clinic}.</p>
      <div className="team-stage">
        <motion.div className="link-line" initial={{ scaleX: 0 }} animate={{ scaleX: state === 'idle' ? 0.12 : 1 }} transition={{ duration: 1.3, ease: [0.22, 0.8, 0.28, 1] }} />
        <div className="stack center" style={{ alignItems: 'center' }}>
          <Koko size={92} mood={state === 'done' ? 'happy' : 'calm'} interactive={false} />
          <div className="bold t-sm mt-4">You</div>
        </div>
        <motion.div className="link-dot" animate={state === 'linking' ? { left: ['18%', '82%'] } : {}} transition={{ duration: 1.3, ease: 'easeInOut' }} style={{ opacity: state === 'linking' ? 1 : 0 }} />
        <div className="stack center" style={{ alignItems: 'center' }}>
          <motion.div animate={state === 'done' ? { scale: [1, 1.12, 1] } : {}}>
            <Avatar name={DOCTOR.name} hue={DOCTOR.hue} size={84} ring />
          </motion.div>
          <div className="bold t-sm mt-4">{DOCTOR.short}</div>
        </div>
      </div>
      <Card flat className="mt-12">
        <div className="bold t-sm mb-8">What {DOCTOR.short} can see</div>
        {[['Check', 'Weekly summaries and trends you approve'], ['Check', 'Alerts if patterns shift, with reasons'], ['X', 'Your private journal. Never, unless you choose to share an entry'], ['X', 'Anything you switch off in Privacy']].map(([ic, t]) => (
          <div key={t} className="row-flex gap-10 t-sm" style={{ padding: '5px 0', alignItems: 'flex-start' }}>
            <Icon name={ic} size={16} style={{ marginTop: 2, color: ic === 'Check' ? 'var(--primary)' : 'var(--ink-3)', flex: 'none' }} stroke={2.6} />
            <span className="t-soft">{t}</span>
          </div>
        ))}
      </Card>
      <div style={{ flex: 1 }} />
      {state === 'done' ? (
        <Btn kind="primary" size="lg" block onClick={onNext} iconRight="ArrowRight">Continue</Btn>
      ) : (
        <Btn kind="primary" size="lg" block onClick={connect} disabled={state === 'linking'} icon={state === 'linking' ? 'RefreshCw' : 'Link2'}>
          {state === 'linking' ? 'Connecting securely…' : `Connect with ${DOCTOR.short}`}
        </Btn>
      )}
    </div>
  );
}

function Consent({ onNext }) {
  const c = useStore((s) => s.consent);
  const rows = [
    { g: 'wearable', k: 'sleep', icon: 'Moon', t: 'Sleep & heart from my watch', d: 'Sleep timing, resting heart rate, HRV. The core of the picture.', on: c.wearable.sleep && c.wearable.hr, set: (v) => { actions.setConsent('wearable', 'sleep', v); actions.setConsent('wearable', 'hr', v); } },
    { g: 'wearable', k: 'activity', icon: 'Footprints', t: 'Movement', d: 'Steps and active minutes.', on: c.wearable.activity, set: (v) => actions.setConsent('wearable', 'activity', v) },
    { g: 'phone', k: 'night', icon: 'Smartphone', t: 'Phone patterns (optional)', d: 'When the phone is used at night and how many people you’re in touch with — never content or names.', on: c.phone.night, set: (v) => { actions.setConsent('phone', 'night', v); actions.setConsent('phone', 'social', v); } },
    { g: 'imaging', k: 'eeg', icon: 'Brain', t: 'Clinic brain data', d: 'EEG or imaging your clinic shares, to build your brain twin.', on: c.imaging.eeg, set: (v) => { actions.setConsent('imaging', 'eeg', v); actions.setConsent('imaging', 'mri', v); } },
    { g: 'circle', k: 'share', icon: 'Users', t: 'My circle can see “I’m okay”', d: 'The people you add see nothing more unless you allow it.', on: c.circle.share, set: (v) => actions.setConsent('circle', 'share', v) },
  ];
  return (
    <div className="stack" style={{ height: '100%' }}>
      <h1 className="h1 mt-8">Your data, your say.</h1>
      <p className="t-body t-soft mt-8">Choose what Kokoryze may use. You can change any of this at any time.</p>
      <div className="stack gap-10 mt-16" style={{ overflowY: 'auto', paddingBottom: 6 }}>
        {rows.map((r, i) => (
          <motion.div key={r.t} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
            <Card tight className="row-flex gap-12">
              <div className="ico-dot"><Icon name={r.icon} size={19} /></div>
              <div className="grow">
                <div className="bold t-sm">{r.t}</div>
                <div className="t-xs t-faint" style={{ lineHeight: 1.35 }}>{r.d}</div>
              </div>
              <Switch on={r.on} onChange={r.set} label={r.t} />
            </Card>
          </motion.div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <p className="t-xs t-faint center mb-12"><Icon name="Lock" size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Encrypted. Every access is logged and visible to you.</p>
      <Btn kind="primary" size="lg" block onClick={onNext} iconRight="ArrowRight">Save my choices</Btn>
    </div>
  );
}

function Watch({ onNext }) {
  const devices = ['Kokoryze Band', 'Apple Watch', 'Fitbit Charge', 'Garmin Venu', 'Galaxy Watch'];
  const [conn, setConn] = useState(null);
  const [busy, setBusy] = useState(null);
  const pair = (d) => {
    setBusy(d);
    setTimeout(() => { setConn(d); setBusy(null); haptic(24); engine.chime(83, 0.05); }, 1600);
  };
  return (
    <div className="stack" style={{ height: '100%' }}>
      <h1 className="h1 mt-8">Pair your watch.</h1>
      <p className="t-body t-soft mt-8">Wear it as usual, including at night. That’s the only thing we ask.</p>
      <div className="radar">
        {[0, 1, 2].map((i) => <span key={i} className="radar-ring" style={{ animationDelay: `${i * 1.1}s`, animationPlayState: conn ? 'paused' : 'running', opacity: conn ? 0 : undefined }} />)}
        <motion.div className="radar-core" animate={conn ? { scale: [1, 1.2, 1], background: 'linear-gradient(145deg,#b9e0a8,#5d9a63)' } : {}}>
          <Icon name={conn ? 'Check' : 'Watch'} size={34} stroke={2.2} />
        </motion.div>
      </div>
      <div className="stack gap-8">
        {devices.map((d, i) => (
          <motion.button
            key={d}
            className="device-row"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
            onClick={() => !conn && !busy && pair(d)}
            disabled={!!conn && conn !== d}
            style={{ opacity: conn && conn !== d ? 0.4 : 1 }}
          >
            <Icon name="Watch" size={20} />
            <span className="grow bold t-sm" style={{ textAlign: 'left' }}>{d}</span>
            {busy === d ? <Icon name="RefreshCw" size={17} className="spin" /> : conn === d ? <Pill icon="Check">Connected</Pill> : <span className="t-xs t-faint">Tap to pair</span>}
          </motion.button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <Btn kind={conn ? 'primary' : 'ghost'} size="lg" block onClick={onNext} iconRight={conn ? 'ArrowRight' : undefined}>{conn ? 'Continue' : 'I’ll do this later'}</Btn>
    </div>
  );
}

function Meet({ onDone }) {
  const petals = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ i, x: Math.random() * 100, d: Math.random() * 3, s: 8 + Math.random() * 12, r: Math.random() * 360 })), []);
  return (
    <div className="stack center" style={{ height: '100%', alignItems: 'center', position: 'relative' }}>
      {petals.map((p) => (
        <motion.span
          key={p.i}
          className="petal"
          style={{ left: `${p.x}%`, width: p.s, height: p.s * 1.3 }}
          initial={{ y: -40, opacity: 0, rotate: p.r }}
          animate={{ y: 620, opacity: [0, 0.9, 0.9, 0], rotate: p.r + 200, x: [0, 24, -18, 20] }}
          transition={{ duration: 7 + p.d, delay: p.d * 0.5, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      <div style={{ marginTop: 40 }}><Koko size={200} mood="happy" /></div>
      <motion.h1 className="display mt-24" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ fontSize: 36 }}>Hi Alex, I’m Koko.</motion.h1>
      <motion.p className="t-body t-soft mt-12" style={{ maxWidth: 300 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
        I’ll be around. No streaks, no scores, no pressure — and if you tap me, I’ll wave.
      </motion.p>
      <div style={{ flex: 1 }} />
      <motion.div style={{ width: '100%' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
        <Btn kind="primary" size="lg" block onClick={onDone} iconRight="ArrowRight">Take me in</Btn>
      </motion.div>
    </div>
  );
}

