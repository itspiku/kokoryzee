import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Chat from '../../components/Chat.jsx';
import VideoCall from '../../components/VideoCall.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Avatar, Pill, Sheet, Segmented, TopBar, toast, SectionTitle } from '../../components/ui.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions, useNow, EMPTY } from '../../lib/store.js';
import { DOCTOR, COMMON_QUESTIONS } from '../../data/content.js';
import { getPatientData } from '../../engine/useData.js';
import { fmtDay, fmtTime, haptic, startOfDay, addDays, HOUR } from '../../lib/util.js';

export default function Messages({ query }) {
  const [tab, setTab] = useState(query?.tab === 'visits' ? 'visits' : 'chat');
  const messages = useStore((s) => s.threads['dr:alex'] || EMPTY);
  const appts = useStore((s) => s.appts);
  const now = useNow(30000);
  const [typing, setTyping] = useState(false);
  const [req, setReq] = useState(false);

  useEffect(() => { actions.markRead('dr:alex', 'p'); }, [messages.length]);

  const send = (text) => {
    actions.sendMessage('dr:alex', 'alex', text);
    const lastAuto = [...messages].reverse().find((m) => m.kind === 'system' && m.auto);
    if (!lastAuto || Date.now() - lastAuto.t > 6 * HOUR) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        actions.sendMessage('dr:alex', 'system', `Delivered securely to ${DOCTOR.short}’s team. Replies usually come within one working day. If it feels urgent, tap Support.`, { kind: 'system', auto: true, r: { p: true, c: true } });
      }, 1400);
    }
  };

  const mine = appts.filter((a) => a.patientId === 'alex').sort((a, b) => a.t - b.t);
  const upcoming = mine.filter((a) => a.t > now - 2 * HOUR && a.status !== 'done');
  const past = mine.filter((a) => a.status === 'done' || a.t < now - 2 * HOUR).reverse();

  const slots = [1, 2, 3, 5].map((d, i) => addDays(startOfDay(new Date()), d).getTime() + [10, 14, 9, 16][i] * HOUR);

  return (
    <Screen tabs={false} noScroll padTop={false} className="chat-screen">
      <div style={{ padding: 'calc(var(--safe-top) + 12px) 20px 0' }}>
        <TopBar backTo="/p/home" title={tab === 'chat' ? DOCTOR.name : 'Visits'} sub={tab === 'chat' ? 'Psychiatrist · TMS lead' : 'Appointments'} right={<Avatar name={DOCTOR.name} hue={DOCTOR.hue} size={44} ring />} />
        <div className="row-flex" style={{ justifyContent: 'center', marginBottom: 6 }}>
          <Segmented id="mt" small value={tab} onChange={setTab} options={[{ value: 'chat', label: 'Messages', icon: 'MessageCircle' }, { value: 'visits', label: 'Visits', icon: 'CalendarDays' }]} />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === 'chat' ? (
          <motion.div key="chat" className="chat" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="secure-strip"><Icon name="Lock" size={13} /> End-to-end encrypted · only you and {DOCTOR.short}’s care team</div>
            <Chat messages={messages} me="alex" onSend={send} typing={typing} people={{ marsh: { name: DOCTOR.name, hue: DOCTOR.hue } }} quick={COMMON_QUESTIONS} quickLabel="Common" placeholder={`Message ${DOCTOR.short}…`} />
          </motion.div>
        ) : (
          <motion.div key="visits" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ flex: 1, overflowY: 'auto', padding: '8px 20px calc(var(--safe-bottom) + 28px)' }}>
            {upcoming.map((a) => {
              const soon = a.t - now < 15 * 60000;
              return (
                <Card key={a.id} tint={a.status === 'requested' ? 'butter' : 'sky'} className="mb-12">
                  <div className="row-flex between"><Pill icon={a.mode === 'video' ? 'Video' : 'MapPin'}>{a.mode === 'video' ? 'Video visit' : 'In clinic'}</Pill>{a.status === 'requested' && <Pill tone="amber">Requested</Pill>}</div>
                  <div className="h2 mt-12">{a.kind}</div>
                  <div className="t-body t-soft mt-4">{fmtDay(a.t, { weekday: 'long', month: 'long', day: 'numeric' })} · {fmtTime(a.t)} · {a.mins} min</div>
                  <div className="row-flex gap-8 mt-16 wrap">
                    {a.mode === 'video' && <Btn kind="primary" size="sm" icon="Video" onClick={() => go('/p/video')}>Waiting room</Btn>}
                    <Btn kind="soft" size="sm" icon="FileText" onClick={() => go('/p/privacy')}>What’s shared</Btn>
                  </div>
                </Card>
              );
            })}
            <Btn kind="line" block icon="CalendarPlus" onClick={() => setReq(true)} style={{ marginBottom: 10 }}>Request another time</Btn>
            <SectionTitle sub="Recent">Past visits</SectionTitle>
            <div className="stack gap-8">
              {past.slice(0, 4).map((a) => (
                <Card key={a.id} tight className="row-flex gap-12"><div className="ico-dot"><Icon name="CheckCheck" size={18} /></div><div className="grow"><div className="bold t-sm">{a.kind}</div><div className="t-xs t-faint">{fmtDay(a.t)} · {fmtTime(a.t)}</div></div></Card>
              ))}
              <Card tight flat className="t-sm t-soft">TMS sessions so far: <b>{getPatientData('alex').tms.filter((s) => s.done).length} of 30</b> — nicely on track.</Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={req} onClose={() => setReq(false)} title="Request another time">
        <p className="t-sm t-soft mb-12">Pick what suits you. {DOCTOR.short}’s team will confirm — no need to explain.</p>
        <div className="stack gap-8">
          {slots.map((t) => (
            <Card key={t} tight onClick={() => { actions.bookAppt('alex', t, 'Check-in call', 'video'); actions.sendMessage('dr:alex', 'system', `Alex requested a visit on ${fmtDay(t, { weekday: 'long', month: 'short', day: 'numeric' })} at ${fmtTime(t)}.`, { kind: 'system', r: { p: true, c: false } }); toast('Requested — they’ll confirm soon', { icon: 'CalendarCheck' }); setReq(false); }} className="row-flex gap-12">
              <div className="ico-dot"><Icon name="Calendar" size={18} /></div>
              <div className="grow"><div className="bold t-sm">{fmtDay(t, { weekday: 'long', month: 'short', day: 'numeric' })}</div><div className="t-xs t-faint">{fmtTime(t)} · video</div></div>
              <Icon name="ChevronRight" size={16} style={{ opacity: 0.4 }} />
            </Card>
          ))}
        </div>
      </Sheet>
    </Screen>
  );
}

export function PatientVideo() {
  return (
    <Screen tabs={false} noScroll theme="evening" bg="linear-gradient(180deg,#14282b,#10211f 60%,#0f1b17)" padTop={false}>
      <VideoCall other={{ name: DOCTOR.name, hue: DOCTOR.hue }} self="You" selfIsPatient onEnd={() => back('/p/messages?tab=visits')} />
    </Screen>
  );
}
