import { useRef, useState, useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import { useSize } from './ui.jsx';
import { smoothPath, clamp } from '../lib/util.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function runs(points) {
  // split into runs of consecutive valid points
  const out = [];
  let cur = [];
  points.forEach((p) => {
    if (p) cur.push(p);
    else if (cur.length) { out.push(cur); cur = []; }
  });
  if (cur.length) out.push(cur);
  return out;
}

/** Soft line chart with a personal-baseline band. No red, no alarming slopes. */
export function BandChart({ values, band, height = 110, color = 'var(--chart-line)', labels, format, pad = 0.18, dots = true, interactive = true, showBand = true, tone, extra }) {
  const ref = useRef(null);
  const { w } = useSize(ref);
  const gid = useId().replace(/:/g, '');
  const [hover, setHover] = useState(null);
  const H = height;
  const P = { l: 6, r: 10, t: 12, b: labels ? 22 : 8 };
  const valid = values.filter(isNum);
  const geom = useMemo(() => {
    if (!w || !valid.length) return null;
    let lo = Math.min(...valid, ...(band && showBand ? band : []), ...(extra ? extra.flat().filter(isNum) : []));
    let hi = Math.max(...valid, ...(band && showBand ? band : []), ...(extra ? extra.flat().filter(isNum) : []));
    const span = hi - lo || 1;
    lo -= span * pad;
    hi += span * pad;
    const x = (i) => P.l + (i / Math.max(1, values.length - 1)) * (w - P.l - P.r);
    const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
    const pts = values.map((v, i) => (isNum(v) ? [x(i), y(v), i, v] : null));
    return { x, y, pts, lo, hi };
  }, [w, values, band, H, pad, showBand, extra]);

  if (!geom) return <div ref={ref} style={{ height: H }} />;
  const { x, y, pts } = geom;
  const segs = runs(pts);
  const linePaths = segs.map((s) => smoothPath(s.map((p) => [p[0], p[1]]), 0.9));
  const areaPaths = segs.map((s, i) => (s.length > 1 ? `${linePaths[i]} L${s[s.length - 1][0]},${H - P.b} L${s[0][0]},${H - P.b} Z` : ''));
  const lastIdx = (() => { for (let i = pts.length - 1; i >= 0; i--) if (pts[i]) return i; return -1; })();

  const onMove = (e) => {
    if (!interactive) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const i = clamp(Math.round(((px - P.l) / (w - P.l - P.r)) * (values.length - 1)), 0, values.length - 1);
    setHover(i);
  };

  return (
    <div
      ref={ref}
      style={{ position: 'relative', height: H, touchAction: 'pan-y' }}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => setHover(null)}
      onPointerUp={() => setTimeout(() => setHover(null), 1400)}
    >
      <svg width={w} height={H} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P.l} x2={w - P.r} y1={P.t + f * (H - P.t - P.b)} y2={P.t + f * (H - P.t - P.b)} stroke="var(--chart-grid)" strokeDasharray="2 6" />
        ))}
        {band && showBand && (
          <motion.rect
            x={P.l}
            width={w - P.l - P.r}
            rx="10"
            fill="var(--chart-band)"
            initial={{ opacity: 0, scaleY: 0.2 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 0.8, 0.28, 1] }}
            style={{ transformOrigin: `0 ${(y(band[0]) + y(band[1])) / 2}px` }}
            y={Math.min(y(band[0]), y(band[1]))}
            height={Math.abs(y(band[0]) - y(band[1]))}
          />
        )}
        {extra &&
          extra.map((ex, k) => {
            const p = ex.map((v, i) => (isNum(v) ? [x(i), y(v)] : null)).filter(Boolean);
            return p.length > 1 ? <path key={k} d={smoothPath(p, 0.9)} stroke={color} strokeWidth="1.6" strokeDasharray="3 5" fill="none" opacity="0.5" /> : null;
          })}
        {areaPaths.map((d, i) => d && (
          <motion.path key={`a${i}`} d={d} fill={`url(#a${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.9 }} />
        ))}
        {linePaths.map((d, i) => (
          <motion.path
            key={`l${i}`}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.15 + i * 0.2, ease: [0.22, 0.8, 0.28, 1] }}
          />
        ))}
        {dots &&
          pts.map((p, i) =>
            p && (segs.find((s) => s.includes(p))?.length === 1 || i === lastIdx) ? (
              <g key={i}>
                {i === lastIdx && (
                  <circle cx={p[0]} cy={p[1]} r="9" fill={color} opacity="0.18">
                    <animate attributeName="r" values="5;12;5" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={p[0]} cy={p[1]} r="4.5" fill="var(--card-solid)" stroke={color} strokeWidth="2.5" />
              </g>
            ) : null
          )}
        {labels &&
          labels.map((l, i) => (
            <text key={i} x={x(i)} y={H - 4} fontSize="10.5" fill="var(--ink-3)" textAnchor="middle" fontWeight="600">
              {l}
            </text>
          ))}
        {hover != null && pts[hover] && (
          <g>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={P.t} y2={H - P.b} stroke={color} strokeOpacity="0.4" strokeDasharray="3 4" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r="6" fill={color} stroke="var(--card-solid)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {hover != null && pts[hover] && (
        <div
          style={{
            position: 'absolute',
            left: clamp(pts[hover][0] - 44, 0, w - 88),
            top: -6,
            minWidth: 88,
            textAlign: 'center',
            padding: '4px 10px',
            borderRadius: 12,
            background: 'rgba(32,51,43,.92)',
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 650,
            pointerEvents: 'none',
          }}
        >
          {format ? format(values[hover]) : values[hover]}
        </div>
      )}
    </div>
  );
}

/** Tiny inline sparkline */
export function Spark({ values, width = 84, height = 30, color = 'var(--chart-line)', band, fill = true }) {
  const gid = useId().replace(/:/g, '');
  const v = values.filter(isNum);
  if (v.length < 2) return <div style={{ width, height }} />;
  let lo = Math.min(...v, ...(band || [])),
    hi = Math.max(...v, ...(band || []));
  const span = hi - lo || 1;
  lo -= span * 0.1;
  hi += span * 0.1;
  const x = (i) => 3 + (i / (values.length - 1)) * (width - 6);
  const y = (val) => 3 + (1 - (val - lo) / (hi - lo)) * (height - 6);
  const pts = values.map((val, i) => (isNum(val) ? [x(i), y(val)] : null));
  const segs = runs(pts);
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`s${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {band && <rect x="0" width={width} y={Math.min(y(band[0]), y(band[1]))} height={Math.abs(y(band[0]) - y(band[1]))} rx="4" fill="var(--chart-band)" />}
      {segs.map((s, i) => {
        const d = smoothPath(s, 0.9);
        return (
          <g key={i}>
            {fill && s.length > 1 && <path d={`${d} L${s[s.length - 1][0]},${height} L${s[0][0]},${height}Z`} fill={`url(#s${gid})`} />}
            <motion.path d={d} stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.2 }} />
          </g>
        );
      })}
      {(() => {
        const last = [...pts].reverse().find(Boolean);
        return last ? <circle cx={last[0]} cy={last[1]} r="3.2" fill={color} /> : null;
      })()}
    </svg>
  );
}

/** Concentric 24h rings — each ring is a night; arcs show when sleep happened. */
export function CircadianRings({ series, size = 260, nights = 7 }) {
  const data = series.slice(-nights);
  const cx = size / 2,
    cy = size / 2;
  const R0 = size / 2 - 14;
  const gap = Math.min(22, (R0 - 40) / nights);
  const ang = (h) => (((h % 24) + 24) % 24) / 24 * 2 * Math.PI - Math.PI / 2;
  const arc = (r, h0, h1) => {
    const a0 = ang(h0);
    let a1 = ang(h1);
    if (a1 < a0) a1 += 2 * Math.PI;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Sleep timing over the last week">
      <defs>
        <linearGradient id="circ-sleep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c6bbea" />
          <stop offset="1" stopColor="#8878c8" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R0 + 8} fill="none" stroke="var(--line)" />
      {[0, 6, 12, 18].map((h) => {
        const a = ang(h);
        const lx = cx + (R0 + 20) * Math.cos(a);
        const ly = cy + (R0 + 20) * Math.sin(a) + 3.5;
        return (
          <text key={h} x={lx} y={ly} fontSize="10.5" textAnchor="middle" fill="var(--ink-3)" fontWeight="650">
            {h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
          </text>
        );
      })}
      {data.map((r, i) => {
        const rad = R0 - (nights - 1 - i) * gap;
        const base = <circle key={`b${i}`} cx={cx} cy={cy} r={rad} fill="none" stroke="var(--line)" strokeWidth="10" opacity="0.7" />;
        if (!isNum(r.sleepMid) || !isNum(r.sleepDur)) return base;
        const s0 = r.sleepMid - r.sleepDur / 2;
        const s1 = r.sleepMid + r.sleepDur / 2;
        return (
          <g key={i}>
            {base}
            <motion.path
              d={arc(rad, s0, s1)}
              fill="none"
              stroke="url(#circ-sleep)"
              strokeWidth="10"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: i === data.length - 1 ? 1 : 0.55 + (i / data.length) * 0.4 }}
              transition={{ duration: 1.1, delay: 0.2 + i * 0.12, ease: [0.22, 0.8, 0.28, 1] }}
            />
          </g>
        );
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="12" fill="var(--ink-3)" fontWeight="650" letterSpacing=".08em">LAST</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="20" fontFamily="Fraunces Variable, serif" fill="var(--ink)" fontWeight="560">{data.length} nights</text>
    </svg>
  );
}

