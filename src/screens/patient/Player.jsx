import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import SceneArt from '../../components/SceneArt.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Sheet, Slider, TopBar, toast } from '../../components/ui.jsx';
import Koko from '../../components/Koko.jsx';
import { back } from '../../lib/nav.js';
import { actions } from '../../lib/store.js';
import { useEngine, useTimerLeft, useEngineEvent } from '../../audio/useEngine.js';
import { engine } from '../../audio/engine.js';
import { SCENES, LAYER_META, sceneById } from '../../data/content.js';
import { fmtClock, haptic } from '../../lib/util.js';

const TIMERS = [null, 15, 30, 60];

function Spectrum({ color }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const c = cv.getContext('2d');
    const spec = new Uint8Array(128);
    let raf;
    const N = 32;
    const vals = new Array(N).fill(0);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, r.width, r.height);
      const live = engine.spectrum(spec) && engine.playing;
      const bw = r.width / N;
      for (let i = 0; i < N; i++) {
        const target = live ? spec[Math.floor(Math.pow(i / N, 1.5) * 90) + 1] / 255 : 0.06 + 0.04 * Math.sin(Date.now() / 700 + i * 0.5);
        vals[i] += (target - vals[i]) * 0.2;
        const hh = Math.max(3, vals[i] * r.height * 0.95);
        c.fillStyle = color;
        c.globalAlpha = 0.35 + vals[i] * 0.65;
        c.beginPath();
        c.roundRect(i * bw + bw * 0.22, (r.height - hh) / 2, bw * 0.56, hh, 3);
        c.fill();
      }
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} style={{ width: '100%', height: 44, display: 'block' }} />;
}

