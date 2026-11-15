import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import Chat from '../../components/Chat.jsx';
import { Btn, Card, Rise, Sheet, SectionTitle, Switch, Avatar, Pill, TopBar, toast } from '../../components/ui.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions, EMPTY } from '../../lib/store.js';
import { CIRCLE_HUES, SUPPORT_MESSAGES, CIRCLE_REPLIES } from '../../data/content.js';
import { haptic, timeAgo, pick } from '../../lib/util.js';
import { engine } from '../../audio/engine.js';

export function simulateReply(person, delay = [2600, 5200]) {
  const lines = CIRCLE_REPLIES[person.id] || CIRCLE_REPLIES.default;
  const d = delay[0] + Math.random() * (delay[1] - delay[0]);
  setTimeout(() => {
    const line = pick(lines);
    actions.sendMessage(`circle:${person.id}`, person.id, line, { r: { p: false, c: true } });
    if (!location.hash.includes(`/p/circle/${person.id}`)) toast(`${person.name}: ${line.slice(0, 48)}${line.length > 48 ? '…' : ''}`, { icon: 'Heart', ms: 4200 });
    haptic([14, 40, 14]);
  }, d);
}

function Constellation({ people, onPick }) {
  const R = 104;
  return (
    <div className="constellation" aria-hidden="false">
      <div className="const-rings"><i /><i /><i /></div>
      <svg className="const-lines" viewBox="-150 -150 300 300">
        {people.map((p, i) => {
          const a = (i / people.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <g key={p.id} className="const-orbit" style={{ animationDelay: '0s' }}>
              <motion.line x1="0" y1="0" x2={Math.cos(a) * R} y2={Math.sin(a) * R} stroke={p.hue} strokeWidth="1.5" strokeDasharray="3 5" opacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4 + i * 0.15, duration: 1 }} />
              <circle r="3.2" fill={p.hue} className="const-pulse" style={{ ['--tx']: `${Math.cos(a) * R}px`, ['--ty']: `${Math.sin(a) * R}px`, animationDelay: `${i * 0.8}s` }} />
            </g>
          );
        })}
      </svg>
      <div className="const-orbit-wrap">
        {people.map((p, i) => {
          const a = (i / people.length) * 360 - 90;
          return (
            <div key={p.id} className="const-slot" style={{ transform: `rotate(${a}deg) translateX(${R}px) rotate(${-a}deg)` }}>
              <motion.button className="const-person" whileTap={{ scale: 0.9 }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 200, damping: 14 }} onClick={() => onPick(p)}>
                <Avatar name={p.name} hue={p.hue} size={52} />
                <span className="t-xs bold">{p.name}</span>
              </motion.button>
            </div>
          );
        })}
      </div>
      <div className="const-center"><Koko size={88} mood="happy" glow={false} /></div>
    </div>
  );
}

const PERM = [
  { k: 'okay', icon: 'Check', t: 'That I’m okay', d: 'A simple “doing okay / having a harder day” note.' },
  { k: 'mood', icon: 'CloudSun', t: 'My “weather inside”', d: 'The check-ins you choose to make.' },
  { k: 'rhythm', icon: 'Moon', t: 'Sleep & rhythm summary', d: 'Only gentle words like “rested” — never numbers.' },
];

