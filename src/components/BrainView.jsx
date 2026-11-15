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