export default function Player({ query }) {
  const scene = sceneById(query?.scene) || SCENES[0];
  const e = useEngine();
  const left = useTimerLeft();
  const isThis = e.sceneId === scene.id;
  const playing = e.playing && isThis;
  const [mixer, setMixer] = useState(query?.mixer === '1');
  const [ask, setAsk] = useState(false);
  const [asked, setAsked] = useState(false);
  const [ended, setEnded] = useState(false);
  const [vol, setVol] = useState(engine.volume);
  const t0 = useRef(null);

  // gentle "is this helping?" after ~45s of listening
  useEffect(() => {
    if (!playing) return;
    t0.current = t0.current || Date.now();
    const i = setTimeout(() => !asked && setAsk(true), 45000);
    return () => clearTimeout(i);
  }, [playing, asked]);

  useEngineEvent('ended', () => setEnded(true));

  const toggle = async () => {
    haptic(16);
    if (playing) engine.pause();
    else if (isThis && engine.ctx) await engine.resumePlayback();
    else {
      actions.setLastScene(scene.id);
      await engine.play(scene.id, scene.mix);
    }
  };
  const cycleTimer = () => {
    haptic(8);
    const cur = e.endsAt ? Math.round((e.endsAt - Date.now()) / 60000) : null;
    const idx = cur == null ? 0 : TIMERS.findIndex((t) => t && cur <= t);
    const next = TIMERS[(idx + 1) % TIMERS.length];
    engine.setTimer(next);
    toast(next ? `Fading out in ${next} minutes` : 'Plays until you stop it', { icon: 'Timer' });
  };

  const feed = (helped) => {
    actions.addFeedback(`sound:${scene.id}`, scene.title, helped);
    setAsk(false);
    setAsked(true);
    setEnded(false);
    toast(helped === 'no' ? 'Thanks — I’ll suggest something else.' : 'Glad. I’ll remember this.', { icon: 'Heart' });
  };

  const levels = e.levels || {};
  const grad = `linear-gradient(170deg, ${scene.grad[0]}, ${scene.grad[1]} 52%, ${scene.grad[2]})`;

  return (
    <Screen tabs={false} theme="evening" bg={grad} noScroll padTop={false}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <SceneArt scene={scene} active />
        <div className="player-shade" />
      </div>
      <div style={{ position: 'relative', padding: 'calc(var(--safe-top) + 12px) 20px 0', zIndex: 2 }}>
        <TopBar light onBack={() => back('/p/sounds')} sub="Now playing" title={undefined} right={<button className="icon-btn" aria-label="Mix" onClick={() => setMixer(true)} style={{ background: 'rgba(255,255,255,.16)', borderColor: 'rgba(255,255,255,.2)', color: '#fff', boxShadow: 'none' }}><Icon name="Sliders" size={20} /></button>} />
      </div>

      <div className="player-bottom">
        <AnimatePresence>
          {ask && !ended && (
            <motion.div className="help-ask" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}>
              <span className="t-sm bold">Is this helping?</span>
              <button onClick={() => feed('yes')}>Yes</button>
              <button onClick={() => feed('some')}>A little</button>
              <button onClick={() => feed('no')}>Not really</button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="serif" style={{ fontSize: 32, lineHeight: 1.08, color: '#fff', textShadow: '0 2px 20px rgba(0,0,0,.35)' }}>{scene.title}</div>
        <div className="t-body" style={{ color: 'rgba(255,255,255,.8)', marginTop: 2 }}>{scene.sub}</div>
        <div style={{ marginTop: 18 }}><Spectrum color={scene.accent} /></div>
        <div className="row-flex between" style={{ marginTop: 6, color: 'rgba(255,255,255,.7)' }}>
          <span className="t-xs t-num">{left != null ? `Fades out in ${fmtClock(left)}` : 'Endless · generated live'}</span>
          <span className="t-xs">{playing ? 'Playing' : 'Paused'}</span>
        </div>

        <div className="player-controls">
          <button className="pc-btn" onClick={cycleTimer} aria-label="Sleep timer">
            <Icon name="Timer" size={22} />
            <span className="t-xs">{left != null ? `${Math.ceil(left / 60)}m` : '∞'}</span>
          </button>
          <motion.button className="pc-main" onClick={toggle} whileTap={{ scale: 0.92 }} aria-label={playing ? 'Pause' : 'Play'}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={playing ? 'p' : 'q'} initial={{ scale: 0.4, rotate: -45, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.18 }}>
                <Icon name={playing ? 'Pause' : 'Play'} size={34} stroke={2.2} />
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <button className="pc-btn" onClick={() => setMixer(true)} aria-label="Mix">
            <Icon name="SlidersHorizontal" size={22} />
            <span className="t-xs">Mix</span>
          </button>
        </div>
        <div className="row-flex gap-10" style={{ color: 'rgba(255,255,255,.75)', marginTop: 4 }}>
          <Icon name="VolumeX" size={16} />
          <div className="grow"><Slider value={vol} onChange={(v) => { setVol(v); engine.setVolume(v); }} min={0.05} max={1} color="#fff" label="Volume" /></div>
          <Icon name="Volume2" size={16} />
        </div>
      </div>

      <Sheet open={mixer} onClose={() => setMixer(false)} title="Make it yours" dark>
        <p className="t-sm" style={{ opacity: 0.7, marginBottom: 12 }}>Blend layers while it plays. Changes fade in gently.</p>
        <div className="stack gap-12">
          {Object.entries(LAYER_META).map(([k, m]) => (
            <div key={k} className="row-flex gap-12">
              <div className="ico-dot" style={{ background: 'rgba(255,255,255,.08)', color: scene.accent }}><Icon name={m.icon} size={18} /></div>
              <div className="grow">
                <div className="row-flex between"><span className="t-sm bold">{m.label}</span><span className="t-xs" style={{ opacity: 0.6 }}>{Math.round((levels[k] ?? scene.mix[k] ?? 0) * 100)}%</span></div>
                <Slider value={levels[k] ?? scene.mix[k] ?? 0} onChange={(v) => { if (!playing && !engine.ctx) engine.play(scene.id, scene.mix); engine.setLayer(k, v, 0.25); }} color={scene.accent} label={m.label} />
              </div>
            </div>
          ))}
        </div>
        <Btn kind="soft" block className="mt-16" onClick={() => Object.entries(scene.mix).length && Object.keys(LAYER_META).forEach((k) => engine.setLayer(k, scene.mix[k] || 0, 0.6))}>Reset to “{scene.title}”</Btn>
      </Sheet>

      <Sheet open={ended} onClose={() => setEnded(false)} dark>
        <div className="center stack" style={{ alignItems: 'center', paddingBottom: 6 }}>
          <Koko size={110} mood="sleepy" />
          <h2 className="h2 mt-12">Sleep well, Alex.</h2>
          <p className="t-sm" style={{ opacity: 0.7, marginTop: 6 }}>Did that help?</p>
          <div className="row-flex gap-8 mt-16" style={{ width: '100%' }}>
            <Btn kind="primary" className="grow" onClick={() => feed('yes')}>Yes</Btn>
            <Btn kind="soft" className="grow" onClick={() => feed('some')}>A little</Btn>
            <Btn kind="ghost" className="grow" onClick={() => feed('no')}>No</Btn>
          </div>
        </div>
      </Sheet>
    </Screen>
  );
}
