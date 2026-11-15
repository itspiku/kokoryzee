import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, SectionTitle, Pill, Switch, TopBar, Segmented, toast, Confirm } from '../../components/ui.jsx';
import { useRecorder, LiveBars, VoicePlayer } from '../../components/Voice.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions } from '../../lib/store.js';
import { putBlob } from '../../lib/idb.js';
import { JOURNAL_PROMPTS, REFLECTION_STEPS, THEME_WORDS, DOCTOR } from '../../data/content.js';
import { fmtDay, fmtTime, fmtClock, haptic, uid, timeAgo } from '../../lib/util.js';
import { engine } from '../../audio/engine.js';

export function detectThemes(text) {
  const t = text.toLowerCase();
  return Object.entries(THEME_WORDS).filter(([, ws]) => ws.some((w) => t.includes(w))).map(([k]) => k).slice(0, 3);
}

const themeIcon = { rest: 'Moon', family: 'Heart', friends: 'Users', nature: 'TreePine', work: 'ClipboardList', worry: 'Cloud', gratitude: 'Sparkles', hope: 'Sunrise' };

function EntryCard({ j, i }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 120, damping: 18 }}>
      <Card onClick={() => go(`/p/journal/${j.id}`)} className="entry-card">
        <div className="row-flex between">
          <span className="t-xs t-faint bold">{fmtDay(j.t, { weekday: 'short', month: 'short', day: 'numeric' })} · {fmtTime(j.t)}</span>
          <span className="row-flex gap-6">
            {j.type === 'voice' && <Pill icon="Mic" tone="apricot">Voice</Pill>}
            {j.shared ? <Pill icon="Share2" tone="sky">Shared</Pill> : <Icon name="Lock" size={14} style={{ opacity: 0.4 }} />}
          </span>
        </div>
        <div className="h3 mt-8">{j.title || 'Untitled'}</div>
        {j.body && <p className="t-sm t-soft mt-4 clamp2">{j.body}</p>}
        {j.themes?.length > 0 && (
          <div className="tag-row mt-8">
            {j.themes.map((t) => <Pill key={t} tone="mute" icon={themeIcon[t]}>{t}</Pill>)}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function Journal() {
  const journal = useStore((s) => s.journal);
  return (
    <Screen bg="linear-gradient(180deg, color-mix(in srgb, var(--sage-300) 55%, var(--bg)) 0%, var(--bg) 420px)" theme={undefined}>
      <div className="row-flex between">
        <div>
          <div className="t-cap">Hi, Alex</div>
          <h1 className="h1" style={{ marginTop: 2 }}>Your journal</h1>
        </div>
        <Pill icon="Lock">Only you</Pill>
      </div>

      <Rise i={1}>
        <div className="journal-hello">
          <Koko size={92} mood="listening" />
          <div className="speech">
            <div className="serif" style={{ fontSize: 18, lineHeight: 1.3 }}>Hey, I’m here. Want to share what’s been on your mind today?</div>
          </div>
        </div>
      </Rise>

      <div className="prompt-grid">
        {JOURNAL_PROMPTS.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.07, type: 'spring', stiffness: 160, damping: 16 }}>
            <Card tint={p.tint} tight onClick={() => go(`/p/journal/new?prompt=${p.id}`)} className="prompt-card">
              <div className="ico-dot" style={{ background: 'var(--glass-soft)' }}><Icon name={p.icon} size={19} /></div>
              <div className="bold t-sm mt-12" style={{ lineHeight: 1.25 }}>{p.title}</div>
              <div className="t-xs t-soft mt-4">{p.sub}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="row-flex gap-8 mt-16">
        <Btn kind="primary" size="sm" icon="PenLine" onClick={() => go('/p/journal/new?mode=write')}>Write</Btn>
        <Btn kind="soft" size="sm" icon="Mic" onClick={() => go('/p/journal/new?mode=voice')}>Say it</Btn>
        <Btn kind="soft" size="sm" icon="Sparkles" onClick={() => go('/p/journal/new?mode=guided')}>Guided</Btn>
      </div>

      <SectionTitle sub="Everything stays on this device unless you share an entry">Recent entries</SectionTitle>
      <div className="stack gap-12">
        {journal.length === 0 && (
          <Card flat className="center t-sm t-soft">Nothing here yet — and that’s completely fine.</Card>
        )}
        {journal.map((j, i) => <EntryCard key={j.id} j={j} i={i} />)}
      </div>
    </Screen>
  );
}

