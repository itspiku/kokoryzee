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

