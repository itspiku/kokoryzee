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

