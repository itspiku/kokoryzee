import { useEffect, useState, useRef } from 'react';
import { engine } from './engine.js';

export function useEngine() {
  const [s, setS] = useState(engine.snapshot());
  useEffect(() => {
    setS(engine.snapshot());
    return engine.on('state', setS);
  }, []);
  return s;
}

/** Subscribe to engine events without causing re-renders; the callback should be stable-ish. */
export function useEngineEvent(evt, fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => engine.on(evt, (d) => ref.current(d)), [evt]);
}

/** Remaining seconds for the sleep timer (updates every second while a timer is set). */
export function useTimerLeft() {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const tick = () => setLeft(engine.endsAt ? Math.max(0, Math.round((engine.endsAt - Date.now()) / 1000)) : null);
    tick();
    const i = setInterval(tick, 1000);
    const off = engine.on('state', tick);
    return () => {
      clearInterval(i);
      off();
    };
  }, []);
  return left;
}
