import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Icon from '../../components/Icon.jsx';
import { Spark } from '../../components/charts.jsx';
import { Btn, Card, Rise, InView, Pill, Segmented, SectionTitle, Avatar, Confirm, toast } from '../../components/ui.jsx';
import { go } from '../../lib/nav.js';
import { useStore, actions } from '../../lib/store.js';
import { PATIENTS, DOCTOR } from '../../data/content.js';
import { MODEL_VERSION } from '../../engine/baseline.js';
import { timeAgo, fmtDateTime } from '../../lib/util.js';

const hash = (s) => {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
};

const ROLES = [
  ['Patient', ['full', 'full', 'full', 'full', 'full']],
  ['Clinician', ['full', 'full', 'shared', 'full', 'full']],
  ['Care coordinator', ['none', 'part', 'none', 'none', 'part']],
  ['Circle member', ['none', 'part', 'none', 'none', 'none']],
  ['Researcher', ['none', 'deid', 'none', 'none', 'none']],
];
const COLS = ['Raw signals', 'Summaries', 'Journal', 'Brain data', 'Audit log'];
const CELL = { full: ['Check', 'var(--primary)'], shared: ['Share2', '#4f8fbf'], part: ['Eye', '#c9a24b'], deid: ['Fingerprint', '#8878c8'], none: ['Minus', 'var(--ink-3)'] };

