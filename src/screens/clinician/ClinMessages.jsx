import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Chat from '../../components/Chat.jsx';
import VideoCall from '../../components/VideoCall.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, Pill, Avatar, Sheet, TopBar, Empty } from '../../components/ui.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions, EMPTY } from '../../lib/store.js';
import { getPatientData } from '../../engine/useData.js';
import { buildBrief, valueText } from '../../engine/insights.js';
import { responseStats } from '../../lib/store.js';
import { PATIENTS, DOCTOR, CLINICIAN_TEMPLATES, patientById } from '../../data/content.js';
import { timeAgo, haptic } from '../../lib/util.js';
import { STATUS, patientStatus, StatusPill } from './common.jsx';

export default function ClinMessages() {
  const threads = useStore((s) => s.threads);
  const alerts = useStore((s) => s.alerts);
  const rows = useMemo(
    () =>
      PATIENTS.map((p) => {
        const l = threads[`dr:${p.id}`] || [];
        const last = [...l].reverse().find((m) => m.kind !== 'system') || l[l.length - 1];
        const unread = l.filter((m) => m.r && !m.r.c).length;
        return { p, last, unread };
      }).sort((a, b) => b.unread - a.unread || (b.last?.t || 0) - (a.last?.t || 0)),
    [threads]
  );
  return (
    <Screen>
      <div className="t-cap">{rows.reduce((n, r) => n + r.unread, 0)} unread</div>
      <h1 className="h1" style={{ marginTop: 2 }}>Messages</h1>
      <p className="t-sm t-soft mt-8">Secure, end-to-end encrypted. Patients are told replies take up to one working day.</p>
      <div className="stack gap-10 mt-16">
        {rows.map((r, i) => (
          <motion.div key={r.p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06, type: 'spring', stiffness: 130, damping: 18 }}>
            <Card onClick={() => go(`/c/messages/${r.p.id}`)} className="thread-row">
              <div style={{ position: 'relative' }}>
                <Avatar name={r.p.name} hue={r.p.hue} size={50} />
                {r.unread > 0 && <span className="unread-dot">{r.unread}</span>}
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row-flex between"><div className={r.unread ? 'h3' : 'bold'}>{r.p.name}</div><span className="t-xs t-faint">{r.last ? timeAgo(r.last.t) : ''}</span></div>
                <div className={`t-sm truncate ${r.unread ? '' : 't-soft'}`} style={r.unread ? { fontWeight: 600 } : undefined}>{r.last ? `${r.last.from === 'marsh' ? 'You: ' : ''}${r.last.text}` : 'No messages yet'}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </Screen>
  );
}

export function ClinThread({ params }) {
  const p = patientById(params.pid);
  const thread = `dr:${params.pid}`;
  const messages = useStore((s) => s.threads[thread] || EMPTY);
  const alerts = useStore((s) => s.alerts);
  const [tpl, setTpl] = useState(false);
  useEffect(() => { actions.markRead(thread, 'c'); }, [thread, messages.length]);
  if (!p) return <Screen tabs={false}><TopBar backTo="/c/messages" title="Messages" /><Empty title="Not found" /></Screen>;
  const open = alerts.find((a) => a.patientId === p.id && a.status === 'new' && a.level === 'urgent');
  const send = (t) => actions.sendMessage(thread, 'marsh', t);
  return (
    <Screen tabs={false} noScroll padTop={false} className="chat-screen">
      <div style={{ padding: 'calc(var(--safe-top) + 12px) 20px 0' }}>
        <TopBar
          backTo="/c/messages"
          title={p.name}
          sub={p.phase}
          right={
            <>
              <button className="icon-btn" aria-label="Open record" onClick={() => go(`/c/patient/${p.id}`)}><Icon name="FileText" size={19} /></button>
              <button className="icon-btn" aria-label="Video visit" onClick={() => go(`/c/video?patient=${p.id}`)}><Icon name="Video" size={19} /></button>
            </>
          }
        />
        {open && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card tint="apricot" tight className="row-flex gap-10 mb-8" onClick={() => go(`/c/alerts/${open.id}`)}>
              <Icon name="HandHeart" size={18} style={{ color: '#b0612f' }} />
              <div className="grow t-sm"><b>{p.name.split(' ')[0]} asked for support</b> · {timeAgo(open.createdAt)}</div>
              <Icon name="ChevronRight" size={16} style={{ opacity: 0.5 }} />
            </Card>
          </motion.div>
        )}
      </div>
      <Chat
        messages={messages}
        me="marsh"
        onSend={send}
        people={{ [p.id]: { name: p.name, hue: p.hue } }}
        quick={['Thinking of you — let’s talk soon.', 'Thanks for telling me.']}
        placeholder={`Reply to ${p.name.split(' ')[0]}…`}
        footer={<div style={{ padding: '0 20px 2px' }}><button className="t-xs bold" style={{ color: 'var(--primary)' }} onClick={() => setTpl(true)}><Icon name="ScrollText" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Message templates</button></div>}
      />
      <Sheet open={tpl} onClose={() => setTpl(false)} title="Templates">
        <div className="stack gap-8">
          {CLINICIAN_TEMPLATES.map((t) => <button key={t} className="msg-opt" onClick={() => { send(t); setTpl(false); haptic(10); }}>{t}</button>)}
        </div>
      </Sheet>
    </Screen>
  );
}

