import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Icon from '../../components/Icon.jsx';
import { Spark } from '../../components/charts.jsx';
import { Btn, Card, Rise, InView, Pill, Avatar, Sheet, Segmented, TopBar, SectionTitle, Empty, toast } from '../../components/ui.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions } from '../../lib/store.js';
import { getPatientData } from '../../engine/useData.js';
import { confidenceLabel } from '../../engine/baseline.js';
import { patientById, DOCTOR } from '../../data/content.js';
import { fmtDateTime, timeAgo, fmtTime, haptic } from '../../lib/util.js';
import { LEVEL } from './common.jsx';

const STATUS_PILL = { new: ['New', 'apricot'], ack: ['Acknowledged', 'sky'], actioned: ['Actioned', ''], dismissed: ['Dismissed', 'mute'] };

export default function Alerts() {
  const alerts = useStore((s) => s.alerts);
  const [f, setF] = useState('open');
  const list = useMemo(() => {
    const l = alerts.filter((a) => (f === 'open' ? a.status === 'new' || a.status === 'ack' : f === 'closed' ? a.status === 'actioned' || a.status === 'dismissed' : true));
    const order = { urgent: 0, review: 1, watch: 2, data: 3 };
    return [...l].sort((a, b) => (a.status === 'new' ? 0 : 1) - (b.status === 'new' ? 0 : 1) || order[a.level] - order[b.level] || b.createdAt - a.createdAt);
  }, [alerts, f]);
  const open = alerts.filter((a) => a.status === 'new').length;

  return (
    <Screen>
      <div className="row-flex between">
        <div><div className="t-cap">{open} waiting for you</div><h1 className="h1" style={{ marginTop: 2 }}>Alerts</h1></div>
        <Pill icon="ShieldCheck">Human-reviewed</Pill>
      </div>
      <p className="t-sm t-soft mt-8">Every alert shows its reason, confidence, rule and audit trail. Nothing is acted on automatically — you decide.</p>
      <div className="row-flex mt-16" style={{ justifyContent: 'center' }}>
        <Segmented id="af" small value={f} onChange={setF} options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
      </div>
      <div className="stack gap-12 mt-16">
        <AnimatePresence initial={false}>
          {list.map((a, i) => <AlertCard key={a.id} a={a} i={i} />)}
        </AnimatePresence>
        {list.length === 0 && <Empty icon="CheckCheck" title="All caught up" body="Nothing in this view. Quiet is good." />}
      </div>
    </Screen>
  );
}

function AlertCard({ a, i }) {
  const p = patientById(a.patientId);
  const L = LEVEL[a.level];
  const [sp, tone] = STATUS_PILL[a.status];
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 160, damping: 20, delay: i * 0.05 }}>
      <Card className="alert-card" onClick={() => go(`/c/alerts/${a.id}`)} style={{ '--lvl': L.color, paddingLeft: 22 }}>
        <div className="row-flex between">
          <Pill tone={L.tone} icon={L.icon}>{L.label}</Pill>
          <span className="t-xs t-faint">{timeAgo(a.createdAt)}</span>
        </div>
        <div className="row-flex gap-12 mt-12">
          <Avatar name={p.name} hue={p.hue} size={42} />
          <div className="grow"><div className="h3">{p.name}</div><div className="t-xs t-faint">{p.phase}</div></div>
        </div>
        <p className="t-sm t-soft mt-8 clamp2">{a.reason}</p>
        {a.signals.length > 0 && <div className="tag-row mt-8">{a.signals.slice(0, 3).map((s) => <Pill key={s.key} tone="mute">{s.label.split(' (')[0]} {s.delta}</Pill>)}</div>}
        <div className="row-flex between mt-12"><Pill tone={tone}>{sp}</Pill><span className="t-xs t-faint">confidence {a.confidence.toFixed(2)}</span></div>
      </Card>
    </motion.div>
  );
}

const DISMISS = ['Explained — travel or routine change', 'Expected — treatment or medication change', 'Likely sensor artefact', 'Already addressed with the patient', 'Other'];