export default function Trust() {
  const consent = useStore((s) => s.consent);
  const audit = useStore((s) => s.audit);
  const alerts = useStore((s) => s.alerts);
  const plan = useStore((s) => s.carePlans.alex);
  const [f, setF] = useState('all');
  const [out, setOut] = useState(false);

  const list = audit.filter((a) => f === 'all' || (f === 'clin' ? a.role === 'clinician' : f === 'sys' ? a.role === 'system' : a.role === 'patient')).slice(0, 14);
  const decided = alerts.filter((a) => ['actioned', 'ack', 'dismissed'].includes(a.status));
  const useful = decided.filter((a) => a.status !== 'dismissed').length;
  const precision = decided.length ? useful / decided.length : 0.78;
  const consentFor = (p) => {
    if (p.id === 'alex') return [consent.wearable.sleep, consent.phone.night, consent.imaging.eeg, consent.circle.share, consent.research];
    const m = { maria: [1, 1, 1, 1, 1], daniel: [1, 1, 0, 1, 0], priya: [1, 0, 1, 0, 0], tom: [1, 1, 1, 0, 0] }[p.id];
    return m.map(Boolean);
  };
  const volume = [3, 4, 2, 5, 3, 2, 4, 3, 2, 3, 4, alerts.length];

  return (
    <Screen>
      <div className="row-flex between">
        <div><div className="t-cap">Safety, privacy & oversight</div><h1 className="h1" style={{ marginTop: 2 }}>Trust</h1></div>
        <Avatar name={DOCTOR.name} hue={DOCTOR.hue} size={44} ring />
      </div>
      <Rise i={1} className="mt-12">
        <Card tint="sky" className="row-flex gap-12">
          <div className="ico-dot lg" style={{ background: 'var(--glass-soft)' }}><Icon name="ShieldCheck" size={26} /></div>
          <div className="grow t-sm t-soft">Privacy, consent, explainability and human oversight are part of the architecture. Every access is logged. Nothing escalates without a human.</div>
        </Card>
      </Rise>

      <SectionTitle sub="What each patient has chosen to share">Consent status</SectionTitle>
      <InView>
        <Card>
          <table className="matrix">
            <thead><tr><th style={{ textAlign: 'left' }}>Patient</th>{['Watch', 'Phone', 'Brain', 'Circle', 'Research'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {PATIENTS.map((p) => (
                <tr key={p.id}>
                  <td><div className="row-flex gap-8"><Avatar name={p.name} hue={p.hue} size={26} style={{ boxShadow: 'none', fontSize: 10 }} />{p.name.split(' ')[0]}</div></td>
                  {consentFor(p).map((on, i) => <td key={i}><Icon name={on ? 'Check' : 'Minus'} size={16} stroke={2.6} style={{ color: on ? 'var(--primary)' : 'var(--ink-3)', opacity: on ? 1 : 0.5, margin: '0 auto' }} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="t-xs t-faint mt-8">Changes by a patient take effect immediately and are logged. Alex’s row is live.</p>
        </Card>
      </InView>

      <SectionTitle sub="Role-based access, least privilege">Who can see what</SectionTitle>
      <InView>
        <Card>
          <table className="matrix">
            <thead><tr><th style={{ textAlign: 'left' }}>Role</th>{COLS.map((c) => <th key={c}>{c.split(' ')[0]}</th>)}</tr></thead>
            <tbody>
              {ROLES.map(([r, cells]) => (
                <tr key={r}><td>{r}</td>{cells.map((c, i) => <td key={i}><Icon name={CELL[c][0]} size={16} stroke={2.4} style={{ color: CELL[c][1], margin: '0 auto' }} /></td>)}</tr>
              ))}
            </tbody>
          </table>
          <div className="row-flex gap-12 wrap t-xs t-faint mt-8">
            <span><Icon name="Check" size={12} style={{ display: 'inline', color: 'var(--primary)' }} /> full</span><span><Icon name="Share2" size={12} style={{ display: 'inline', color: '#4f8fbf' }} /> patient-chosen</span><span><Icon name="Eye" size={12} style={{ display: 'inline', color: '#c9a24b' }} /> limited</span><span><Icon name="Fingerprint" size={12} style={{ display: 'inline', color: '#8878c8' }} /> de-identified</span>
          </div>
        </Card>
      </InView>

      <SectionTitle sub="Append-only · each entry is hash-chained">Audit log</SectionTitle>
      <div className="row-flex" style={{ justifyContent: 'center', marginBottom: 12 }}>
        <Segmented id="auf" small value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'clin', label: 'Clinician' }, { value: 'sys', label: 'System' }, { value: 'pat', label: 'Patient' }]} />
      </div>
      <Card>
        {list.map((a, i) => (
          <motion.div key={a.id} className="audit-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
            <div className="audit-dot" style={{ background: a.role === 'system' ? 'var(--lav-400)' : a.role === 'patient' ? 'var(--apricot-400)' : 'var(--primary-2)' }} />
            <div className="grow">
              <div className="t-sm"><b>{a.actor}</b> · {a.action}</div>
              <div className="t-xs t-faint">{a.subject}{a.detail ? ` · ${a.detail}` : ''}</div>
              <div className="t-xs t-faint" style={{ fontFamily: 'ui-monospace, monospace', opacity: 0.6 }}>#{hash(a.id + a.t)} ← #{hash(String(a.t))}</div>
            </div>
            <span className="t-xs t-faint nowrap">{timeAgo(a.t)}</span>
          </motion.div>
        ))}
      </Card>

      <SectionTitle sub="Versioned, monitored, reviewable">Model monitoring</SectionTitle>
      <InView>
        <Card className="stack gap-14" style={{ gap: 14 }}>
          <div className="row-flex between"><div><div className="t-cap">Baseline & alert model</div><div className="bold">{MODEL_VERSION}</div></div><Pill icon="Check">Stable</Pill></div>
          <div className="mon-grid">
            <div><div className="t-cap">Alert usefulness</div><div className="serif" style={{ fontSize: 28 }}>{Math.round(precision * 100)}%</div><div className="t-xs t-faint">of reviewed alerts acted on</div></div>
            <div><div className="t-cap">Alert volume / wk</div><Spark values={volume} width={96} height={34} /></div>
            <div><div className="t-cap">Last calibrated</div><div className="bold t-sm">6 days ago</div><div className="t-xs t-faint">on de-identified cohort</div></div>
            <div><div className="t-cap">Drift check</div><div className="bold t-sm">No drift</div><div className="t-xs t-faint">Population stability 0.04</div></div>
          </div>
          <p className="t-xs t-faint">Prototype figures are simulated. In production, models are versioned, validated against clinician decisions and monitored for drift and bias before release.</p>
        </Card>
      </InView>

      <SectionTitle sub="Nothing happens without a person">Human escalation</SectionTitle>
      <InView>
        <Card>
          {[['HandHeart', 'Patient asks for support, or a review alert fires', 'No automatic action is taken on the patient'], ['BellRing', `${DOCTOR.short} is notified`, 'Push + in-app; backup clinician after 2 h'], ['Phone', 'Clinician reaches out', 'Call or message in line with the care plan'], ['FileCheck2', 'Outcome documented', 'Acknowledge · action · or dismiss with reason']].map(([ic, t, d], i) => (
            <div key={t} className="audit-line"><div className="row-flex gap-8"><Icon name={ic} size={15} style={{ color: 'var(--primary)' }} /><b className="t-sm">{i + 1}. {t}</b></div><div className="t-xs t-faint">{d}</div></div>
          ))}
          <div className="t-xs t-soft mt-8" style={{ padding: 10, borderRadius: 12, background: 'var(--card-2)' }}><b>Alex’s plan:</b> {plan.escalation}</div>
        </Card>
      </InView>

      <SectionTitle sub="Export, deletion & research">Data rights</SectionTitle>
      <InView>
        <Card className="stack gap-10">
          {[['Download', 'Data export requests', '0 open'], ['Trash2', 'Deletion requests', '0 open'], ['FlaskConical', 'Research cohort (opt-in, de-identified)', `${consentFor(PATIENTS[0]).slice(4).concat(PATIENTS.slice(1).map((p) => consentFor(p)[4])).filter(Boolean).length} of ${PATIENTS.length} patients`]].map(([ic, t, v]) => (
            <div key={t} className="row-flex gap-12"><div className="ico-dot"><Icon name={ic} size={18} /></div><div className="grow bold t-sm">{t}</div><span className="t-sm t-soft">{v}</span></div>
          ))}
        </Card>
      </InView>

      <Card tint="butter" className="mt-24 stack gap-10">
        <div className="t-sm t-soft">Demo: see what Alex sees, or sign out of the clinician app.</div>
        <Btn kind="primary" icon="Smile" onClick={() => { actions.setRole('patient'); go('/p/home', { dir: 'swap' }); }}>Open Alex’s app</Btn>
        <Btn kind="ghost" size="sm" icon="LogOut" onClick={() => setOut(true)}>Sign out</Btn>
      </Card>
      <Confirm open={out} onClose={() => setOut(false)} title="Sign out?" confirm="Sign out" onConfirm={() => { actions.setRole(null); go('/welcome', { dir: 'swap' }); }} />
    </Screen>
  );
}