export default function Circle() {
  const circle = useStore((s) => s.circle);
  const threads = useStore((s) => s.threads);
  const [add, setAdd] = useState(false);
  const [ask, setAsk] = useState(false);
  const [perm, setPerm] = useState(null);
  const [sel, setSel] = useState([]);
  const [msg, setMsg] = useState(SUPPORT_MESSAGES[0]);

  const hello = (p) => {
    haptic(20);
    engine.chime(79, 0.04);
    actions.sendMessage(`circle:${p.id}`, 'alex', 'Thinking of you ❤️');
    actions.addFeedback('circle:call', 'Talking with someone close', 'yes');
    toast(`Sent a hello to ${p.name}`, { icon: 'Heart' });
    simulateReply(p);
  };
  const sendAsk = () => {
    sel.forEach((id) => {
      const p = circle.find((c) => c.id === id);
      actions.sendMessage(`circle:${id}`, 'alex', msg);
      simulateReply(p, [3200, 6000]);
    });
    haptic([20, 40, 20]);
    toast(`Sent to ${sel.length} ${sel.length === 1 ? 'person' : 'people'}`, { icon: 'Send' });
    setAsk(false);
    setSel([]);
  };

  return (
    <Screen bg="linear-gradient(180deg, color-mix(in srgb, var(--butter-100) 70%, var(--bg)), var(--bg) 460px)">
      <div className="row-flex between">
        <div>
          <div className="t-cap">{circle.length} of 5 people</div>
          <h1 className="h1" style={{ marginTop: 2 }}>My circle</h1>
        </div>
        <button className="icon-btn" aria-label="Add someone" onClick={() => circle.length < 5 ? setAdd(true) : toast('Your circle has room for five people.', { icon: 'Info' })}><Icon name="UserPlus" size={20} /></button>
      </div>
      <p className="t-sm t-soft mt-4" style={{ maxWidth: 290 }}>The few people you trust. They only see what you decide — and nobody is ever told you have a streak or a score.</p>

      <Constellation people={circle} onPick={(p) => go(`/p/circle/${p.id}`)} />

      <Rise i={2}>
        <Card tint="apricot" className="row-flex gap-12" onClick={() => setAsk(true)}>
          <div className="ico-dot lg" style={{ background: 'var(--glass-soft)', color: '#b0612f' }}><Icon name="HandHeart" size={24} /></div>
          <div className="grow">
            <div className="h3">Let someone know I’m struggling</div>
            <div className="t-sm t-soft">A gentle, pre-written message. Pick who gets it.</div>
          </div>
          <Icon name="ChevronRight" size={18} style={{ opacity: 0.5 }} />
        </Card>
      </Rise>

      <SectionTitle sub="Tap a name for the conversation">People you trust</SectionTitle>
      <div className="stack gap-12">
        {circle.map((p, i) => {
          const th = threads[`circle:${p.id}`] || [];
          const last = th[th.length - 1];
          const unread = th.filter((m) => m.r && !m.r.p).length;
          const sees = PERM.filter((x) => p.perms[x.k]);
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 120, damping: 18 }}>
              <Card className="person-card">
                <div className="row-flex gap-12">
                  <Avatar name={p.name} hue={p.hue} size={56} ring />
                  <div className="grow">
                    <div className="row-flex between"><div className="h3">{p.full}</div>{unread > 0 && <Pill tone="apricot">{unread} new</Pill>}</div>
                    <div className="t-sm t-soft">{p.rel} · {p.note}</div>
                  </div>
                </div>
                {last && <div className="t-xs t-faint mt-8 truncate"><Icon name="MessageCircle" size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {last.from === 'alex' ? 'You: ' : ''}{last.text} · {timeAgo(last.t)}</div>}
                <div className="row-flex gap-8 mt-12">
                  <Btn kind="primary" size="sm" icon="Heart" onClick={() => hello(p)}>Send a hello</Btn>
                  <Btn kind="soft" size="sm" icon="MessageCircle" onClick={() => go(`/p/circle/${p.id}`)}>Chat</Btn>
                  <div className="grow" />
                  <button className="icon-btn plain" style={{ width: 38, height: 38 }} aria-label={`What ${p.name} can see`} onClick={() => setPerm(p.id)}><Icon name="Eye" size={19} /></button>
                </div>
                <div className="tag-row mt-8">
                  <span className="t-xs t-faint" style={{ marginRight: 2 }}>Can see:</span>
                  {sees.map((x) => <Pill key={x.k} tone="mute">{x.t}</Pill>)}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* add person */}
      <AddPerson open={add} onClose={() => setAdd(false)} />

      {/* ask */}
      <Sheet open={ask} onClose={() => setAsk(false)} title="Let someone know">
        <p className="t-sm t-soft mb-12">Choose a message, then who should get it. You don’t have to explain.</p>
        <div className="stack gap-8">
          {SUPPORT_MESSAGES.map((m) => (
            <button key={m} className={`msg-opt ${msg === m ? 'on' : ''}`} onClick={() => { haptic(6); setMsg(m); }}>{m}{msg === m && <Icon name="Check" size={17} stroke={2.6} />}</button>
          ))}
        </div>
        <div className="t-cap mt-16 mb-8">Send to</div>
        <div className="row-flex gap-12 wrap">
          {circle.map((p) => {
            const on = sel.includes(p.id);
            return (
              <button key={p.id} className="pick-person" onClick={() => { haptic(6); setSel(on ? sel.filter((x) => x !== p.id) : [...sel, p.id]); }}>
                <div style={{ position: 'relative' }}>
                  <Avatar name={p.name} hue={p.hue} size={54} />
                  <AnimatePresence>{on && <motion.span className="pick-check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Icon name="Check" size={13} stroke={3} /></motion.span>}</AnimatePresence>
                </div>
                <span className="t-xs bold">{p.name}</span>
              </button>
            );
          })}
        </div>
        <Btn kind="warm" block size="lg" className="mt-20" icon="Send" disabled={!sel.length} onClick={sendAsk}>Send</Btn>
      </Sheet>

      {/* permissions */}
      <Sheet open={!!perm} onClose={() => setPerm(null)} title={perm ? `What ${circle.find((c) => c.id === perm)?.name} can see` : ''}>
        {perm && (
          <div className="stack gap-10">
            <p className="t-sm t-soft">You’re in control. Nothing is shared by default beyond “I’m okay”. Every change is logged.</p>
            {PERM.map((x) => {
              const p = circle.find((c) => c.id === perm);
              return (
                <Card key={x.k} tight className="row-flex gap-12">
                  <div className="ico-dot"><Icon name={x.icon} size={18} /></div>
                  <div className="grow"><div className="bold t-sm">{x.t}</div><div className="t-xs t-faint">{x.d}</div></div>
                  <Switch on={p.perms[x.k]} onChange={(v) => actions.setCirclePerm(p.id, x.k, v)} label={x.t} />
                </Card>
              );
            })}
            <Btn kind="ghost" block onClick={() => { actions.removeCircle(perm); setPerm(null); toast('Removed from your circle.', { icon: 'Check' }); }}>Remove from my circle</Btn>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}

function AddPerson({ open, onClose }) {
  const [name, setName] = useState('');
  const [rel, setRel] = useState('');
  const [hue, setHue] = useState(CIRCLE_HUES[3]);
  const circle = useStore((s) => s.circle);
  const submit = () => {
    if (!name.trim()) return;
    actions.addCircle({ name: name.trim().split(' ')[0], full: name.trim(), rel: rel.trim() || 'Someone I trust', hue, note: 'Added just now' });
    toast(`${name.trim().split(' ')[0]} is in your circle`, { icon: 'UserPlus' });
    setName(''); setRel('');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add someone you trust">
      <p className="t-sm t-soft mb-12">They’ll only hear from you if you choose to message them. You can change what they see at any time.</p>
      <div className="stack gap-10">
        <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" placeholder="Who are they to you? (optional)" value={rel} onChange={(e) => setRel(e.target.value)} />
        <div className="row-flex gap-10">
          {CIRCLE_HUES.map((h) => <button key={h} aria-label={`Colour ${h}`} onClick={() => setHue(h)} style={{ width: 34, height: 34, borderRadius: '50%', background: h, boxShadow: hue === h ? `0 0 0 3px var(--card-solid), 0 0 0 5px ${h}` : 'none', transition: 'box-shadow .3s' }} />)}
        </div>
        <Btn kind="primary" size="lg" block onClick={submit} disabled={!name.trim()} icon="UserPlus">Add to my circle</Btn>
        <div className="t-xs t-faint center">{circle.length}/5 people</div>
      </div>
    </Sheet>
  );
}

// ───────────────────────────────── chat with one person
export function CircleChat({ params }) {
  const p = useStore((s) => s.circle.find((c) => c.id === params.id));
  const messages = useStore((s) => s.threads[`circle:${params.id}`] || EMPTY);
  const [typing, setTyping] = useState(false);
  useEffect(() => { actions.markRead(`circle:${params.id}`, 'p'); }, [params.id, messages.length]);
  if (!p) return <Screen tabs={false}><TopBar onBack={() => back('/p/circle')} title="Circle" /></Screen>;
  const send = (t) => {
    actions.sendMessage(`circle:${p.id}`, 'alex', t);
    setTyping(true);
    setTimeout(() => setTyping(false), 2400);
    simulateReply(p, [2500, 3800]);
  };
  return (
    <Screen tabs={false} noScroll padTop={false} className="chat-screen">
      <div style={{ padding: 'calc(var(--safe-top) + 12px) 20px 0' }}>
        <TopBar onBack={() => back('/p/circle')} title={p.full} sub={p.rel} right={<Avatar name={p.name} hue={p.hue} size={44} ring />} />
      </div>
      <Chat messages={messages} me="alex" onSend={send} typing={typing} people={{ [p.id]: { name: p.name, hue: p.hue } }} quick={SUPPORT_MESSAGES.slice(0, 3)} placeholder={`Message ${p.name}…`} />
    </Screen>
  );
}
