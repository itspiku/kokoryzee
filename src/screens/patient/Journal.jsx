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

// ───────────────────────────────────────── editor
export function JournalNew({ query }) {
  const prompt = JOURNAL_PROMPTS.find((p) => p.id === query?.prompt);
  const [mode, setMode] = useState(query?.mode || (prompt?.id === 'shift' ? 'guided' : 'write'));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(REFLECTION_STEPS.map(() => ''));
  const [saved, setSaved] = useState(false);
  const rec = useRecorder();
  const [clip, setClip] = useState(null);

  const save = async () => {
    haptic(20);
    let entry;
    if (mode === 'voice') {
      if (!clip) return;
      const id = uid('aud');
      await putBlob(id, clip.blob);
      entry = { type: 'voice', title: title || 'Voice note', body: '', audioId: id, duration: clip.duration, prompt: prompt?.id, themes: [] };
    } else if (mode === 'guided') {
      const text = REFLECTION_STEPS.map((s, i) => (answers[i] ? `${s.q}\n${answers[i]}` : '')).filter(Boolean).join('\n\n');
      entry = { type: 'text', title: title || 'A kinder way to say it', body: text, prompt: 'shift', themes: detectThemes(text) };
    } else {
      if (!body.trim() && !title.trim()) return toast('Write a few words first — or just close this.', { icon: 'Info' });
      entry = { type: 'text', title: title || body.trim().split(/\s+/).slice(0, 5).join(' ') + '…', body, prompt: prompt?.id, themes: detectThemes(body + ' ' + title) };
    }
    actions.addJournal(entry);
    actions.addFeedback('journal:write', 'Journaling', 'yes');
    engine.chime(81, 0.05);
    setSaved(true);
    setTimeout(() => back('/p/journal'), 1500);
  };

  const toggleRec = async () => {
    haptic(24);
    if (rec.state === 'recording') {
      const r = await rec.stop();
      if (r && r.blob.size > 500) setClip(r);
    } else {
      setClip(null);
      await rec.start();
    }
  };

  const canSave = mode === 'voice' ? !!clip : mode === 'guided' ? answers.some(Boolean) : body.trim() || title.trim();

  return (
    <Screen tabs={false} className="editor">
      <TopBar onBack={() => back('/p/journal')} sub={fmtDay(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })} title="New entry" right={<Btn kind="primary" size="sm" onClick={save} disabled={!canSave}>Save</Btn>} />
      <div className="row-flex" style={{ justifyContent: 'center', margin: '4px 0 14px' }}>
        <Segmented id="jm" small value={mode} onChange={setMode} options={[{ value: 'write', label: 'Write', icon: 'PenLine' }, { value: 'voice', label: 'Voice', icon: 'Mic' }, { value: 'guided', label: 'Guided', icon: 'Sparkles' }]} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'write' && (
          <motion.div key="w" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="journal-hello" style={{ margin: '0 0 12px' }}>
              <Koko size={64} mood="listening" interactive={false} />
              <div className="speech"><div className="t-sm serif" style={{ fontSize: 15.5 }}>{prompt ? prompt.sub + '.' : 'Hey, I’m here. Want to share what’s been on your mind today?'}</div></div>
            </div>
            <input className="field" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 10 }} />
            <textarea className="field lined-paper" autoFocus placeholder={prompt?.seed || 'Add your thoughts…'} value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 280, fontFamily: 'var(--font-display)', fontSize: 18, padding: '8px 18px' }} />
            <div className="row-flex between mt-8 t-xs t-faint"><span><Icon name="Lock" size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Only you can read this</span><span>{body.trim() ? body.trim().split(/\s+/).length : 0} words</span></div>
          </motion.div>
        )}

        {mode === 'voice' && (
          <motion.div key="v" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="center stack" style={{ alignItems: 'center' }}>
            <h2 className="h2 mt-8">Say it out loud.</h2>
            <p className="t-sm t-soft mt-4" style={{ maxWidth: 270 }}>Sometimes speaking is easier than writing. Recordings stay on your device.</p>
            <div style={{ width: '100%', margin: '26px 0 8px', minHeight: 70 }}>
              {rec.state === 'recording' ? <LiveBars bars={rec.bars} /> : <div className="t-sm t-faint" style={{ height: 70, display: 'grid', placeItems: 'center' }}>{clip ? '' : rec.state === 'unavailable' ? 'Microphone isn’t available here — you can write instead.' : 'Tap to start'}</div>}
            </div>
            <div className="t-num serif" style={{ fontSize: 30, height: 40 }}>{rec.state === 'recording' ? fmtClock(rec.seconds) : clip ? fmtClock(clip.duration) : '0:00'}</div>
            <motion.button className={`rec-btn ${rec.state === 'recording' ? 'on' : ''}`} onClick={toggleRec} whileTap={{ scale: 0.92 }} aria-label={rec.state === 'recording' ? 'Stop recording' : 'Start recording'}>
              <span className="rec-ring" />
              <Icon name={rec.state === 'recording' ? 'Square' : 'Mic'} size={30} />
            </motion.button>
            <div className="t-xs t-faint mt-12">{rec.state === 'recording' ? 'Tap to finish' : clip ? 'Tap to record again' : ''}</div>
            {clip && <ClipPreview clip={clip} />}
            {clip && <input className="field mt-16" placeholder="Give it a name (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />}
          </motion.div>
        )}

        {mode === 'guided' && (
          <motion.div key="g" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="row-flex gap-6" style={{ marginBottom: 14 }}>
              {REFLECTION_STEPS.map((_, i) => <motion.i key={i} className="step-bar" animate={{ opacity: i <= step ? 1 : 0.25, scaleY: i === step ? 1.4 : 1 }} />)}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <div className="t-cap">Step {step + 1} of {REFLECTION_STEPS.length}</div>
                <h2 className="h1 mt-8" style={{ fontSize: 26 }}>{REFLECTION_STEPS[step].q}</h2>
                <textarea className="field mt-16" autoFocus placeholder={REFLECTION_STEPS[step].ph} value={answers[step]} onChange={(e) => setAnswers(answers.map((a, i) => (i === step ? e.target.value : a)))} style={{ fontFamily: 'var(--font-display)', fontSize: 18, minHeight: 150 }} />
              </motion.div>
            </AnimatePresence>
            <div className="row-flex gap-8 mt-16">
              {step > 0 && <Btn kind="ghost" onClick={() => setStep(step - 1)} icon="ChevronLeft">Back</Btn>}
              <div className="grow" />
              {step < REFLECTION_STEPS.length - 1 ? <Btn kind="primary" onClick={() => setStep(step + 1)} iconRight="ArrowRight">{answers[step] ? 'Next' : 'Skip'}</Btn> : <Btn kind="primary" onClick={save} disabled={!canSave} icon="Check">Finish</Btn>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {saved && (
          <motion.div className="saved-veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="center">
              <Koko size={140} mood="happy" />
              <h2 className="h1 mt-12">Kept safe.</h2>
              <p className="t-sm t-soft mt-4">Thank you for sharing with yourself.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}

function ClipPreview({ clip }) {
  const [url] = useState(() => URL.createObjectURL(clip.blob));
  const [p, setP] = useState(0);
  const [on, setOn] = useState(false);
  return (
    <div className="voice-player mt-16" style={{ width: '100%' }}>
      <audio src={url} id="clip" onTimeUpdate={(e) => setP(e.target.currentTime / (e.target.duration || clip.duration || 1))} onEnded={() => setOn(false)} />
      <button className="vp-btn" onClick={() => { const a = document.getElementById('clip'); if (on) a.pause(); else a.play(); setOn(!on); }}><Icon name={on ? 'Pause' : 'Play'} size={20} /></button>
      <div className="grow" style={{ height: 36 }}><div style={{ display: 'flex', gap: 3, height: '100%', alignItems: 'center' }}>{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ flex: 1, height: `${25 + 75 * Math.abs(Math.sin(i * 0.8))}%`, borderRadius: 3, background: 'var(--primary-2)', opacity: i / 36 < p ? 1 : 0.3 }} />)}</div></div>
    </div>
  );
}

// ───────────────────────────────────────── entry
export function JournalEntry({ params }) {
  const j = useStore((s) => s.journal.find((x) => x.id === params.id));
  const [del, setDel] = useState(false);
  if (!j) return (
    <Screen tabs={false}><TopBar onBack={() => back('/p/journal')} title="Entry" /><Card flat className="center t-soft">This entry isn’t here anymore.</Card></Screen>
  );
  return (
    <Screen tabs={false}>
      <TopBar onBack={() => back('/p/journal')} sub={`${fmtDay(j.t, { weekday: 'long', month: 'long', day: 'numeric' })} · ${fmtTime(j.t)}`} right={<button className="icon-btn" onClick={() => setDel(true)} aria-label="Delete"><Icon name="Trash2" size={19} /></button>} />
      <Rise>
        <h1 className="h1">{j.title}</h1>
        {j.themes?.length > 0 && <div className="tag-row mt-12">{j.themes.map((t) => <Pill key={t} tone="mute" icon={themeIcon[t]}>{t}</Pill>)}</div>}
        {j.type === 'voice' && <div className="mt-16"><VoicePlayer audioId={j.audioId} /></div>}
        {j.body && <div className="entry-body mt-16">{j.body.split('\n').map((l, i) => <p key={i}>{l || ' '}</p>)}</div>}
      </Rise>
      <Card className="mt-24 row-flex gap-12">
        <div className="ico-dot"><Icon name={j.shared ? 'Share2' : 'Lock'} size={19} /></div>
        <div className="grow">
          <div className="bold t-sm">{j.shared ? `Shared with ${DOCTOR.short}` : 'Private to you'}</div>
          <div className="t-xs t-faint">{j.shared ? 'Visible in the pre-visit summary. Switch off any time.' : `Share this entry with ${DOCTOR.short} before a visit, if you’d like.`}</div>
        </div>
        <Switch on={j.shared} onChange={(v) => { actions.updateJournal(j.id, { shared: v }); actions.addAudit(v ? 'Journal entry shared' : 'Journal entry unshared', j.title, 'Alex Morgan', 'Alex Morgan', 'patient'); toast(v ? `Shared with ${DOCTOR.short}` : 'Private again', { icon: v ? 'Share2' : 'Lock' }); }} label="Share with doctor" />
      </Card>
      <Confirm open={del} danger onClose={() => setDel(false)} title="Delete this entry?" body="This removes it from your device. It can’t be undone." confirm="Delete" onConfirm={() => { actions.deleteJournal(j.id); back('/p/journal'); }} />
    </Screen>
  );
}
