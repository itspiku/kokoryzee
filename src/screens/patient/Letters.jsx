import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, Segmented, Sheet, TopBar, Pill, Confirm, toast } from '../../components/ui.jsx';
import { useRecorder, LiveBars, VoicePlayer } from '../../components/Voice.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions } from '../../lib/store.js';
import { putBlob, getBlob, compressImage } from '../../lib/idb.js';
import { fmtDay, fmtClock, haptic, uid, timeAgo } from '../../lib/util.js';
import { engine } from '../../audio/engine.js';

const OFFER = {
  heavy: { icon: 'CloudRain', t: 'When things feel heavy', d: 'Offered gently if my check-ins turn rainy.' },
  ask: { icon: 'Lock', t: 'Only when I ask', d: 'Stays locked until I open it myself.' },
  date: { icon: 'CalendarDays', t: 'On a date I choose', d: 'Appears on that day.' },
  appt: { icon: 'Stethoscope', t: 'After my next appointment', d: 'A reminder of how far I’ve come.' },
};

function usePhotos(ids) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    let alive = true;
    const made = [];
    Promise.all((ids || []).map((id) => getBlob(id))).then((bs) => {
      if (!alive) return;
      const us = bs.filter(Boolean).map((b) => { const u = URL.createObjectURL(b); made.push(u); return u; });
      setUrls(us);
    });
    return () => { alive = false; made.forEach((u) => URL.revokeObjectURL(u)); };
  }, [(ids || []).join(',')]);
  return urls;
}

export default function Letters() {
  const letters = useStore((s) => s.letters);
  return (
    <Screen tabs={false} bg="linear-gradient(180deg, color-mix(in srgb, var(--apricot-200) 60%, var(--bg)), var(--bg) 420px)">
      <TopBar backTo="/p/me" sub="Letters to future me" title="From a better day" right={<button className="icon-btn" onClick={() => go('/p/letters/new')} aria-label="Write a letter"><Icon name="Plus" size={20} /></button>} />
      <Rise>
        <p className="t-body t-soft" style={{ maxWidth: 310 }}>Write or record something while you’re feeling well — for the day you need to hear it. Kokoryze keeps it safe and only offers it the way you choose.</p>
      </Rise>
      <div className="stack gap-14" style={{ gap: 14, marginTop: 18 }}>
        {letters.length === 0 && <Card flat className="center t-soft">No letters yet. Your future self would love one.</Card>}
        {letters.map((l, i) => (
          <motion.div key={l.id} initial={{ opacity: 0, y: 20, rotate: i % 2 ? 1 : -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 120, damping: 16 }}>
            <Card className="letter-card" onClick={() => go(`/p/letters/${l.id}`)}>
              <div className="envelope"><Icon name="Mail" size={22} /></div>
              <div className="grow">
                <div className="h3">{l.title || 'A letter'}</div>
                <div className="t-xs t-faint">Written {fmtDay(l.t, { month: 'long', day: 'numeric' })} · {OFFER[l.offer]?.t.toLowerCase()}</div>
                <div className="tag-row mt-8">
                  {l.audioId && <Pill icon="Mic" tone="apricot">Voice</Pill>}
                  {l.text && <Pill icon="PenLine" tone="mute">Written</Pill>}
                  {l.photos?.length > 0 && <Pill icon="Image" tone="sky">{l.photos.length} photo{l.photos.length > 1 ? 's' : ''}</Pill>}
                </div>
              </div>
              <Icon name="ChevronRight" size={18} style={{ opacity: 0.4 }} />
            </Card>
          </motion.div>
        ))}
      </div>
      <Btn kind="primary" size="lg" block className="mt-24" icon="PenLine" onClick={() => go('/p/letters/new')}>Write a new letter</Btn>
    </Screen>
  );
}

