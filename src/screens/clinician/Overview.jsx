import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Icon from '../../components/Icon.jsx';
import { Spark } from '../../components/charts.jsx';
import { Btn, Card, Rise, InView, SectionTitle, Pill, Avatar, CountUp } from '../../components/ui.jsx';
import { go } from '../../lib/nav.js';
import { useStore, useNow } from '../../lib/store.js';
import { getPatientData } from '../../engine/useData.js';
import { PATIENTS, DOCTOR } from '../../data/content.js';
import { partOfDay, fmtTime, fmtDay, timeAgo } from '../../lib/util.js';
import { STATUS, patientStatus, StatusPill, topShiftText } from './common.jsx';

export default function Overview() {
  const alerts = useStore((s) => s.alerts);
  const appts = useStore((s) => s.appts);
  const threads = useStore((s) => s.threads);
  const now = useNow(60000);
  const pod = partOfDay(new Date(now));

  const rows = useMemo(
    () =>
      PATIENTS.map((p) => {
        const d = getPatientData(p.id);
        const open = alerts.filter((a) => a.patientId === p.id && a.status === 'new');
        return { p, d, status: patientStatus(d.analysis, open), open };
      }).sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank),
    [alerts]
  );
  const needLook = rows.filter((r) => STATUS[r.status].rank <= 2);
  const rest = rows.filter((r) => STATUS[r.status].rank > 2);
  const unread = Object.entries(threads).filter(([k]) => k.startsWith('dr:')).reduce((n, [, l]) => n + l.filter((m) => m.r && !m.r.c).length, 0);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const tomorrow = today.getTime() + 86400000;
  const sched = appts.filter((a) => a.t >= today.getTime() && a.t < tomorrow + 86400000 && a.status !== 'requested').sort((a, b) => a.t - b.t).slice(0, 6);
  const good = rows.filter((r) => r.status === 'better' || (r.status === 'steady' && r.d.analysis.improved.length >= 2));

  const greet = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Hello' }[pod];

  return (
    <Screen>
      <div className="row-flex between">
        <div>
          <div className="t-cap">{fmtDay(now, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1 className="h1" style={{ marginTop: 2 }}>{greet}, Dr. Marsh</h1>
          <div className="t-sm t-soft">{DOCTOR.clinic}</div>
        </div>
        <button className="icon-btn" aria-label="Settings" onClick={() => go('/c/trust')}><Avatar name={DOCTOR.name} hue={DOCTOR.hue} size={38} style={{ boxShadow: 'none' }} /></button>
      </div>

      <Rise i={1} className="mt-16">
        <div className="stat-strip">
          {[
            ['Users', rows.length, 'patients', 'sage'],
            ['Eye', needLook.length, 'worth a look', 'butter'],
            ['MessageCircle', unread, 'unread', 'sky'],
          ].map(([ic, n, l, t], i) => (
            <Card key={l} tint={t} tight className="stat">
              <Icon name={ic} size={18} style={{ opacity: 0.7 }} />
              <div className="serif" style={{ fontSize: 34, lineHeight: 1 }}><CountUp value={n} duration={0.9 + i * 0.15} /></div>
              <div className="t-xs t-soft">{l}</div>
            </Card>
          ))}
        </div>
      </Rise>

      <SectionTitle sub="Prioritised by the reasons below — a prompt to look, never a diagnosis">Worth a look</SectionTitle>
      <div className="stack gap-12">
        {needLook.map((r, i) => <PatientRow key={r.p.id} r={r} i={i} />)}
        {needLook.length === 0 && <Card tint="sage" className="t-sm t-soft">Nothing needs a look right now.</Card>}
      </div>

      <SectionTitle sub="Today & tomorrow">Schedule</SectionTitle>
      <InView>
        <Card>
          {sched.length === 0 && <div className="t-sm t-soft">Nothing scheduled.</div>}
          {sched.map((a) => {
            const p = PATIENTS.find((x) => x.id === a.patientId);
            const isToday = new Date(a.t).toDateString() === today.toDateString();
            return (
              <div className="sched-row" key={a.id}>
                <div className="sched-time"><div className="bold">{fmtTime(a.t).replace(' ', ' ')}</div><div className="t-xs t-faint">{isToday ? 'Today' : 'Tomorrow'}</div></div>
                <Avatar name={p.name} hue={p.hue} size={40} />
                <div className="grow" onClick={() => go(`/c/patient/${p.id}`)} style={{ cursor: 'pointer' }}><div className="bold t-sm">{p.name}</div><div className="t-xs t-faint">{a.kind} · {a.mins} min</div></div>
                {a.status === 'done' ? <Pill icon="Check">Done</Pill> : a.mode === 'video' ? <Btn kind="soft" size="sm" icon="Video" onClick={() => go(`/c/video?patient=${p.id}`)}>Start</Btn> : <Pill icon="MapPin" tone="mute">Clinic</Pill>}
              </div>
            );
          })}
        </Card>
      </InView>

      <SectionTitle sub="Steady against their own baselines">Doing well</SectionTitle>
      <div className="stack gap-10">
        {rest.map((r, i) => <PatientRow key={r.p.id} r={r} i={i} compact />)}
      </div>

      {good.length > 0 && (
        <InView className="mt-20">
          <Card tint="butter" className="row-flex gap-12">
            <div className="ico-dot lg" style={{ background: 'var(--glass-soft)' }}><Icon name="Sunrise" size={24} /></div>
            <div className="grow"><div className="bold">Good news</div><div className="t-sm t-soft">{good.map((g) => g.p.name.split(' ')[0]).join(', ')} {good.length > 1 ? 'are' : 'is'} sitting above {good.length > 1 ? 'their' : 'their'} personal baseline. Worth a kind word at the next visit.</div></div>
          </Card>
        </InView>
      )}
    </Screen>
  );
}

