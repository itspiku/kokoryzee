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

