import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import SceneArt from '../../components/SceneArt.jsx';
import Icon from '../../components/Icon.jsx';
import { Rise, Pill, SectionTitle, Btn } from '../../components/ui.jsx';
import { go } from '../../lib/nav.js';
import { useStore, actions, responseStats } from '../../lib/store.js';
import { useEngine } from '../../audio/useEngine.js';
import { engine } from '../../audio/engine.js';
import { SCENES, SOUND_CATS, sceneById } from '../../data/content.js';
import { haptic } from '../../lib/util.js';

export async function startScene(scene) {
  haptic(14);
  actions.setLastScene(scene.id);
  engine.play(scene.id, scene.mix);
  go(`/p/player?scene=${scene.id}`);
}

export function SceneThumb({ scene, size = 64, radius = 20 }) {
  const icon = { bowl: 'Bell', rain: 'CloudRain', birds: 'Bird', ocean: 'Waves', piano: 'Music2', fire: 'Flame' }[scene.art];
  return (
    <div className="thumb" style={{ width: size, height: size, borderRadius: radius, background: `linear-gradient(155deg, ${scene.grad[0]}, ${scene.grad[1]} 55%, ${scene.grad[2]})` }}>
      <div className="thumb-shine" />
      <Icon name={icon} size={size * 0.4} stroke={1.6} style={{ color: 'rgba(255,255,255,.9)', position: 'relative' }} />
    </div>
  );
}

export default function Sounds() {
  const [cat, setCat] = useState('All');
  const feedback = useStore((s) => s.feedback);
  const last = useStore((s) => s.lastScene);
  const e = useEngine();
  const stats = useMemo(() => responseStats(feedback), [feedback]);
  const scenes = SCENES.filter((s) => cat === 'All' || s.cat === cat);
  const rate = (s) => stats[`sound:${s.id}`];
  const forYou = useMemo(
    () => [...SCENES].filter((s) => rate(s)).sort((a, b) => rate(b).rate - rate(a).rate).slice(0, 4),
    // eslint-disable-next-line
    [stats]
  );
  const feat = sceneById(e.sceneId || last) || SCENES[0];
  const fr = rate(feat);

  return (
    <Screen theme="evening" bg="linear-gradient(180deg,#0f1a17,#13231e 55%,#121f2b)">
      <div className="row-flex between" style={{ marginBottom: 6 }}>
        <div>
          <div className="t-cap">Hi, Alex</div>
          <h1 className="h1" style={{ marginTop: 2 }}>Sounds for you</h1>
        </div>
        <button className="icon-btn" aria-label="Mix your own" onClick={() => go(`/p/player?scene=${feat.id}&mixer=1`)}><Icon name="SlidersHorizontal" size={20} /></button>
      </div>

      <div className="chips-scroll" style={{ paddingBottom: 4 }}>
        {SOUND_CATS.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => { haptic(6); setCat(c); }}>{c}</button>
        ))}
      </div>

      {/* featured */}
      <Rise i={1} className="mt-8">
        <motion.div className="feature" whileTap={{ scale: 0.985 }} onClick={() => startScene(feat)} style={{ background: `linear-gradient(160deg, ${feat.grad[0]}, ${feat.grad[1]} 55%, ${feat.grad[2]})` }}>
          <SceneArt scene={feat} />
          <div className="feature-scrim" />
          <div className="feature-top">
            <Pill tone="" className="glass-pill" icon="Sparkles">{e.playing && e.sceneId === feat.id ? 'Playing now' : e.sceneId === feat.id ? 'Paused' : 'Pick up where you left off'}</Pill>
          </div>
          <div className="feature-bottom">
            <div>
              <div className="serif" style={{ fontSize: 27, lineHeight: 1.1, color: '#fff' }}>{feat.title}</div>
              <div className="t-sm" style={{ color: 'rgba(255,255,255,.8)', marginTop: 3 }}>{feat.sub}</div>
              {fr && <div className="t-xs" style={{ color: 'rgba(255,255,255,.7)', marginTop: 6 }}>Helped you {fr.helpedCount} of {fr.n} times</div>}
            </div>
            <motion.div className="play-fab" whileTap={{ scale: 0.9 }}>
              <Icon name={e.playing && e.sceneId === feat.id ? 'Pause' : 'Play'} size={26} />
            </motion.div>
          </div>
        </motion.div>
      </Rise>

      {cat === 'All' && forYou.length > 0 && (
        <>
          <SectionTitle sub="Based on what has helped you before">Made for you</SectionTitle>
          <div className="scroll-x">
            {forYou.map((s, i) => {
              const r = rate(s);
              return (
                <motion.button key={s.id} className="for-you" onClick={() => startScene(s)} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.07, type: 'spring', stiffness: 120, damping: 18 }} whileTap={{ scale: 0.96 }}>
                  <SceneThumb scene={s} size={148} radius={26} />
                  <div className="bold t-sm mt-8" style={{ textAlign: 'left' }}>{s.title}</div>
                  <div className="t-xs t-faint" style={{ textAlign: 'left' }}>Helped {r.helpedCount} of {r.n}</div>
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle sub={`${scenes.length} soundscapes · generated live, never the same twice`}>{cat === 'All' ? 'Popular sounds' : cat}</SectionTitle>
      <div className="stack gap-10">
        <AnimatePresence initial={false}>
          {scenes.map((s, i) => (
            <motion.div key={s.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.04 }}>
              <div className="sound-row card tight pressable" onClick={() => startScene(s)}>
                <SceneThumb scene={s} />
                <div className="grow">
                  <div className="bold">{s.title}</div>
                  <div className="t-xs t-faint">{s.sub}</div>
                  <div className="row-flex gap-6 mt-4"><Pill tone="mute">{s.cat}</Pill><span className="t-xs t-faint">best for {s.best}</span></div>
                </div>
                <div className="mini-play">
                  {e.playing && e.sceneId === s.id ? <div className="eq" style={{ position: 'relative', padding: 0, height: 18 }}>{[0, 1, 2].map((k) => <i key={k} style={{ animationDelay: `${k * 0.2}s`, background: 'var(--primary)', height: 16 }} />)}</div> : <Icon name="Play" size={18} />}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="card tint-lav mt-20 row-flex gap-12" onClick={() => go(`/p/player?scene=${feat.id}&mixer=1`)} style={{ cursor: 'pointer' }}>
        <div className="ico-dot lg" style={{ background: 'var(--glass-soft)' }}><Icon name="Sliders" size={22} /></div>
        <div className="grow">
          <div className="bold">Mix your own</div>
          <div className="t-sm t-soft">Blend rain, ocean, birds, bowls and piano.</div>
        </div>
        <Icon name="ChevronRight" size={18} style={{ opacity: 0.5 }} />
      </div>
    </Screen>
  );
}
