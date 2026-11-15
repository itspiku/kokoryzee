import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { BandChart, CircadianRings } from '../../components/charts.jsx';
import { Btn, Card, Rise, InView, SectionTitle, Pill, TopBar } from '../../components/ui.jsx';
import { go } from '../../lib/nav.js';
import { useStore, responseStats } from '../../lib/store.js';
import { usePatientData } from '../../engine/useData.js';
import { patientCards, weekInWords, valueText } from '../../engine/insights.js';
import { fmtShortDay, startOfDay, addDays } from '../../lib/util.js';
import { DOCTOR } from '../../data/content.js';

const toneColor = { steady: 'var(--chart-line)', soft: '#d9964e', bright: '#d9783f' };

function Confidence({ label }) {
  const n = label === 'Fairly sure' ? 4 : label === 'Less sure' ? 2 : 1;
  return (
    <span className="conf-dots" aria-label={label}>
      {[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}
    </span>
  );
}

function InsightCard({ c, series, open, onToggle, i }) {
  const labels = useMemo(() => series.slice(-14).map((r, k) => (k % 2 === 1 ? fmtShortDay(r.date).slice(0, 1) : '')), [series]);
  return (
    <InView delay={i * 0.03}>
      <Card className="insight" style={{ padding: 0, overflow: 'hidden' }}>
        <button className="insight-head" onClick={onToggle} aria-expanded={open}>
          <div className="ico-dot lg" style={{ background: `color-mix(in srgb, ${toneColor[c.tone]} 18%, transparent)`, color: toneColor[c.tone] }}><Icon name={c.icon} size={24} /></div>
          <div className="grow" style={{ textAlign: 'left' }}>
            <div className="t-cap">{c.title}</div>
            <div className="serif" style={{ fontSize: 19, lineHeight: 1.25, marginTop: 2 }}>{c.headline}</div>
          </div>
          <motion.span animate={{ rotate: open ? 180 : 0 }}><Icon name="ChevronDown" size={20} style={{ opacity: 0.5 }} /></motion.span>
        </button>
        <div style={{ padding: '0 18px 6px' }}>
          <p className="t-sm t-soft">{c.detail}</p>
          <div style={{ marginTop: 10 }}>
            <BandChart values={c.series} band={c.band} height={104} labels={labels} color={toneColor[c.tone]} format={c.unitFmt} />
          </div>
          <div className="t-xs t-faint row-flex gap-6" style={{ marginTop: 2 }}><span className="band-key" /> Your usual range</div>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 28 }} style={{ overflow: 'hidden' }}>
              <div className="explain">
                <div className="ex-block">
                  <div className="ex-t"><Icon name="Layers" size={15} /> What contributed</div>
                  {c.contributors.length ? <ul>{c.contributors.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="t-sm t-soft">Only this signal, on its own.</p>}
                </div>
                <div className="ex-block">
                  <div className="ex-t"><Icon name="Gauge" size={15} /> How sure are we? <Confidence label={c.confidence.label} /></div>
                  <p className="t-sm t-soft"><b>{c.confidence.label}.</b> {c.confidence.text}</p>
                </div>
                <div className="ex-block">
                  <div className="ex-t"><Icon name="Lightbulb" size={15} /> Why it matters</div>
                  <p className="t-sm t-soft">{c.why}</p>
                </div>
                {c.suggestion && <Btn kind="soft" size="sm" iconRight="ArrowRight" onClick={() => go(c.suggestion.to)}>{c.suggestion.label}</Btn>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button className="insight-foot" onClick={onToggle}>{open ? 'Show less' : 'What’s behind this?'}</button>
      </Card>
    </InView>
  );
}

export default function Insights({ query }) {
  const { series, analysis } = usePatientData('alex');
  const feedback = useStore((s) => s.feedback);
  const cognitive = useStore((s) => s.cognitive);
  const cards = useMemo(() => patientCards(series, analysis), [series, analysis]);
  const stats = useMemo(() => Object.values(responseStats(feedback)).filter((o) => o.n >= 3).sort((a, b) => b.rate - a.rate).slice(0, 5), [feedback]);
  const [open, setOpen] = useState(query?.focus || null);
  useEffect(() => { setOpen(query?.focus || null); }, [query?.focus]);

  return (
    <Screen tabs={false}>
      <TopBar backTo="/p/home" sub="Insights" title="Your patterns" />
      <Rise i={0}>
        <Card tint="sage" className="row-flex gap-12">
          <Koko size={72} mood="calm" glow={false} />
          <div>
            <div className="t-cap">This week, in plain words</div>
            <p className="serif mt-4" style={{ fontSize: 18, lineHeight: 1.3 }}>{weekInWords(analysis)}</p>
          </div>
        </Card>
      </Rise>
      <p className="t-xs t-faint mt-8 center">No scores. No streaks. Never compared with anyone else — only with your own usual.</p>

      <SectionTitle sub="Each ring is one night. The arc shows when you slept.">Your daily rhythm</SectionTitle>
      <InView>
        <Card className="center" style={{ display: 'grid', placeItems: 'center' }}>
          <CircadianRings series={series} size={270} />
          <div className="row-flex gap-16 t-xs t-faint mt-8"><span className="row-flex gap-6"><i className="leg" style={{ background: 'var(--lav-400)' }} /> Asleep</span><span className="row-flex gap-6"><i className="leg" style={{ background: 'var(--line-2)' }} /> Awake</span></div>
        </Card>
      </InView>

      <SectionTitle sub="Tap any card to see what’s behind it">What your body has been saying</SectionTitle>
      <div className="stack gap-14" style={{ gap: 14 }}>
        {cards.map((c, i) => <InsightCard key={c.id} c={c} series={series} i={i} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />)}
      </div>

      <SectionTitle sub="From your own feedback — never compared with others">What tends to help you</SectionTitle>
      <InView>
        <Card>
          <div className="stack gap-14" style={{ gap: 14 }}>
            {stats.map((s, i) => (
              <div key={s.kind}>
                <div className="row-flex between"><span className="bold t-sm">{s.label}</span><span className="t-xs t-faint">helped {s.helpedCount} of {s.n}</span></div>
                <div className="help-bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${Math.round(s.rate * 100)}%` }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.1, duration: 1, ease: [0.22, 0.8, 0.28, 1] }} /></div>
              </div>
            ))}
          </div>
          <p className="t-xs t-faint mt-12">The more you tell Kokoryze what helps, the better its gentle suggestions get.</p>
        </Card>
      </InView>

      <SectionTitle sub="Optional · short · never scored">Thinking & memory</SectionTitle>
      <InView>
        <Card className="row-flex gap-12" onClick={() => go('/p/games')}>
          <div className="ico-dot lg"><Icon name="Brain" size={24} /></div>
          <div className="grow">
            <div className="bold">{cognitive.length ? `${cognitive.length} little game${cognitive.length > 1 ? 's' : ''} played` : 'Two tiny games, whenever you like'}</div>
            <div className="t-sm t-soft">{cognitive.length ? 'See how you’re doing against your own usual.' : 'A reaction game and a memory game. About a minute each.'}</div>
          </div>
          <Icon name="ChevronRight" size={18} style={{ opacity: 0.5 }} />
        </Card>
      </InView>

      <InView className="mt-24">
        <Card tint="sky" className="row-flex gap-12" onClick={() => go('/p/privacy')}>
          <div className="ico-dot" style={{ background: 'var(--glass-soft)' }}><Icon name="ShieldCheck" size={19} /></div>
          <div className="grow">
            <div className="bold t-sm">Shared with {DOCTOR.short} before visits</div>
            <div className="t-xs t-soft">A one-page summary of these patterns. You choose what’s included.</div>
          </div>
          <Icon name="ChevronRight" size={16} style={{ opacity: 0.5 }} />
        </Card>
      </InView>
      <p className="t-xs t-faint center mt-16" style={{ padding: '0 12px' }}>Kokoryze notices patterns in your own data. It can’t diagnose anything, and a few unusual days are very normal. If you’re worried, talk to {DOCTOR.short}.</p>
    </Screen>
  );
}