// ───────────────────────────── compose
export function LetterNew() {
  const [mode, setMode] = useState('write');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('Dear me,\n\nIf you’re reading this, it’s probably because things feel heavy. I’m writing on a better day, so please trust me: ');
  const [photos, setPhotos] = useState([]); // {id,url}
  const [offer, setOffer] = useState('heavy');
  const [date, setDate] = useState('');
  const [clip, setClip] = useState(null);
  const [saved, setSaved] = useState(false);
  const rec = useRecorder();
  const fileRef = useRef(null);

  const addPhoto = async (e) => {
    const files = [...(e.target.files || [])].slice(0, 4 - photos.length);
    for (const f of files) {
      try {
        const b = await compressImage(f);
        const id = uid('ph');
        await putBlob(id, b);
        setPhotos((p) => [...p, { id, url: URL.createObjectURL(b) }]);
      } catch {}
    }
    e.target.value = '';
  };
  const toggleRec = async () => {
    haptic(24);
    if (rec.state === 'recording') {
      const r = await rec.stop();
      if (r && r.blob.size > 500) setClip(r);
    } else { setClip(null); await rec.start(); }
  };
  const save = async () => {
    let audioId = null;
    if (clip) { audioId = uid('aud'); await putBlob(audioId, clip.blob); }
    actions.addLetter({ title: title || 'A letter from a better day', text: mode === 'voice' && !text.trim() ? '' : text, audioId, photos: photos.map((p) => p.id), offer, date: date || null, duration: clip?.duration });
    engine.chime(81, 0.06);
    haptic([20, 60, 20]);
    setSaved(true);
    setTimeout(() => back('/p/letters'), 2000);
  };
  const can = (text.trim().length > 40 || clip) && !(rec.state === 'recording');

  return (
    <Screen tabs={false}>
      <TopBar onBack={() => back('/p/letters')} sub="A message from a better day" title="New letter" right={<Btn kind="primary" size="sm" onClick={save} disabled={!can}>Seal it</Btn>} />
      <div className="row-flex" style={{ justifyContent: 'center', margin: '4px 0 14px' }}>
        <Segmented id="lm" small value={mode} onChange={setMode} options={[{ value: 'write', label: 'Write', icon: 'PenLine' }, { value: 'voice', label: 'Voice', icon: 'Mic' }]} />
      </div>
      <input className="field" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 10 }} />

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'write' ? (
          <motion.div key="w" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <textarea className="field letter-paper" value={text} onChange={(e) => setText(e.target.value)} placeholder="Say what you’d want to hear…" />
          </motion.div>
        ) : (
          <motion.div key="v" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="center stack" style={{ alignItems: 'center' }}>
            <p className="t-sm t-soft" style={{ maxWidth: 290 }}>Your own voice can say “you’re okay” more truthfully than anything. Speak to yourself as you would to a dear friend.</p>
            <div style={{ width: '100%', margin: '20px 0 6px', minHeight: 70 }}>
              {rec.state === 'recording' ? <LiveBars bars={rec.bars} /> : <div className="t-sm t-faint" style={{ height: 70, display: 'grid', placeItems: 'center' }}>{clip ? 'Recorded ✓' : rec.state === 'unavailable' ? 'Microphone isn’t available here — write it instead.' : 'Tap to start'}</div>}
            </div>
            <div className="serif t-num" style={{ fontSize: 30 }}>{rec.state === 'recording' ? fmtClock(rec.seconds) : clip ? fmtClock(clip.duration) : '0:00'}</div>
            <motion.button className={`rec-btn ${rec.state === 'recording' ? 'on' : ''}`} onClick={toggleRec} whileTap={{ scale: 0.92 }}>
              <span className="rec-ring" />
              <Icon name={rec.state === 'recording' ? 'Square' : 'Mic'} size={30} />
            </motion.button>
            {clip && <div style={{ width: '100%' }} className="mt-16"><ClipPlay clip={clip} /></div>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="t-cap mt-24 mb-8">Photos that make you smile (optional)</div>
      <div className="photo-row">
        {photos.map((p) => (
          <motion.div key={p.id} className="photo" initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <img src={p.url} alt="" />
            <button aria-label="Remove photo" onClick={() => setPhotos(photos.filter((x) => x.id !== p.id))}><Icon name="X" size={13} stroke={3} /></button>
          </motion.div>
        ))}
        {photos.length < 4 && <button className="photo add" onClick={() => fileRef.current?.click()} aria-label="Add photo"><Icon name="ImagePlus" size={24} /></button>}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={addPhoto} />
      </div>

      <div className="t-cap mt-24 mb-8">When can it be offered again?</div>
      <div className="stack gap-8">
        {Object.entries(OFFER).map(([k, o]) => (
          <button key={k} className={`msg-opt ${offer === k ? 'on' : ''}`} onClick={() => { haptic(6); setOffer(k); }}>
            <span className="row-flex gap-12" style={{ textAlign: 'left' }}><Icon name={o.icon} size={20} /><span><b>{o.t}</b><span className="t-xs t-faint" style={{ display: 'block', fontWeight: 400 }}>{o.d}</span></span></span>
            {offer === k && <Icon name="Check" size={17} stroke={2.6} />}
          </button>
        ))}
        {offer === 'date' && <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />}
      </div>

      <AnimatePresence>
        {saved && (
          <motion.div className="saved-veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="center" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}>
              <motion.div className="seal" initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 12 }}><Icon name="Mail" size={46} /></motion.div>
              <h2 className="h1 mt-16">Sealed with care.</h2>
              <p className="t-sm t-soft mt-4" style={{ maxWidth: 260 }}>It’ll be here when you need it — {OFFER[offer].t.toLowerCase()}.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}

