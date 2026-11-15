import { useEffect, useMemo, useRef, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrainView from '../../components/BrainView.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Pill, Segmented, Slider, Avatar, toast, useSize } from '../../components/ui.jsx';
import { useStore, actions } from '../../lib/store.js';
import { getPatientData } from '../../engine/useData.js';
import { makeTwin, associations } from '../../engine/twin.js';
import { project, confidenceLabel } from '../../engine/baseline.js';
import { valueText } from '../../engine/insights.js';
import { SIGNAL_META } from '../../data/signals.js';
import { BRAIN_REGIONS, PATIENTS } from '../../data/content.js';
import { fmtDay, fmtTime, timeAgo, haptic, smoothPath, clamp } from '../../lib/util.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function ProjectionChart({ drift, horizon = 14, shown = 42 }) {
  const ref = useRef(null);
  const { w } = useSize(ref);
  const gid = useId().replace(/:/g, '');
  const hist = drift.slice(-shown);
  const proj = useMemo(() => project(drift, horizon), [drift, horizon]);
  const H = 150, P = { l: 6, r: 8, t: 12, b: 22 };
  const N = shown + horizon;
  const all = [...hist.filter(isNum), ...proj.lo, ...proj.hi, -1.2, 1.2];
  const lo = Math.min(...all), hi = Math.max(...all);
  const x = (i) => P.l + (i / (N - 1)) * (w - P.l - P.r);
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo || 1)) * (H - P.t - P.b);
  if (!w) return <div ref={ref} style={{ height: H }} />;
  const pts = hist.map((v, i) => (isNum(v) ? [x(i), y(v)] : null)).filter(Boolean);
  const last = pts[pts.length - 1];
  const x0 = x(shown - 1);
  const mid = [[x0, last ? last[1] : y(0)], ...proj.mid.map((v, i) => [x(shown + i), y(v)])];
  const up = [[x0, mid[0][1]], ...proj.hi.map((v, i) => [x(shown + i), y(v)])];
  const dn = [[x0, mid[0][1]], ...proj.lo.map((v, i) => [x(shown + i), y(v)])];
  const band = `${smoothPath(up, 0.9)} L${dn[dn.length - 1][0]},${dn[dn.length - 1][1]} ${smoothPath([...dn].reverse(), 0.9).replace('M', 'L')} Z`;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width={w} height={H} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`p${gid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8fd3c4" stopOpacity="0.35" /><stop offset="1" stopColor="#8fd3c4" stopOpacity="0.05" /></linearGradient>
        </defs>
        <rect x={P.l} y={y(1)} width={w - P.l - P.r} height={y(-1) - y(1)} rx="8" fill="rgba(143,211,196,.1)" />
        <line x1={P.l} x2={w - P.r} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,.14)" strokeDasharray="3 5" />
        <rect x={x0} y={P.t} width={w - P.r - x0} height={H - P.t - P.b} fill="rgba(255,255,255,.035)" />
        <line x1={x0} x2={x0} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,.3)" strokeDasharray="2 4" />
        <motion.path d={band} fill={`url(#p${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }} />
        <motion.path d={smoothPath(pts, 0.9)} fill="none" stroke="#9fe3d3" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4 }} />
        <motion.path d={smoothPath(mid, 0.9)} fill="none" stroke="#9fe3d3" strokeWidth="2.4" strokeDasharray="4 6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.2, duration: 1 }} />
        {last && <circle cx={last[0]} cy={last[1]} r="5" fill="#0d1c1d" stroke="#9fe3d3" strokeWidth="2.5" />}
        <text x={P.l + 2} y={H - 4} fontSize="10.5" fill="rgba(255,255,255,.5)" fontWeight="600">{shown} days ago</text>
        <text x={x0} y={H - 4} fontSize="10.5" fill="rgba(255,255,255,.7)" fontWeight="700" textAnchor="middle">today</text>
        <text x={w - P.r} y={H - 4} fontSize="10.5" fill="rgba(255,255,255,.5)" fontWeight="600" textAnchor="end">+{horizon}d</text>
      </svg>
    </div>
  );
}

