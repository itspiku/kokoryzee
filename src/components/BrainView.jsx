import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon.jsx';
import { BRAIN_REGIONS } from '../data/content.js';

/** Lazy three.js brain. Falls back to a flat illustration when WebGL is unavailable. */
export default function BrainView({ activity, layer = 'activity', links, selected, onPick, height = 340, focusId, label }) {
  const box = useRef(null);
  const api = useRef(null);
  const [state, setState] = useState('loading'); // loading | ready | nogl

  useEffect(() => {
    let alive = true;
    let b;
    (async () => {
      try {
        const test = document.createElement('canvas');
        if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');
        const { createBrain } = await import('../engine/brain3d.js');
        if (!alive) return;
        b = createBrain(box.current, { onPick: (id) => onPickRef.current?.(id) });
        api.current = b;
        setState('ready');
      } catch (e) {
        console.warn('Brain 3D unavailable:', e);
        if (alive) setState('nogl');
      }
    })();
    return () => { alive = false; b?.dispose(); api.current = null; };
  }, []);

  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => { api.current?.setActivity(activity || {}); }, [activity, state]);
  useEffect(() => { api.current?.setLayer(layer); }, [layer, state]);
  useEffect(() => { if (links) api.current?.setLinks(links); }, [links, state]);
  useEffect(() => { api.current?.select(selected || null); }, [selected, state]);
  useEffect(() => { if (focusId) api.current?.focus(String(focusId).split(':')[0]); }, [focusId, state]);

  return (
    <div className="brain-wrap" style={{ height }}>
      <div className="brain-glow" />
      <div ref={box} className="brain-canvas" />
      <div className="brain-loading" style={{ opacity: state === 'loading' ? 1 : 0, transition: 'opacity .9s ease', pointerEvents: 'none' }}>
        <div className="brain-ring"><i /><i /><i /></div>
        <span className="t-xs">Growing the cortex…</span>
      </div>
      {state === 'nogl' && <Fallback activity={activity} onPick={onPick} selected={selected} />}
      {state === 'ready' && (
        <div className="brain-hint"><Icon name="Hand" size={13} /> Drag to rotate · tap a region</div>
      )}
      {label}
    </div>
  );
}

function Fallback({ activity, onPick, selected }) {
  return (
    <div className="brain-fallback">
      <svg viewBox="0 0 300 220" width="100%" height="100%">
        <path d="M60 120c-10-50 30-86 88-86 62 0 102 34 92 90-6 38-40 58-84 56-30-1-52-10-70-26-12-10-22-22-26-34z" fill="rgba(143,211,196,.25)" stroke="rgba(143,211,196,.6)" strokeWidth="2" />
        {BRAIN_REGIONS.map((r, i) => {
          const x = 150 + r.pos[2] * 70, y = 120 - r.pos[1] * 90;
          const a = activity?.[r.id] ?? 0.5;
          return (
            <g key={r.id} onClick={() => onPick?.(r.id)} style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r={14 + a * 14} fill={r.color} opacity={0.25 + a * 0.5} />
              <circle cx={x} cy={y} r="5" fill={r.color} stroke={selected === r.id ? '#fff' : 'none'} strokeWidth="2" />
            </g>
          );
        })}
      </svg>
      <div className="t-xs center" style={{ opacity: 0.7 }}>3D view needs WebGL — showing a flat map.</div>
    </div>
  );
}
