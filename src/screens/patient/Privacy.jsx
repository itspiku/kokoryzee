import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, InView, Switch, SectionTitle, Pill, TopBar, Confirm, toast } from '../../components/ui.jsx';
import { go, back } from '../../lib/nav.js';
import { useStore, actions, getState } from '../../lib/store.js';
import { DOCTOR } from '../../data/content.js';
import { downloadText, timeAgo, fmtDay, fmtTime } from '../../lib/util.js';

function Group({ icon, title, blurb, who, children, i = 0 }) {
  return (
    <InView delay={i * 0.04}>
      <Card className="consent-group">
        <div className="row-flex gap-12">
          <div className="ico-dot lg"><Icon name={icon} size={24} /></div>
          <div className="grow">
            <div className="h3">{title}</div>
            <div className="t-sm t-soft mt-4">{blurb}</div>
          </div>
        </div>
        <div className="t-xs t-faint mt-8" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="Eye" size={13} /> {who}</div>
        <div className="consent-rows">{children}</div>
      </Card>
    </InView>
  );
}
function Row({ t, d, on, set }) {
  return (
    <div className="consent-row">
      <div className="grow"><div className="bold t-sm">{t}</div>{d && <div className="t-xs t-faint">{d}</div>}</div>
      <Switch on={on} onChange={set} label={t} />
    </div>
  );
}