export default function TwinPanel({ patientId, onPatient, hidePicker }) {
  const data = useMemo(() => getPatientData(patientId), [patientId]);
  const { series, analysis, drift, patient, tms } = data;
  const twin = useMemo(() => makeTwin(series), [series]);
  const assoc = useMemo(() => associations(series), [series]);
  const consent = useStore((s) => s.consent);
  const allNotes = useStore((s) => s.twinNotes);
  const notes = useMemo(() => allNotes.filter((n) => n.patientId === patientId), [allNotes, patientId]);

  const [layer, setLayer] = useState('activity');
  const [di, setDi] = useState(series.length - 1);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState('dlpfc');
  const [focusId, setFocusId] = useState(null);
  const [note, setNote] = useState('');
  useEffect(() => { setDi(series.length - 1); setPlaying(false); }, [patientId, series.length]);

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setDi((d) => { if (d >= series.length - 1) { setPlaying(false); return d; } return d + 1; }), 90);
    return () => clearInterval(iv);
  }, [playing, series.length]);

  const activity = useMemo(() => twin.regionAt(di), [twin, di]);
  const links = useMemo(() => twin.links(di), [twin, di]);
  const prior = useMemo(() => twin.regionAt(Math.max(0, di - 14)), [twin, di]);
  const day = series[di];
  const sessionsDone = tms.filter((s) => s.x <= day.x).length;
  const region = BRAIN_REGIONS.find((r) => r.id === sel) || BRAIN_REGIONS[0];
  const dEnd = analysis.status;

  const pick = (id) => {
    haptic(10);
    if (!id) return;
    setSel(id);
    setFocusId(id + ':' + Date.now());
  };

  const saveNote = () => {
    if (!note.trim()) return;
    actions.addTwinNote(patientId, note.trim());
    setNote('');
    toast('Note added to the twin', { icon: 'Check' });
  };

  return (
    <div className="twin" data-theme="evening">
      {!hidePicker && (
        <div className="chips-scroll" style={{ padding: '2px 20px 10px' }}>
          {PATIENTS.map((p) => (
            <button key={p.id} className={`chip dark ${patientId === p.id ? 'on' : ''}`} onClick={() => onPatient?.(p.id)}>
              <Avatar name={p.name} hue={p.hue} size={22} style={{ boxShadow: 'none', fontSize: 9 }} /> {p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <div className="exp-banner"><Icon name="FlaskConical" size={15} /> <span><b>Experimental decision-support.</b> Region values are modelled <i>proxies</i> from this person’s own signals — not measurements of brain activity.</span></div>

      <div className="twin-stage">
        <BrainView
          height={330}
          activity={activity}
          layer={layer}
          links={links}
          selected={sel}
          onPick={pick}
          focusId={focusId}
          label={
            <>
              <div className="brain-legend"><i style={{ background: 'linear-gradient(90deg,#38a0ad,#ffb85c)' }} /><span>Lower</span><span style={{ marginLeft: 'auto' }}>Higher · own range</span></div>
              <div className="brain-date"><b>{fmtDay(day.date, { month: 'short', day: 'numeric' })}</b><span>TMS {sessionsDone}/30</span></div>
            </>
          }
        />
        <div className="layer-bar">
          {[['activity', 'Activity', 'Activity'], ['connectivity', 'Connectivity', 'Network'], ['anatomy', 'Regions', 'Layers']].map(([k, l, ic]) => (
            <button key={k} className={layer === k ? 'on' : ''} onClick={() => { haptic(8); setLayer(k); }}><Icon name={ic} size={15} /> {l}</button>
          ))}
        </div>
      </div>

      {/* time scrubber */}
      <div className="scrub">
        <button className="play-mini" onClick={() => { haptic(10); if (di >= series.length - 1) setDi(0); setPlaying(!playing); }} aria-label={playing ? 'Pause' : 'Play through time'}>
          <Icon name={playing ? 'Pause' : 'Play'} size={18} />
        </button>
        <div className="grow">
          <Slider value={di} min={0} max={series.length - 1} step={1} onChange={(v) => { setPlaying(false); setDi(v); }} color="#9fe3d3" label="Time" />
          <div className="row-flex between t-xs" style={{ opacity: 0.6, marginTop: -2 }}><span>{fmtDay(series[0].date, { month: 'short', day: 'numeric' })}</span><span>{di === series.length - 1 ? 'Today' : `${series.length - 1 - di} days ago`}</span></div>
        </div>
      </div>

      {/* regions */}
      <div className="region-grid">
        {BRAIN_REGIONS.map((r) => {
          const v = activity[r.id];
          const dv = v - prior[r.id];
          return (
            <motion.button key={r.id} className={`region ${sel === r.id ? 'on' : ''}`} onClick={() => pick(r.id)} whileTap={{ scale: 0.96 }} style={{ '--c': r.color }}>
              <div className="row-flex between"><span className="region-dot" /><span className="t-xs" style={{ opacity: 0.6 }}>{r.short}</span></div>
              <div className="region-val t-num">{Math.round(v * 100)}<small>%</small></div>
              <div className="region-bar"><motion.i animate={{ width: `${v * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div>
              <div className="t-xs" style={{ opacity: 0.65 }}>{dv > 0.03 ? '↗' : dv < -0.03 ? '↘' : '→'} {Math.abs(Math.round(dv * 100))} vs 2 wk</div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={region.id} className="twin-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          <div className="row-flex gap-10"><span className="region-dot big" style={{ '--c': region.color }} /><div><div className="h3">{region.name}</div><div className="t-xs" style={{ opacity: 0.65 }}>{region.tag}</div></div><div style={{ flex: 1 }} /><div className="serif" style={{ fontSize: 30 }}>{Math.round(activity[region.id] * 100)}<small style={{ fontSize: 14, opacity: 0.6 }}>%</small></div></div>
          <p className="t-sm mt-8" style={{ opacity: 0.8 }}>{region.blurb}</p>
          <div className="t-cap mt-12 mb-8" style={{ color: 'rgba(255,255,255,.5)' }}>What drives this estimate</div>
          <div className="stack gap-6">
            {region.drivers.map((k) => (
              <div key={k} className="row-flex between t-sm"><span style={{ opacity: 0.85 }}>{SIGNAL_META[k].label}</span><span className="t-num" style={{ opacity: 0.7 }}>{valueText(k, series[di][k] ?? series.slice(0, di + 1).map((r) => r[k]).filter(isNum).pop())}</span></div>
            ))}
          </div>
          {region.id === 'dlpfc' && <div className="tms-note"><Icon name="Crosshair" size={15} /> TMS target · session {sessionsDone} of 30 · {patient.focus}</div>}
        </motion.div>
      </AnimatePresence>

      {/* projection */}
      <div className="twin-section">
        <div className="t-cap" style={{ color: 'rgba(255,255,255,.55)' }}>If recent patterns continue</div>
        <div className="serif mt-4" style={{ fontSize: 20 }}>Change from personal baseline, next 14 days</div>
        <p className="t-xs mt-4" style={{ opacity: 0.6 }}>Dashed line is a damped-trend extrapolation. The shaded band is the uncertainty — it widens quickly, so treat it as a conversation aid, never a prediction.</p>
        <div style={{ marginTop: 10 }}><ProjectionChart drift={drift} /></div>
        <div className="row-flex gap-8 mt-8 wrap">
          <Pill tone="lav" icon="Gauge">Confidence {confidenceLabel(analysis.confidence).toLowerCase()} · {analysis.confidence.toFixed(2)}</Pill>
          <Pill tone="mute" icon="FlaskConical">Experimental</Pill>
        </div>
      </div>

      {/* associations */}
      <div className="twin-section">
        <div className="t-cap" style={{ color: 'rgba(255,255,255,.55)' }}>Signals that moved with self-reported mood</div>
        <div className="stack gap-12 mt-12">
          {assoc.map((a) => (
            <div key={a.key}>
              <div className="row-flex between t-sm"><span>{a.label}</span><span className="t-num" style={{ opacity: 0.7 }}>r = {a.r.toFixed(2)}</span></div>
              <div className="assoc-bar"><i style={{ left: a.r < 0 ? `${50 + a.r * 50}%` : '50%', width: `${Math.abs(a.r) * 50}%`, background: a.r > 0 ? '#8fd3c4' : '#c6a2e8' }} /></div>
            </div>
          ))}
        </div>
        <p className="t-xs mt-8" style={{ opacity: 0.55 }}>Association, not causation. Based on days with a mood check-in.</p>
      </div>

      {/* sources */}
      <div className="twin-section">
        <div className="t-cap" style={{ color: 'rgba(255,255,255,.55)' }}>Data sources & provenance</div>
        <div className="stack gap-8 mt-12">
          {[
            ['Watch', 'Check', `${series.filter((r) => r.wear).length} of ${series.length} days`, true],
            ['Phone patterns', consent.phone.night ? 'Check' : 'X', consent.phone.night ? 'Night use & contact count' : 'Patient has switched this off', consent.phone.night],
            ['Clinic EEG', consent.imaging.eeg ? 'Check' : 'X', consent.imaging.eeg ? '2 recordings imported (demo)' : 'Not shared', consent.imaging.eeg],
            ['MRI', consent.imaging.mri ? 'Check' : 'X', consent.imaging.mri ? 'Baseline scan · rendered on a generic template' : 'Not shared', consent.imaging.mri],
          ].map(([t, ic, d, on]) => (
            <div key={t} className="row-flex gap-10 t-sm"><Icon name={ic} size={15} stroke={2.6} style={{ color: on ? '#8fd3c4' : 'rgba(255,255,255,.35)' }} /><span className="bold" style={{ width: 100 }}>{t}</span><span style={{ opacity: 0.65 }}>{d}</span></div>
          ))}
        </div>
        <div className="t-xs mt-12" style={{ opacity: 0.55 }}>Brain shown is a generic stylised template, not this patient’s own anatomy. Model: kz-twin 0.2 (proxy).</div>
      </div>

      {/* notes */}
      <div className="twin-section">
        <div className="t-cap" style={{ color: 'rgba(255,255,255,.55)' }}>Clinician notes on this twin</div>
        <div className="stack gap-10 mt-12">
          {notes.map((n) => (
            <div key={n.id} className="note"><div className="t-sm">{n.text}</div><div className="t-xs" style={{ opacity: 0.5, marginTop: 4 }}>{n.by} · {timeAgo(n.t)}</div></div>
          ))}
          <div className="row-flex gap-8">
            <input className="field dark" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveNote()} />
            <button className="send-btn" onClick={saveNote} aria-label="Add note"><Icon name="Plus" size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
