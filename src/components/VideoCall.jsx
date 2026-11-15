import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon.jsx';
import Koko from './Koko.jsx';
import { Avatar } from './ui.jsx';
import { fmtClock, haptic } from '../lib/util.js';
import { engine } from '../audio/engine.js';

/** Waiting room → connecting → live. Camera is only requested when the user turns it on. */
export default function VideoCall({ other, self, selfIsPatient, onEnd, sidebar, waitExtra }) {
  const [stage, setStage] = useState('waiting'); // waiting | connecting | live
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(false);
  const [camErr, setCamErr] = useState(false);
  const [secs, setSecs] = useState(0);
  const [talking, setTalking] = useState(false);
  const vid = useRef(null);
  const stream = useRef(null);

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const toggleCam = async () => {
    haptic(10);
    if (cam) {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setCam(false);
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setCam(true);
      setCamErr(false);
    } catch {
      setCamErr(true);
    }
  };
  useEffect(() => {
    if (cam && vid.current && stream.current) vid.current.srcObject = stream.current;
  }, [cam, stage]);

  useEffect(() => {
    if (stage !== 'live') return;
    const t0 = Date.now();
    const i = setInterval(() => setSecs((Date.now() - t0) / 1000), 500);
    const v = setInterval(() => setTalking((x) => (Math.random() > 0.45 ? !x : x)), 1600);
    return () => { clearInterval(i); clearInterval(v); };
  }, [stage]);

  const join = () => {
    haptic(20);
    setStage('connecting');
    setTimeout(() => { setStage('live'); engine.chime(76, 0.05); }, 1900);
  };

  return (
    <div className="vc" data-stage={stage}>
      <AnimatePresence mode="wait">
        {stage !== 'live' ? (
          <motion.div key="wait" className="vc-wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }}>
            <div className="vc-orb">
              {[0, 1, 2].map((i) => <span key={i} style={{ animationDelay: `${i * 1.3}s` }} />)}
              <Avatar name={other.name} hue={other.hue} size={104} ring />
            </div>
            <h1 className="h1 mt-24 center">{stage === 'connecting' ? 'Connecting…' : selfIsPatient ? 'Your waiting room' : `${other.name.split(' ')[0]} is waiting`}</h1>
            <p className="t-body t-soft center mt-8" style={{ maxWidth: 280 }}>
              {stage === 'connecting' ? 'Securely, end-to-end encrypted.' : selfIsPatient ? `${other.name} will join shortly. Take a slow breath — there’s nothing to prepare.` : 'Review the pre-visit brief, then start the visit when you’re ready.'}
            </p>
            <div className="vc-checks mt-24">
              <div className="vc-check"><Icon name="Check" size={14} stroke={3} /> Secure connection</div>
              <div className="vc-check"><Icon name="Check" size={14} stroke={3} /> Microphone ready</div>
              <button className={`vc-check ${cam ? '' : 'off'}`} onClick={toggleCam}><Icon name={cam ? 'Check' : 'Video'} size={14} stroke={3} /> {cam ? 'Camera on' : 'Turn camera on (optional)'}</button>
            </div>
            {camErr && <p className="t-xs t-faint mt-8">Camera isn’t available here — audio-only is fine.</p>}
            <div style={{ flex: 1 }} />
            {waitExtra}
            <button className="btn btn-primary btn-lg btn-block" onClick={join} disabled={stage === 'connecting'}>
              <Icon name={stage === 'connecting' ? 'RefreshCw' : 'Video'} size={20} className={stage === 'connecting' ? 'spin' : ''} /> {stage === 'connecting' ? 'Connecting' : selfIsPatient ? 'Join the visit' : 'Start the visit'}
            </button>
            <button className="btn btn-ghost btn-block" onClick={onEnd} style={{ marginTop: 6 }}>Not now</button>
          </motion.div>
        ) : (
          <motion.div key="live" className="vc-live" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="vc-main">
              <div className="vc-bgglow" style={{ background: `radial-gradient(circle at 50% 38%, ${other.hue}88, transparent 60%)` }} />
              <div className="vc-speaker">
                {[0, 1, 2].map((i) => <motion.span key={i} className="vc-ring" style={{ borderColor: other.hue }} animate={talking ? { scale: [1, 1.5 + i * 0.25], opacity: [0.5, 0] } : { scale: 1, opacity: 0 }} transition={{ duration: 1.8, repeat: talking ? Infinity : 0, delay: i * 0.45 }} />)}
                <Avatar name={other.name} hue={other.hue} size={128} />
              </div>
              <div className="vc-name">{other.name}</div>
              <div className="vc-time t-num">{fmtClock(secs)}</div>
              <div className="vc-enc"><Icon name="Lock" size={12} /> End-to-end encrypted</div>
            </div>
            <motion.div className="vc-self" drag dragMomentum={false} dragConstraints={{ left: -200, right: 0, top: 0, bottom: 380 }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              {cam ? <video ref={vid} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} /> : <div className="vc-selfph"><Koko size={64} mood="calm" interactive={false} glow={false} /></div>}
              <span className="vc-selflabel">{self}</span>
            </motion.div>
            <div className="vc-bar">
              <button className={`vc-btn ${mic ? '' : 'off'}`} onClick={() => { haptic(8); setMic(!mic); }} aria-label="Microphone"><Icon name={mic ? 'Mic' : 'MicOff'} size={22} /></button>
              <button className={`vc-btn ${cam ? '' : 'off'}`} onClick={toggleCam} aria-label="Camera"><Icon name={cam ? 'Video' : 'VideoOff'} size={22} /></button>
              {sidebar}
              <button className="vc-btn end" onClick={() => { haptic([20, 40]); onEnd(); }} aria-label="End call"><Icon name="PhoneOff" size={22} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