export default function Privacy() {
  const c = useStore((s) => s.consent);
  const audit = useStore((s) => s.audit);
  const [wipe, setWipe] = useState(false);
  const set = actions.setConsent;
  const mine = audit.filter((a) => a.role !== 'patient').slice(0, 6);

  const exportData = () => {
    const s = getState();
    const data = { exportedAt: new Date().toISOString(), note: 'Everything Kokoryze holds about you in this prototype. It never leaves your device.', consent: s.consent, checkins: s.checkins, journal: s.journal.map(({ audioId, ...j }) => j), letters: s.letters.map(({ audioId, photos, ...l }) => l), feedback: s.feedback, circle: s.circle.map(({ perms, name, rel }) => ({ name, rel, perms })), accessLog: s.audit };
    downloadText('kokoryze-my-data.json', JSON.stringify(data, null, 2));
    toast('Your data is downloading', { icon: 'Download' });
  };

  return (
    <Screen tabs={false}>
      <TopBar backTo="/p/me" sub="Privacy & consent" title="You’re in control" />
      <Rise>
        <Card tint="sage" className="row-flex gap-12">
          <div className="ico-dot lg" style={{ background: 'var(--glass-soft)' }}><Icon name="ShieldCheck" size={26} /></div>
          <div className="grow t-sm t-soft">Everything is off unless you switch it on. Every change and every access is logged below. Turning something off takes effect immediately.</div>
        </Card>
      </Rise>

      <div className="stack gap-14" style={{ gap: 14, marginTop: 18 }}>
        <Group i={0} icon="User" title="My account" blurb="Who you are in Kokoryze." who="Visible to: you and your care team">
          <Row t="Alex Morgan" d="Linked with Harbour Mind Clinic · patient since August" on set={() => toast('Account details are managed by your clinic in this prototype.', { icon: 'Info' })} />
        </Group>

        <Group i={1} icon="Watch" title="Watch & wearable" blurb="Signals read quietly in the background." who={`Summaries visible to: you and ${DOCTOR.short}`}>
          <Row t="Sleep & heart rate" d="Timing, duration, resting HR, HRV" on={c.wearable.sleep && c.wearable.hr} set={(v) => { set('wearable', 'sleep', v); set('wearable', 'hr', v); }} />
          <Row t="Movement" d="Steps and active minutes" on={c.wearable.activity} set={(v) => set('wearable', 'activity', v)} />
          <Row t="Skin temperature" d="If your watch measures it" on={c.wearable.temp} set={(v) => set('wearable', 'temp', v)} />
        </Group>

        <Group i={2} icon="Smartphone" title="Phone patterns" blurb="Optional. Never names, content or locations." who={`Summaries visible to: you and ${DOCTOR.short}`}>
          <Row t="Night-time phone use" d="When the screen is on after midnight" on={c.phone.night} set={(v) => set('phone', 'night', v)} />
          <Row t="How many people I’m in touch with" d="A count only — no names, no messages" on={c.phone.social} set={(v) => set('phone', 'social', v)} />
          <Row t="Total screen time" on={c.phone.screen} set={(v) => set('phone', 'screen', v)} />
        </Group>

        <Group i={3} icon="Brain" title="Brain imaging & EEG" blurb="Data your clinic shares to build your brain twin." who={`Visible to: ${DOCTOR.short} only`}>
          <Row t="EEG recordings" on={c.imaging.eeg} set={(v) => set('imaging', 'eeg', v)} />
          <Row t="MRI scans" on={c.imaging.mri} set={(v) => set('imaging', 'mri', v)} />
        </Group>

        <Group i={4} icon="Users" title="My circle" blurb="The people you trust." who="Visible to: only the people you add — see each person’s settings in Circle">
          <Row t="Let my circle see “I’m okay”" on={c.circle.share} set={(v) => set('circle', 'share', v)} />
          <button className="link-row" onClick={() => go('/p/circle')}>Choose what each person sees <Icon name="ChevronRight" size={16} /></button>
        </Group>

        <Group i={5} icon="FileText" title="Shared before visits" blurb={`The one-page summary ${DOCTOR.short} sees.`} who={`Visible to: ${DOCTOR.short}`}>
          <Row t="Insights & patterns" on={c.shareDoctor.insights} set={(v) => set('shareDoctor', 'insights', v)} />
          <Row t="“Weather inside” check-ins" on={c.shareDoctor.checkins} set={(v) => set('shareDoctor', 'checkins', v)} />
          <Row t="Journal entries I choose to share" d="Only entries you individually mark" on={c.shareDoctor.journal} set={(v) => set('shareDoctor', 'journal', v)} />
        </Group>

        <Group i={6} icon="FlaskConical" title="Research" blurb="Help improve care for others. Always optional." who="De-identified, aggregated, reviewable. Off by default.">
          <Row t="Contribute de-identified data" d="You can withdraw at any time" on={c.research} set={(v) => set('research', null, v)} />
        </Group>
      </div>

      <SectionTitle sub="Everyone who has looked at your information">Who has looked</SectionTitle>
      <InView>
        <Card>
          <div className="stack">
            {mine.map((a, i) => (
              <div key={a.id} className="audit-row">
                <div className="audit-dot" style={{ background: a.role === 'system' ? 'var(--lav-400)' : 'var(--primary-2)' }} />
                <div className="grow">
                  <div className="t-sm"><b>{a.actor}</b> · {a.action}</div>
                  {a.detail && <div className="t-xs t-faint">{a.detail}</div>}
                </div>
                <span className="t-xs t-faint nowrap">{timeAgo(a.t)}</span>
              </div>
            ))}
          </div>
        </Card>
      </InView>

      <SectionTitle>Your data</SectionTitle>
      <div className="stack gap-8">
        <Btn kind="soft" block icon="Download" onClick={exportData}>Download everything I’ve shared</Btn>
        <Btn kind="ghost" block icon="Trash2" onClick={() => setWipe(true)} style={{ color: 'var(--rose-500)' }}>Delete my data from this device</Btn>
      </div>
      <p className="t-xs t-faint center mt-16" style={{ padding: '0 14px' }}>In this prototype all data stays in your browser. A production Kokoryze would encrypt data in transit and at rest, enforce role-based access, and keep an immutable audit log.</p>

      <Confirm open={wipe} danger onClose={() => setWipe(false)} title="Delete everything?" body="This erases your journal, letters, check-ins, voice recordings and settings from this device. It can’t be undone." confirm="Yes, delete everything" onConfirm={async () => { await actions.resetAll(); toast('All cleared. Starting fresh.', { icon: 'Check' }); go('/welcome', { dir: 'swap' }); }} />
    </Screen>
  );
}
