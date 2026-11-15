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