export function AlertDetail({ params }) {
  const a = useStore((s) => s.alerts.find((x) => x.id === params.id));
  const [dismiss, setDismiss] = useState(false);
  const [reason, setReason] = useState(DISMISS[0]);
  useEffect(() => { if (a) actions.alertView(a.id); }, [a?.id]);
  if (!a) return <Screen tabs={false}><TopBar backTo="/c/alerts" title="Alert" /><Empty icon="Search" title="Alert not found" /></Screen>;
  const p = patientById(a.patientId);
  const d = getPatientData(a.patientId);
  const L = LEVEL[a.level];
  const closed = a.status === 'actioned' || a.status === 'dismissed';
  const maxB = Math.max(1.5, ...a.signals.map((s) => s.badness || 0));

  const act = (kind, note) => { haptic(14); actions.alertAct(a.id, kind, note); toast(kind === 'ack' ? 'Acknowledged' : kind === 'dismiss' ? 'Dismissed with reason' : 'Marked as actioned', { icon: 'Check' }); };

  return (
    <Screen tabs={false}>
      <TopBar backTo="/c/alerts" sub={L.label} title={p.name} />
      <Rise>
        <Card className="alert-card" style={{ '--lvl': L.color, paddingLeft: 22 }}>
          <div className="row-flex between"><Pill tone={L.tone} icon={L.icon}>{L.label}</Pill><Pill tone={STATUS_PILL[a.status][1]}>{STATUS_PILL[a.status][0]}</Pill></div>
          <div className="row-flex gap-12 mt-12" onClick={() => go(`/c/patient/${p.id}`)} style={{ cursor: 'pointer' }}>
            <Avatar name={p.name} hue={p.hue} size={46} />
            <div className="grow"><div className="bold">{p.name}</div><div className="t-xs t-faint">{p.phase}</div></div>
            <Icon name="ChevronRight" size={18} style={{ opacity: 0.4 }} />
          </div>
        </Card>
      </Rise>

      <SectionTitle>Why this alert</SectionTitle>
      <InView><Card><p className="t-body">{a.reason}</p></Card></InView>

      {a.signals.length > 0 && (
        <>
          <SectionTitle sub="Distance from this person’s own baseline, in units of their own day-to-day noise">Contributing signals</SectionTitle>
          <InView>
            <Card>
              <div className="stack gap-16" style={{ gap: 16 }}>
                {a.signals.map((s) => (
                  <div key={s.key}>
                    <div className="row-flex between"><span className="bold t-sm">{s.label}</span><span className="t-sm t-soft">{s.delta}</span></div>
                    <div className="sig-bar mt-8"><motion.i initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, ((s.badness || 0) / maxB) * 100)}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.22, 0.8, 0.28, 1] }} /></div>
                    <div className="row-flex between t-xs t-faint mt-4"><span>{(s.badness || 0).toFixed(1)} σ from baseline</span><span>z = {(s.z || 0).toFixed(1)}</span></div>
                  </div>
                ))}
              </div>
            </Card>
          </InView>
        </>
      )}

      <SectionTitle>Confidence & data quality</SectionTitle>
      <InView>
        <Card>
          <div className="row-flex between"><div className="serif" style={{ fontSize: 34 }}>{a.confidence.toFixed(2)}</div><Pill tone="lav" icon="Gauge">{confidenceLabel(a.confidence)}</Pill></div>
          <div className="progress mt-8"><motion.i initial={{ width: 0 }} animate={{ width: `${a.confidence * 100}%` }} transition={{ duration: 1.1 }} /></div>
          <p className="t-sm t-soft mt-12">Based on {d.analysis.wearDays} of the last {d.analysis.recentDays} days of wearable data and a baseline that is {Math.round(d.analysis.baseCoverage * 100)}% complete. Agreement across independent sensors raises confidence; a single noisy signal lowers it.</p>
        </Card>
      </InView>

      <SectionTitle>Rule, model & window</SectionTitle>
      <InView>
        <Card className="stack gap-10">
          {[['Rule', a.rule], ['Window', a.window], ['Model', a.model], ['Responsible clinician', a.owner]].map(([k, v]) => (
            <div key={k} className="row-flex between gap-12" style={{ alignItems: 'flex-start' }}><span className="t-xs t-faint bold" style={{ width: 120 }}>{k}</span><span className="t-sm grow" style={{ textAlign: 'right' }}>{v}</span></div>
          ))}
        </Card>
      </InView>

      <SectionTitle sub="Append-only. Every view and action is recorded.">Audit trail</SectionTitle>
      <InView>
        <Card>
          <AnimatePresence initial={false}>
            {a.audit.map((e, i) => (
              <motion.div key={`${e.t}-${i}`} className="audit-line" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <div className="t-sm"><b>{e.action}</b></div>
                <div className="t-xs t-faint">{e.actor} · {fmtDateTime(e.t)}</div>
                {e.note && <div className="t-xs t-soft" style={{ marginTop: 2 }}>“{e.note}”</div>}
              </motion.div>
            ))}
          </AnimatePresence>
        </Card>
      </InView>

      {/* actions */}
      <div className="stack gap-8 mt-24">
        {!closed ? (
          <>
            {a.status === 'new' && <Btn kind="primary" size="lg" block icon="Check" onClick={() => act('ack')}>Acknowledge</Btn>}
            <div className="row-flex gap-8">
              <Btn kind="soft" className="grow" icon="MessageCircle" onClick={() => go(`/c/messages/${p.id}`)}>Message {p.name.split(' ')[0]}</Btn>
              <Btn kind="soft" className="grow" icon="CalendarPlus" onClick={() => { actions.bookAppt(p.id, Date.now() + 86400000 + 3600000 * 2, 'Check-in call', 'video'); actions.alertAct(a.id, 'action', 'Appointment brought forward'); toast('Check-in call requested for tomorrow', { icon: 'CalendarCheck' }); }}>Bring forward</Btn>
            </div>
            <div className="row-flex gap-8">
              <Btn kind="line" className="grow" icon="FileText" onClick={() => go(`/c/patient/${p.id}`)}>Open brief</Btn>
              <Btn kind="ghost" className="grow" icon="X" onClick={() => setDismiss(true)}>Dismiss…</Btn>
            </div>
            {a.status === 'ack' && <Btn kind="primary" block icon="CheckCheck" onClick={() => act('action', 'Followed up with patient')}>Mark as actioned</Btn>}
          </>
        ) : (
          <Btn kind="line" block icon="Undo2" onClick={() => act('reopen')}>Reopen</Btn>
        )}
      </div>

      <Sheet open={dismiss} onClose={() => setDismiss(false)} title="Dismiss this alert">
        <p className="t-sm t-soft mb-12">A reason is required so the decision is auditable and the model can learn from it.</p>
        <div className="stack gap-8">
          {DISMISS.map((r) => <button key={r} className={`msg-opt ${reason === r ? 'on' : ''}`} onClick={() => setReason(r)}>{r}{reason === r && <Icon name="Check" size={17} stroke={2.6} />}</button>)}
        </div>
        <Btn kind="primary" size="lg" block className="mt-16" onClick={() => { act('dismiss', reason); setDismiss(false); }}>Dismiss with reason</Btn>
      </Sheet>
    </Screen>
  );
}
