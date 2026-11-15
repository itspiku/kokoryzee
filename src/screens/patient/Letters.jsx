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

