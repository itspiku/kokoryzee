import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValue } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Scenery, { sceneFor } from '../../components/Scenery.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, SectionTitle, Pill, Avatar, toast, Sheet } from '../../components/ui.jsx';
import { Spark } from '../../components/charts.jsx';
import { go } from '../../lib/nav.js';
import { useStore, actions, useNow, responseStats, EMPTY } from '../../lib/store.js';
import { usePatientData } from '../../engine/useData.js';
import { patientCards, suggest, weekInWords, moodFromCheckins, valueText } from '../../engine/insights.js';
import { greeting, partOfDay, fmtDay, fmtTime, haptic, timeAgo } from '../../lib/util.js';
import { WEATHER, QUOTES, DOCTOR, SMALL_STEPS } from '../../data/content.js';

const toneColor = { steady: 'var(--sage-500)', soft: '#e0a35c', bright: '#e68d57' };

export default function Home() {
  const ref = useRef(null);
  const { scrollY } = useScroll({ container: ref });
  const now = useNow(60000);
  const d = new Date(now);
  const pod = partOfDay(d);
  const prefs = useStore((s) => s.prefs);
  const realScene = sceneFor(pod);
  const timeScene = prefs.scene !== 'auto' ? prefs.scene : prefs.theme === 'day' && (realScene === 'night' || realScene === 'evening') ? 'afternoon' : prefs.theme === 'evening' && (realScene === 'morning' || realScene === 'afternoon') ? 'evening' : realScene;
  const light = timeScene === 'evening' || timeScene === 'night';

  const { series, analysis } = usePatientData('alex');
  const feedback = useStore((s) => s.feedback);
  const log = useStore((s) => s.suggestionLog);
  const checkins = useStore((s) => s.checkins);
  const plan = useStore((s) => s.carePlans.alex);
  const letters = useStore((s) => s.letters);
  const threads = useStore((s) => s.threads['dr:alex'] || EMPTY);
  const appts = useStore((s) => s.appts);
  const stats = useMemo(() => responseStats(feedback), [feedback]);
  const mood = moodFromCheckins(checkins, 2);
  const cards = useMemo(() => patientCards(series, analysis), [series, analysis]);

  const suggestions = useMemo(
    () => suggest({ now: d, analysis, stats, log, approved: plan.approved, mood, hasLetter: letters.length > 0 }),
    // eslint-disable-next-line
    [analysis, stats, log.length, plan, Math.floor(now / 3600000), letters.length]
  );
  const top = suggestions[0];

  const quote = QUOTES[Math.floor(now / 86400000) % QUOTES.length];
  const unread = threads.filter((m) => m.r && !m.r.p && m.from === 'marsh').length;
  const nextAppt = appts.filter((a) => a.patientId === 'alex' && a.t > now && a.status !== 'done').sort((a, b) => a.t - b.t)[0];

  const todayCheck = checkins.find((c) => new Date(c.t).toDateString() === d.toDateString());
  const [kokoMood, setKokoMood] = useState('calm');
  const [sheet, setSheet] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const pickWeather = (w) => {
    haptic(18);
    actions.addCheckin(w.id, w.mood);
    setKokoMood(w.mood >= 4 ? 'happy' : w.mood <= 2 ? 'caring' : 'calm');
    toast(w.mood <= 2 ? 'Thank you for telling me. I’m here.' : 'Noted. That’s all for today.', { icon: 'Heart' });
    setTimeout(() => setKokoMood('calm'), 4000);
  };

  const accept = () => {
    actions.logSuggestion(top.id, 'accepted');
    go(top.to);
  };
  const decline = () => {
    actions.logSuggestion(top.id, 'declined');
    setDismissed(true);
    setTimeout(() => setDismissed(false), 50);
  };

  const apptWhen = nextAppt ? `${fmtDay(nextAppt.t, { weekday: 'long' })} · ${fmtTime(nextAppt.t)}` : null;
  const inDays = nextAppt ? Math.round((nextAppt.t - now) / 86400000) : null;

  return (
    <Screen ref={ref} flush padTop={false} className="home-scroll">
      {/* ── living hero ── */}
      <div style={{ position: 'relative', height: 330, marginBottom: -34 }}>
        <Scenery
          time={timeScene}
          height={330}
          scrollY={scrollY}
          koko={<Koko size={112} mood={kokoMood} />}
        />
        <div style={{ position: 'absolute', inset: 0, padding: 'calc(var(--safe-top) + 14px) 22px 0', color: light ? '#fdf8ec' : 'var(--ink)' }}>
          <div className="row-flex between">
            <Pill tone={light ? '' : ''} className="glass-pill" icon={pod === 'night' || pod === 'evening' ? 'Moon' : 'Sun'}>
              {fmtDay(now, { weekday: 'long', month: 'short', day: 'numeric' })}
            </Pill>
            <button className="icon-btn" aria-label="Profile and settings" onClick={() => go('/p/me')} style={light ? { background: 'rgba(255,255,255,.18)', borderColor: 'rgba(255,255,255,.25)' } : undefined}>
              <Avatar name="Alex Morgan" size={36} hue="#e68d57" style={{ boxShadow: 'none' }} />
            </button>
          </div>
          <Rise i={0} className="mt-16">
            <h1 className="display" style={{ maxWidth: 240, textShadow: light ? '0 2px 20px rgba(0,0,0,.25)' : 'none' }}>
              {greeting(d, 'Alex').replace(', ', ',\n').split('\n').map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}
            </h1>
          </Rise>
          <Rise i={1}>
            <p className="serif italic" style={{ marginTop: 10, maxWidth: 210, fontSize: 16.5, lineHeight: 1.35, opacity: 0.88, fontWeight: 400 }}>
              “{quote}”
            </p>
          </Rise>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* ── one gentle suggestion ── */}
        <AnimatePresence mode="wait">
          {top && !dismissed ? (
            <motion.div
              key={top.id}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -60, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 160, damping: 20 }}
            >
              <Card tint={top.tint} className="suggest-card">
                <div className="row-flex gap-12" style={{ alignItems: 'flex-start' }}>
                  <motion.div
                    className="suggest-ico"
                    animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.06, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Icon name={top.icon} size={26} />
                  </motion.div>
                  <div className="grow">
                    <div className="t-cap" style={{ color: 'var(--ink-2)' }}>One gentle idea</div>
                    <div className="h2" style={{ marginTop: 3 }}>{top.title}</div>
                    <p className="t-sm t-soft mt-4">{top.body}</p>
                    <p className="t-xs t-faint mt-8" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Icon name="Sparkles" size={13} /> {top.reason}
                    </p>
                  </div>
                </div>
                <div className="row-flex gap-8 mt-16">
                  <Btn kind="primary" size="sm" onClick={accept} iconRight="ArrowRight">{top.cta}</Btn>
                  <Btn kind="ghost" size="sm" onClick={decline}>Not now</Btn>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card tint="sage" className="row-flex gap-12">
                <Icon name="Leaf" size={22} />
                <div>
                  <div className="bold">Nothing else for now.</div>
                  <div className="t-sm t-soft">That’s okay — quiet is allowed. I’ll be here.</div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── check-in ── */}
        <Rise i={3} className="mt-20">
          <Card>
            <div className="row-flex between">
              <div>
                <div className="h3">How’s the weather inside?</div>
                <div className="t-xs t-faint">Totally optional · one tap</div>
              </div>
              {todayCheck && <Pill icon="Check">Noted today</Pill>}
            </div>
            <div className="weather-row">
              {WEATHER.map((w) => {
                const on = todayCheck?.weather === w.id;
                return (
                  <motion.button
                    key={w.id}
                    className={`weather ${on ? 'on' : ''}`}
                    onClick={() => pickWeather(w)}
                    whileTap={{ scale: 0.88 }}
                    animate={on ? { y: -4 } : { y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                    aria-label={w.label}
                    aria-pressed={on}
                  >
                    <motion.span
                      className="weather-ico"
                      style={{ color: w.color, background: on ? `color-mix(in srgb, ${w.color} 20%, transparent)` : 'transparent' }}
                      animate={on ? { scale: [1, 1.25, 1.1] } : { scale: 1 }}
                    >
                      <Icon name={w.icon} size={on ? 30 : 27} stroke={1.8} />
                    </motion.span>
                    <span>{w.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </Rise>

        {unread > 0 && (
          <Rise i={4} className="mt-16">
            <Card tint="sky" onClick={() => go('/p/messages')} className="row-flex gap-12">
              <Avatar name={DOCTOR.name} hue={DOCTOR.hue} size={44} />
              <div className="grow">
                <div className="bold">{DOCTOR.short} sent you a message</div>
                <div className="t-sm t-soft truncate">{threads.filter((m) => m.from === 'marsh').slice(-1)[0]?.text}</div>
              </div>
              <Pill tone="apricot">{unread} new</Pill>
            </Card>
          </Rise>
        )}

        {/* ── rhythm ── */}
        <SectionTitle action="All patterns" onAction={() => go('/p/insights')}>
          Your rhythm this week
        </SectionTitle>
        <p className="t-sm t-soft" style={{ margin: '-6px 2px 10px' }}>{weekInWords(analysis)}</p>
        <div className="scroll-x">
          {cards.slice(0, 4).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 120, damping: 18 }}
              style={{ width: 188 }}
            >
              <Card className="rhythm-card" onClick={() => go(`/p/insights?focus=${c.id}`)} style={{ height: '100%' }}>
                <div className="row-flex between">
                  <div className="ico-dot" style={{ background: `color-mix(in srgb, ${toneColor[c.tone]} 22%, transparent)`, color: toneColor[c.tone] }}>
                    <Icon name={c.icon} size={19} />
                  </div>
                  <Pill tone={c.tone === 'soft' ? 'amber' : c.tone === 'bright' ? 'apricot' : ''}>
                    {c.tone === 'soft' ? 'Gentle shift' : c.tone === 'bright' ? 'Brighter' : 'Steady'}
                  </Pill>
                </div>
                <div className="serif mt-12" style={{ fontSize: 17, lineHeight: 1.25, minHeight: 64 }}>{c.headline}</div>
                <div style={{ marginTop: 6 }}>
                  <Spark values={c.series} band={c.band} width={150} height={34} color={toneColor[c.tone]} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── next appointment ── */}
        {nextAppt && (
          <Rise i={6} className="mt-4">
            <Card className="appt-card">
              <div className="row-flex gap-12">
                <Avatar name={DOCTOR.name} hue={DOCTOR.hue} size={50} ring />
                <div className="grow">
                  <div className="t-cap">Next visit · {inDays <= 0 ? 'today' : inDays === 1 ? 'tomorrow' : `in ${inDays} days`}</div>
                  <div className="h3" style={{ marginTop: 2 }}>{nextAppt.kind} with {DOCTOR.short}</div>
                  <div className="t-sm t-soft">{apptWhen} · {nextAppt.mins} min · {nextAppt.mode === 'video' ? 'video' : 'in clinic'}</div>
                </div>
              </div>
              <div className="row-flex gap-8 mt-16">
                <Btn kind="soft" size="sm" icon="FileText" onClick={() => setSheet(true)}>Prepare</Btn>
                <Btn kind="soft" size="sm" icon="MessageCircle" onClick={() => go('/p/messages')}>Message</Btn>
                {nextAppt.mode === 'video' && <Btn kind="primary" size="sm" icon="Video" onClick={() => go('/p/video')}>Waiting room</Btn>}
              </div>
            </Card>
          </Rise>
        )}

        {/* ── letter ── */}
        {letters.length > 0 && (
          <Rise i={7} className="mt-16">
            <Card tint="apricot" onClick={() => go('/p/letters')} className="row-flex gap-12">
              <div className="ico-dot lg" style={{ background: 'var(--glass-soft)', color: '#b0612f' }}><Icon name="Mail" size={22} /></div>
              <div className="grow">
                <div className="bold">A letter from a better day</div>
                <div className="t-sm t-soft">Written by you · {timeAgo(letters[letters.length - 1].t)}. Offered only when you’d like.</div>
              </div>
              <Icon name="Lock" size={16} style={{ opacity: 0.5 }} />
            </Card>
          </Rise>
        )}

        {/* ── small ways ── */}
        <SectionTitle action="Going out" onAction={() => go('/p/going-out')} sub="No targets. Just a nudge outside.">
          Small things that count
        </SectionTitle>
        <div className="scroll-x">
          {SMALL_STEPS.map((s, i) => (
            <Card key={s.id} tight onClick={() => go('/p/going-out')} style={{ width: 150 }}>
              <div className="ico-dot"><Icon name={s.icon} size={19} /></div>
              <div className="t-sm bold mt-8" style={{ lineHeight: 1.3 }}>{s.text}</div>
            </Card>
          ))}
        </div>

        <Rise i={9} className="mt-16">
          <button className="privacy-note" onClick={() => go('/p/privacy')}>
            <Icon name="ShieldCheck" size={18} />
            <span>Only you and {DOCTOR.short} can see your summaries. <b>Manage what’s shared</b></span>
          </button>
        </Rise>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Before your visit">
        <p className="t-sm t-soft mb-12">This is the one-page summary {DOCTOR.short} will see. You can change what’s shared in Privacy.</p>
        <div className="stack gap-8">
          {[
            ['Moon', 'Sleep & daily rhythm', 'Weekly summary, no raw data'],
            ['HeartPulse', 'Heart & calm', 'Resting heart and recovery trends'],
            ['Footprints', 'Movement', 'Gentle daily totals'],
            ['Smile', 'Check-ins', 'Your “weather inside” answers'],
            ['PenLine', 'Journal', 'Never shared unless you choose an entry'],
          ].map(([ic, t, s]) => (
            <div key={t} className="row-flex gap-12 card tight flat">
              <div className="ico-dot"><Icon name={ic} size={18} /></div>
              <div className="grow"><div className="bold t-sm">{t}</div><div className="t-xs t-faint">{s}</div></div>
            </div>
          ))}
        </div>
        <div className="row-flex gap-8 mt-16">
          <Btn kind="primary" block onClick={() => { setSheet(false); go('/p/privacy'); }}>Review sharing</Btn>
        </div>
      </Sheet>
    </Screen>
  );
}
