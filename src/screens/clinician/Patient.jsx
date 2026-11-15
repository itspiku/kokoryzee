import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Icon from '../../components/Icon.jsx';
import { BandChart, Spark } from '../../components/charts.jsx';
import { Btn, Card, Rise, InView, Pill, Avatar, Switch, TopBar, SectionTitle, toast, useSize } from '../../components/ui.jsx';
import TwinPanel from './TwinPanel.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions, responseStats } from '../../lib/store.js';
import { getPatientData } from '../../engine/useData.js';
import { buildBrief, valueText, deltaText } from '../../engine/insights.js';
import { confidenceLabel } from '../../engine/baseline.js';
import { patientById, INTERVENTIONS, DOCTOR } from '../../data/content.js';
import { mulberry32, fmtDay, fmtTime, timeAgo, haptic, smoothPath, clamp, mean } from '../../lib/util.js';
import { StatusPill, patientStatus, STATUS } from './common.jsx';

const TABS = [['brief', 'Pre-visit brief'], ['timeline', 'Timeline'], ['twin', 'Brain twin'], ['plan', 'Care plan'], ['response', 'What helps']];
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export default function Patient({ params, query }) {
  const p = patientById(params.id);
  const [tab, setTab] = useState(query?.tab || 'brief');
  const alerts = useStore((s) => s.alerts);
  const appts = useStore((s) => s.appts);
  useEffect(() => { if (p) actions.addAudit('Viewed patient record', 'Opened patient overview', p.name); }, [p?.id]);
  if (!p) return <Screen tabs={false}><TopBar backTo="/c/overview" title="Patient" /></Screen>;
  const d = getPatientData(p.id);
  const open = alerts.filter((a) => a.patientId === p.id && a.status === 'new');
  const status = patientStatus(d.analysis, open);
  const next = appts.filter((a) => a.patientId === p.id && a.t > Date.now() && a.status !== 'done').sort((a, b) => a.t - b.t)[0];


  return (
    <Screen tabs={false}>
      <TopBar backTo="/c/overview" right={<button className="icon-btn" aria-label="Message" onClick={() => go(`/c/messages/${p.id}`)}><Icon name="MessageCircle" size={20} /></button>} />
      <Rise>
        <div className="pt-hero">
          <Avatar name={p.name} hue={p.hue} size={64} ring />
          <div className="grow">
            <h1 className="h1" style={{ fontSize: 26 }}>{p.name}</h1>
            <div className="t-sm t-soft">{p.age} · {p.phase}</div>
            <div className="row-flex gap-8 mt-8 wrap"><StatusPill s={status} /><Pill tone="mute" icon="Crosshair">{p.focus}</Pill></div>
          </div>
        </div>
        <div className="phq-strip">
          <div><div className="t-cap">PHQ-9 trend</div><div className="serif" style={{ fontSize: 22 }}>{p.phq[0]} → {p.phq[p.phq.length - 1]}</div></div>
          <PhqDots phq={p.phq} />
          {next && <div style={{ textAlign: 'right' }}><div className="t-cap">Next</div><div className="t-sm bold">{fmtDay(next.t, { weekday: 'short', month: 'short', day: 'numeric' })}</div></div>}
        </div>
      </Rise>

      <div className="tabs-scroll mt-12">
        {TABS.map(([k, l]) => (
          <button key={k} className={`tab-pill-btn ${tab === k ? 'on' : ''}`} onClick={() => { haptic(8); setTab(k); }}>
            {tab === k && <motion.span layoutId="pt-tab" className="bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            {l}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {tab === 'brief' && <Brief p={p} d={d} />}
          {tab === 'timeline' && <Timeline p={p} d={d} />}
          {tab === 'twin' && <TwinPanel patientId={p.id} hidePicker />}
          {tab === 'plan' && <CarePlan p={p} />}
          {tab === 'response' && <Response p={p} />}
        </motion.div>
      </AnimatePresence>
    </Screen>
  );
}

function PhqDots({ phq }) {
  const w = 96, h = 36;
  const hi = Math.max(...phq), lo = Math.min(...phq, 0);
  const pts = phq.map((v, i) => [6 + (i / Math.max(1, phq.length - 1)) * (w - 12), 6 + (1 - (v - lo) / (hi - lo || 1)) * (h - 12)]);
  return (
    <svg width={w} height={h}>
      {phq.length > 1 && <path d={smoothPath(pts, 0.9)} stroke="var(--primary-2)" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4.5 : 3} fill={i === pts.length - 1 ? 'var(--primary)' : 'var(--card-solid)'} stroke="var(--primary-2)" strokeWidth="2" />)}
    </svg>
  );
}

// ───────────────────────────── Brief
function Typed({ text, speed = 12, delay = 0, run }) {
  const [n, setN] = useState(run ? 0 : text.length);
  useEffect(() => {
    if (!run) { setN(text.length); return; }
    setN(0);
    let i = 0;
    const t0 = setTimeout(() => {
      const iv = setInterval(() => { i += 2; setN(Math.min(text.length, i)); if (i >= text.length) clearInterval(iv); }, speed);
      cleanup = () => clearInterval(iv);
    }, delay);
    let cleanup = () => {};
    return () => { clearTimeout(t0); cleanup(); };
  }, [text, run, delay]);
  return <>{text.slice(0, n)}{n < text.length && <span className="caret" style={{ height: 14, verticalAlign: '-2px', background: 'var(--primary)' }} />}</>;
}

function Brief({ p, d }) {
  const feedback = useStore((s) => s.feedback);
  const plan = useStore((s) => s.carePlans[p.id]);
  const journal = useStore((s) => s.journal);
  const consent = useStore((s) => s.consent);
  const [run, setRun] = useState(1);
  const [reviewed, setReviewed] = useState(false);
  const stats = useMemo(() => (p.id === 'alex' ? responseStats(feedback) : pseudoStats(p)), [feedback, p]);
  const shared = p.id === 'alex' && consent.shareDoctor.journal ? journal.filter((j) => j.shared) : [];
  const brief = useMemo(() => buildBrief({ patient: p, series: d.series, analysis: d.analysis, stats, plan, phq: p.phq, journalShared: shared.length }), [p, d, stats, plan, shared.length]);
  const tms = d.tms.filter((s) => s.done).length;

  const copy = async () => {
    const txt = [`Pre-visit brief · ${p.name}`, brief.headline, '', 'WHAT CHANGED', ...brief.changed.map((c) => '• ' + c.text), '', 'WHAT WAS TRIED', ...brief.tried.map((t) => `• ${t.label} (${t.n} times)`), '', 'WHAT HELPED', ...brief.helped.map((h) => `• ${h.label}: ${h.yes + h.some} of ${h.n}`), '', brief.symptoms, '', 'SUGGESTED QUESTIONS', ...brief.questions.map((q) => '• ' + q), '', brief.quality].join('\n');
    try { await navigator.clipboard.writeText(txt); toast('Brief copied', { icon: 'Copy' }); } catch { toast('Copy isn’t available here', { icon: 'Info' }); }
  };

  return (
    <div>
      <div className="row-flex between" style={{ marginBottom: 10 }}>
        <div className="row-flex gap-8"><Icon name="Sparkles" size={16} style={{ color: 'var(--primary)' }} /><span className="t-sm t-soft">Prepared from {d.analysis.recentDays + 14} days of data</span></div>
        <button className="t-sm bold" style={{ color: 'var(--primary)' }} onClick={() => setRun((r) => r + 1)}><Icon name="RefreshCw" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Regenerate</button>
      </div>
      <div className="brief-paper" key={run}>
        <div className="serif" style={{ fontSize: 22, lineHeight: 1.25 }}><Typed run={!!run} text={brief.headline} /></div>
        <div className="t-xs t-faint mt-4">TMS {tms} of 30 sessions · {brief.symptoms}</div>

        <div className="brief-h"><Icon name="Activity" size={14} /> What changed</div>
        {brief.changed.map((c, i) => (
          <motion.div key={c.text} className="brief-li" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }}>
            <Icon name={c.tone === 'good' ? 'TrendingUp' : 'Activity'} size={16} style={{ color: c.tone === 'good' ? 'var(--sage-600)' : '#d9964e', marginTop: 2, flex: 'none' }} />
            <span>{c.text}</span>
          </motion.div>
        ))}

        <div className="brief-h"><Icon name="ClipboardList" size={14} /> What was tried</div>
        {brief.tried.length === 0 && <div className="t-sm t-soft">No self-directed supports used yet.</div>}
        {brief.tried.map((t, i) => (
          <motion.div key={t.label} className="brief-li" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.08 }}>
            <Icon name="Check" size={15} style={{ color: 'var(--primary)', marginTop: 3, flex: 'none' }} stroke={2.6} /><span className="grow">{t.label}</span><span className="t-xs t-faint">{t.n}×</span>
          </motion.div>
        ))}

        <div className="brief-h"><Icon name="Sprout" size={14} /> What helped</div>
        {brief.helped.map((h, i) => (
          <motion.div key={h.label} className="brief-li" style={{ display: 'block' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 + i * 0.1 }}>
            <div className="row-flex between"><span className="bold">{h.label}</span><span className="t-xs t-faint">{h.yes + h.some} of {h.n} helped</span></div>
            <div className="help-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${h.rate * 100}%` }} transition={{ delay: 1.3 + i * 0.1, duration: 0.9 }} /></div>
          </motion.div>
        ))}

        {shared.length > 0 && (
          <>
            <div className="brief-h"><Icon name="PenLine" size={14} /> Journal entries Alex chose to share</div>
            {shared.map((j) => <div key={j.id} className="brief-li" style={{ display: 'block' }}><b>{j.title}</b><div className="t-sm t-soft">{j.body}</div></div>)}
          </>
        )}

        <div className="brief-h"><Icon name="MessageCircle" size={14} /> Suggested questions</div>
        {brief.questions.map((q, i) => <motion.div key={q} className="brief-li" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 + i * 0.1 }}><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{i + 1}.</span><span>{q}</span></motion.div>)}

        <div className="brief-h"><Icon name="Gauge" size={14} /> Data quality</div>
        <div className="t-sm t-soft">{brief.quality}</div>
      </div>

      <div className="row-flex gap-8 mt-16 wrap">
        <Btn kind="soft" size="sm" icon="Copy" onClick={copy}>Copy</Btn>
        <Btn kind="soft" size="sm" icon="Printer" onClick={() => window.print()}>Print</Btn>
        <div className="grow" />
        <Btn kind={reviewed ? 'soft' : 'primary'} size="sm" icon={reviewed ? 'CheckCheck' : 'Check'} onClick={() => { setReviewed(true); actions.addAudit('Pre-visit brief reviewed', 'Clinician sign-off', p.name); toast('Marked as reviewed', { icon: 'CheckCheck' }); }}>{reviewed ? 'Reviewed' : 'Mark reviewed'}</Btn>
      </div>
      <p className="t-xs t-faint mt-12">Summaries are drafted by the system and always reviewed by a clinician. Model kz-brief 0.2 · decision support only.</p>
    </div>
  );
}

