import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon.jsx';
import { Avatar } from './ui.jsx';
import { fmtTime, fmtDay, haptic } from '../lib/util.js';

/**
 * Shared secure-chat UI (patient ↔ doctor and patient ↔ circle).
 * messages: [{id, from, text, t, kind?:'system'}]
 */
export default function Chat({ messages, me, onSend, quick = [], placeholder = 'Write a message…', typing, people = {}, footer, quickLabel }) {
  const [text, setText] = useState('');
  const end = useRef(null);
  const list = useRef(null);
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing]);

  const send = (t) => {
    const v = (t ?? text).trim();
    if (!v) return;
    haptic(10);
    onSend(v);
    setText('');
  };

  // group by day
  let lastDay = '';
  return (
    <div className="chat">
      <div className="chat-list" ref={list}>
        {messages.map((m, i) => {
          const day = fmtDay(m.t, { weekday: 'long', month: 'short', day: 'numeric' });
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.from === me;
          const prev = messages[i - 1];
          const first = !prev || prev.from !== m.from || m.t - prev.t > 5 * 60000 || showDay;
          const who = people[m.from];
          return (
            <div key={m.id}>
              {showDay && <div className="chat-day">{day}</div>}
              {m.kind === 'system' ? (
                <motion.div className="chat-system" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <Icon name="ShieldCheck" size={13} /> {m.text}
                </motion.div>
              ) : (
                <motion.div
                  className={`msg ${mine ? 'mine' : 'theirs'}`}
                  initial={{ opacity: 0, y: 16, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                  style={{ marginTop: first ? 10 : 3 }}
                >
                  {!mine && first && who && <Avatar name={who.name} hue={who.hue} size={28} style={{ boxShadow: 'none', alignSelf: 'flex-end' }} />}
                  {!mine && !first && <div style={{ width: 28, flex: 'none' }} />}
                  <div className="bubble-msg">
                    {m.text}
                    <span className="msg-time">{fmtTime(m.t)}</span>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
        <AnimatePresence>
          {typing && (
            <motion.div className="msg theirs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 10 }}>
              <div className="bubble-msg typing"><i /><i /><i /></div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={end} style={{ height: 6 }} />
      </div>

      {quick.length > 0 && (
        <div className="quick-row">
          {quickLabel && <span className="t-cap" style={{ alignSelf: 'center', flex: 'none' }}>{quickLabel}</span>}
          {quick.map((q) => (
            <button key={q} className="quick-chip" onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}
      {footer}
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label="Message" />
        <motion.button type="submit" className="send-btn" whileTap={{ scale: 0.85 }} disabled={!text.trim()} animate={{ scale: text.trim() ? 1 : 0.9, opacity: text.trim() ? 1 : 0.5 }}>
          <Icon name="Send" size={19} />
        </motion.button>
      </form>
    </div>
  );
}
