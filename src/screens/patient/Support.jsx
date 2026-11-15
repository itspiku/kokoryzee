import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, Sheet, Pill, SectionTitle } from '../../components/ui.jsx';
import { go } from '../../lib/nav.js';
import { useStore, actions, responseStats } from '../../lib/store.js';
import { usePatientData } from '../../engine/useData.js';
import { suggest, moodFromCheckins } from '../../engine/insights.js';
import { DOCTOR, SAFETY_LINES } from '../../data/content.js';
import { haptic } from '../../lib/util.js';

const MORE = [
  { icon: 'Wind', t: 'Breathe with me', s: 'A minute of slow, paced breathing', to: '/p/breathe', tint: 'sky' },
  { icon: 'Hand', t: 'Ground myself', s: 'The 5-4-3-2-1 senses exercise', to: '/p/ground', tint: 'sage' },
  { icon: 'Music2', t: 'Calming sound', s: 'Rain, ocean, bowls, soft piano', to: '/p/sounds', tint: 'lav' },
  { icon: 'PenLine', t: 'Write or say it', s: 'Private journal · just for you', to: '/p/journal', tint: 'butter' },
  { icon: 'HeartHandshake', t: 'Reach someone I trust', s: 'One tap to say hello', to: '/p/circle', tint: 'apricot' },
  { icon: 'MessageCircle', t: `Message ${DOCTOR.short}`, s: 'Secure · replies in one working day', to: '/p/messages', tint: 'sky' },
];

export default function Support() {
  const { analysis } = usePatientData('alex');
  const feedback = useStore((s) => s.feedback);
  const checkins = useStore((s) => s.checkins);
  const log = useStore((s) => s.suggestionLog);
  const plan = useStore((s) => s.carePlans.alex);
  const stats = useMemo(() => responseStats(feedback), [feedback]);
  const mood = moodFromCheckins(checkins, 2);
  const top = useMemo(
    () => suggest({ analysis, stats, log: [], approved: plan.approved, mood, hasLetter: true }).slice(0, 2),
    // eslint-disable-next-line
    [analysis, stats, plan, mood]
  );
  const [more, setMore] = useState(false);
  const [ask, setAsk] = useState(false);
  const [sent, setSent] = useState(false);
  const [kmood, setKmood] = useState('caring');

  const notify = () => {
    haptic([20, 40, 20]);
    actions.requestSupport();
    setSent(true);
    setAsk(false);
    setKmood('happy');
  };

  return (
    <Screen>
      <div className="support-hero">
        <Koko size={118} mood={kmood} />
        <motion.div className="bubble" initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 160, damping: 16 }}>
          I’m right here.
        </motion.div>
      </div>
      <Rise i={1}>
        <h1 className="h1 center">What would feel<br />helpful right now?</h1>
        <p className="t-sm t-soft center mt-8">Pick one thing. Or nothing — that’s okay too.</p>
      </Rise>

      <div className="stack gap-12 mt-20">
        {top.map((s, i) => (
          <Rise key={s.id} i={2 + i}>
            <Card tint={s.tint} onClick={() => { actions.logSuggestion(s.id, 'accepted'); go(s.to); }} className="row-flex gap-14" style={{ gap: 14, padding: 20 }}>
              <div className="suggest-ico"><Icon name={s.icon} size={26} /></div>
              <div className="grow">
                <div className="h3">{s.title}</div>
                <div className="t-sm t-soft mt-4">{s.body}</div>
              </div>
              <Icon name="ChevronRight" size={20} style={{ opacity: 0.5 }} />
            </Card>
          </Rise>
        ))}
      </div>

      <Rise i={5} className="mt-12">
        <button className="more-toggle" onClick={() => { haptic(8); setMore(!more); }}>
          Something else <Icon name={more ? 'ChevronUp' : 'ChevronDown'} size={18} />
        </button>
        <AnimatePresence initial={false}>
          {more && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 30 }} style={{ overflow: 'hidden' }}>
              <div className="stack gap-8 mt-8">
                {MORE.map((m, i) => (
                  <motion.div key={m.t} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card tight onClick={() => go(m.to)} className="row-flex gap-12">
                      <div className="ico-dot"><Icon name={m.icon} size={19} /></div>
                      <div className="grow"><div className="bold t-sm">{m.t}</div><div className="t-xs t-faint">{m.s}</div></div>
                      <Icon name="ChevronRight" size={16} style={{ opacity: 0.4 }} />
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Rise>

      {/* human help */}
      <SectionTitle>I’d like a person</SectionTitle>
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card tint="sage">
              <div className="row-flex gap-10"><div className="ico-dot"><Icon name="CheckCheck" size={19} /></div><div className="bold">{DOCTOR.short}’s team has been told.</div></div>
              <p className="t-sm t-soft mt-8">They’ll reach out. Nothing else was shared — just that you asked. Want company in the meantime?</p>
              <div className="row-flex gap-8 mt-12">
                <Btn kind="primary" size="sm" icon="Wind" onClick={() => go('/p/breathe')}>Breathe with me</Btn>
                <Btn kind="soft" size="sm" icon="HeartHandshake" onClick={() => go('/p/circle')}>My circle</Btn>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="human-card">
              <div className="row-flex gap-12">
                <div className="ico-dot lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="Stethoscope" size={24} /></div>
                <div className="grow">
                  <div className="h3">Let my care team know</div>
                  <div className="t-sm t-soft mt-4">{DOCTOR.short} is told right away that you asked for support. Nothing else is shared.</div>
                </div>
              </div>
              <Btn kind="warm" block className="mt-16" icon="Send" onClick={() => setAsk(true)}>Ask for support</Btn>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* crisis lines — always visible */}
      <Card flat className="mt-16 crisis">
        <div className="row-flex gap-8 bold t-sm"><Icon name="LifeBuoy" size={17} style={{ color: 'var(--rose-500)' }} /> If you might be in danger</div>
        <div className="stack gap-8 mt-12">
          {SAFETY_LINES.map((l) => (
            <a key={l.id} href={l.href} className="crisis-row">
              <div className="grow">
                <div className="bold t-sm">{l.name}</div>
                <div className="t-xs t-faint">{l.sub}</div>
              </div>
              <span className="crisis-call"><Icon name="Phone" size={17} /></span>
            </a>
          ))}
        </div>
      </Card>

      <Sheet open={ask} onClose={() => setAsk(false)} title="Ask Dr. Marsh’s team for support?">
        <div className="stack gap-12">
          <p className="t-body t-soft">They’ll see that you asked, and will reach out as soon as they can — usually within two hours in working hours.</p>
          <Card flat tight className="t-sm t-soft"><Icon name="Lock" size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />Only the request is shared. Your journal and details stay private.</Card>
          <Btn kind="warm" size="lg" block onClick={notify} icon="Send">Yes, let them know</Btn>
          <Btn kind="ghost" block onClick={() => setAsk(false)}>Not right now</Btn>
        </div>
      </Sheet>
    </Screen>
  );
}
