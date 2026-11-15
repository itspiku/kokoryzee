import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { getBlob } from '../lib/idb.js';
import { fmtClock } from '../lib/util.js';

/** Voice recorder hook — on-device only. Falls back to "unavailable" when mic is blocked. */
export function useRecorder() {
  const [state, setState] = useState('idle'); // idle | recording | unavailable
  const [seconds, setSeconds] = useState(0);
  const [bars, setBars] = useState(() => new Array(36).fill(0.05));
  const r = useRef({});

  const cleanup = useCallback(() => {
    const x = r.current;
    clearInterval(x.timer);
    cancelAnimationFrame(x.raf);
    try { x.stream?.getTracks().forEach((t) => t.stop()); } catch {}
    try { x.ctx?.close(); } catch {}
  }, []);
  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const x = r.current;
      x.stream = stream;
      x.chunks = [];
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
      x.rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      x.rec.ondataavailable = (e) => e.data.size && x.chunks.push(e.data);
      x.rec.start(250);
      const AC = window.AudioContext || window.webkitAudioContext;
      x.ctx = new AC();
      const src = x.ctx.createMediaStreamSource(stream);
      const an = x.ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const t0 = Date.now();
      x.t0 = t0;
      x.timer = setInterval(() => setSeconds((Date.now() - t0) / 1000), 200);
      const loop = () => {
        x.raf = requestAnimationFrame(loop);
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const lvl = Math.min(1, Math.sqrt(sum / buf.length) * 5);
        setBars((b) => [...b.slice(1), 0.06 + lvl * 0.94]);
      };
      loop();
      setSeconds(0);
      setState('recording');
      return true;
    } catch {
      setState('unavailable');
      return false;
    }
  }, []);

  const stop = useCallback(() => new Promise((resolve) => {
    const x = r.current;
    if (!x.rec || x.rec.state === 'inactive') { cleanup(); setState('idle'); return resolve(null); }
    x.rec.onstop = () => {
      const blob = new Blob(x.chunks, { type: x.rec.mimeType || 'audio/webm' });
      const dur = (Date.now() - (x.t0 || Date.now())) / 1000;
      cleanup();
      setState('idle');
      resolve({ blob, duration: dur });
    };
    x.rec.stop();
  }), [cleanup]);

  return { state, seconds, bars, start, stop, reset: () => setState('idle') };
}

