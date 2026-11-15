import { useState } from 'react';
import { motion } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, Avatar, Switch, Segmented, SectionTitle, TopBar, Confirm, toast } from '../../components/ui.jsx';
import { go } from '../../lib/nav.js';
import { useStore, actions } from '../../lib/store.js';
import { DOCTOR } from '../../data/content.js';

const LINKS = [
  { icon: 'LineChart', t: 'My patterns', s: 'Plain-words insights', to: '/p/insights', tint: 'sage' },
  { icon: 'CalendarDays', t: 'Messages & visits', s: `${DOCTOR.short} · next appointment`, to: '/p/messages', tint: 'sky' },
  { icon: 'Mail', t: 'Letters to future me', s: 'From a better day', to: '/p/letters', tint: 'apricot' },
  { icon: 'Footprints', t: 'Going out', s: 'Gentle ideas', to: '/p/going-out', tint: 'butter' },
  { icon: 'Brain', t: 'Tiny brain games', s: 'Optional · never scored', to: '/p/games', tint: 'lav' },
  { icon: 'ShieldCheck', t: 'Privacy & consent', s: 'You’re in control', to: '/p/privacy', tint: 'sage' },
];

export default function Me() {
  const prefs = useStore((s) => s.prefs);
  const [reset, setReset] = useState(false);
  return (
    <Screen tabs={false}>
      <TopBar backTo="/p/home" sub="Profile" title="Me" />
      <Rise>
        <Card className="row-flex gap-16" style={{ gap: 16 }}>
          <Avatar name="Alex Morgan" hue="#e68d57" size={72} ring />
          <div className="grow">
            <div className="h2">Alex Morgan</div>
            <div className="t-sm t-soft">With Kokoryze since August</div>
            <div className="t-xs t-faint mt-4"><Icon name="Stethoscope" size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Care team: {DOCTOR.name}</div>
          </div>
          <Koko size={70} mood="happy" glow={false} />
        </Card>
      </Rise>

      <div className="stack gap-8" style={{ marginTop: 18 }}>
        {LINKS.map((l, i) => (
          <motion.div key={l.t} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <Card tight tint={l.tint} onClick={() => go(l.to)} className="row-flex gap-12">
              <div className="ico-dot" style={{ background: 'var(--glass-soft)' }}><Icon name={l.icon} size={19} /></div>
              <div className="grow"><div className="bold t-sm">{l.t}</div><div className="t-xs t-soft">{l.s}</div></div>
              <Icon name="ChevronRight" size={16} style={{ opacity: 0.4 }} />
            </Card>
          </motion.div>
        ))}
      </div>

      <SectionTitle>Make it feel right</SectionTitle>
      <Card>
        <div className="bold t-sm mb-8">Look</div>
        <Segmented id="theme" small value={prefs.theme} onChange={(v) => actions.setPref('theme', v)} options={[{ value: 'auto', label: 'Auto', icon: 'Sparkles' }, { value: 'day', label: 'Day', icon: 'Sun' }, { value: 'evening', label: 'Evening', icon: 'Moon' }]} />
        <div className="bold t-sm mb-8 mt-16">Home scene</div>
        <div className="chips-scroll" style={{ padding: '0 0 4px', margin: 0 }}>
          {['auto', 'morning', 'afternoon', 'evening', 'night'].map((s) => <button key={s} className={`chip ${prefs.scene === s ? 'on' : ''}`} onClick={() => actions.setPref('scene', s)} style={{ textTransform: 'capitalize' }}>{s}</button>)}
        </div>
        <hr className="divider" />
        <div className="row-flex gap-12 mb-12"><div className="grow"><div className="bold t-sm">Gentle vibrations</div><div className="t-xs t-faint">Soft haptic feedback</div></div><Switch on={prefs.haptics} onChange={(v) => actions.setPref('haptics', v)} label="Haptics" /></div>
        <div className="row-flex gap-12"><div className="grow"><div className="bold t-sm">Little chimes</div><div className="t-xs t-faint">Soft sounds when you finish something</div></div><Switch on={prefs.sound} onChange={(v) => actions.setPref('sound', v)} label="Chimes" /></div>
      </Card>

      <SectionTitle sub="This prototype has one clinician for now">Demo</SectionTitle>
      <Card tint="butter" className="stack gap-12">
        <div className="t-sm t-soft">Switch to the clinician app to see what {DOCTOR.short} sees — alerts, the brain twin, pre-visit brief and your messages, live.</div>
        <Btn kind="primary" icon="Stethoscope" onClick={() => { actions.setRole('clinician'); go('/c/overview', { dir: 'swap' }); }}>Open clinician app</Btn>
        <Btn kind="ghost" icon="RefreshCw" size="sm" onClick={() => setReset(true)}>Reset demo data</Btn>
      </Card>

      <div className="center mt-24 t-xs t-faint" style={{ padding: '0 16px' }}>
        <Icon name="Info" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Kokoryze is a monitoring and care-support concept. It is not a diagnostic tool, a therapist or a replacement for your clinician. Prototype · all data is simulated · v0.1
      </div>
      <Confirm open={reset} onClose={() => setReset(false)} title="Reset the demo?" body="This restores the sample patient, circle, journal and messages." confirm="Reset" onConfirm={async () => { await actions.resetAll(); toast('Demo reset', { icon: 'RefreshCw' }); go('/welcome', { dir: 'swap' }); }} />
    </Screen>
  );
}
