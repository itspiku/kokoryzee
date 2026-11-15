import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Screen from '../../components/Screen.jsx';
import Koko from '../../components/Koko.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn, Card, Rise, Sheet, SectionTitle, Pill, TopBar, toast } from '../../components/ui.jsx';
import { simulateReply } from './Circle.jsx';
import { useStore, actions } from '../../lib/store.js';
import { usePatientData } from '../../engine/useData.js';
import { OUTINGS, OUTING_CATS, SMALL_STEPS } from '../../data/content.js';
import { haptic, partOfDay, greeting } from '../../lib/util.js';
import { engine } from '../../audio/engine.js';

export function OutingArt({ art, grad, h = 132 }) {
  const stroke = 'rgba(36,64,47,.55)';
  const scenes = {
    walk: (
      <>
        <path d="M-10 118 C80 80 160 112 330 84 L330 140 L-10 140Z" fill="rgba(255,255,255,.35)" />
        <path d="M120 140 C140 112 170 100 210 90" stroke="rgba(255,255,255,.7)" strokeWidth="10" strokeLinecap="round" fill="none" />
        {[40, 80, 250, 290].map((x, i) => <g key={x} className="o-sway" style={{ animationDelay: `${i * 0.6}s`, transformOrigin: `${x}px 112px` }}><rect x={x - 2} y="86" width="4" height="26" fill={stroke} opacity=".6" /><circle cx={x} cy="74" r={18 + (i % 2) * 5} fill="rgba(52,88,64,.45)" /></g>)}
        <circle cx="240" cy="30" r="16" fill="rgba(255,255,255,.7)" />
      </>
    ),
    cafe: (
      <>
        <ellipse cx="160" cy="118" rx="70" ry="8" fill="rgba(0,0,0,.08)" />
        <path d="M118 62 h84 v26 a38 34 0 0 1 -84 0z" fill="#fff" opacity=".92" />
        <path d="M202 70 h12 a13 13 0 0 1 0 26 h-14" stroke="#fff" strokeWidth="7" fill="none" opacity=".92" />
        <rect x="100" y="108" width="120" height="8" rx="4" fill="rgba(255,255,255,.7)" />
        {[0, 1, 2].map((i) => <path key={i} className="o-steam" style={{ animationDelay: `${i * 0.7}s` }} d={`M${140 + i * 20} 54 q-8 -10 0 -20 q8 -10 0 -20`} stroke="rgba(255,255,255,.8)" strokeWidth="4" strokeLinecap="round" fill="none" />)}
      </>
    ),
    garden: (
      <>
        <path d="M-10 108 C90 90 200 112 330 94 L330 140 L-10 140Z" fill="rgba(90,60,40,.28)" />
        {[60, 120, 180, 240, 290].map((x, i) => <g key={x} className="o-sway" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${x}px 108px` }}><path d={`M${x} 108 q-2 -${22 + i * 5} 2 -${34 + i * 6}`} stroke="rgba(255,255,255,.85)" strokeWidth="4" strokeLinecap="round" fill="none" /><path d={`M${x} ${88 - i * 3} q-18 -10 -22 -2 q12 12 22 2z M${x + 2} ${78 - i * 4} q18 -12 22 -4 q-12 12 -22 4z`} fill="rgba(255,255,255,.75)" /></g>)}
      </>
    ),
    pottery: (
      <>
        <ellipse cx="160" cy="120" rx="76" ry="8" fill="rgba(0,0,0,.08)" />
        <path d="M130 40 h60 c18 20 22 46 8 76 h-76 c-14 -30 -10 -56 8 -76z" fill="rgba(255,255,255,.88)" />
        <path d="M132 64 q28 12 56 0" stroke="rgba(136,120,200,.5)" strokeWidth="4" fill="none" />
        <path d="M128 84 q32 14 64 0" stroke="rgba(136,120,200,.4)" strokeWidth="4" fill="none" />
        <circle cx="262" cy="46" r="20" fill="rgba(255,255,255,.4)" />
      </>
    ),
    stretch: (
      <>
        {[-60, -30, 0, 30, 60].map((r, i) => <motion.ellipse key={r} cx="160" cy="96" rx="20" ry="52" fill="rgba(255,255,255,.7)" style={{ transformOrigin: '160px 120px', rotate: r }} animate={{ rotate: [r, r * 1.06, r] }} transition={{ duration: 6, repeat: Infinity, delay: i * 0.3 }} />)}
        <ellipse cx="160" cy="118" rx="60" ry="8" fill="rgba(255,255,255,.4)" />
      </>
    ),
    book: (
      <>
        {[[100, 76, 120, 18, '#fff'], [112, 58, 100, 18, 'rgba(255,255,255,.75)'], [104, 40, 112, 18, '#fff']].map(([x, y, w, hh, f], i) => <rect key={i} x={x} y={y + 14} width={w} height={hh} rx="4" fill={f} opacity=".92" />)}
        <rect x="92" y="108" width="136" height="10" rx="5" fill="rgba(255,255,255,.6)" />
        <path d="M240 40 q10 -14 22 0 q-10 14 -22 0z" fill="rgba(255,255,255,.7)" />
      </>
    ),
    hike: (
      <>
        <path d="M-10 118 L80 54 L130 92 L190 36 L270 108 L330 80 L330 140 L-10 140Z" fill="rgba(255,255,255,.45)" />
        <path d="M190 36 l-18 22 l12 -6 l6 8 l6 -8 l12 6z" fill="rgba(255,255,255,.9)" />
        <circle cx="262" cy="34" r="18" fill="rgba(255,255,255,.75)" />
      </>
    ),
    music: (
      <>
        {[70, 120, 170, 220, 270].map((x, i) => <motion.rect key={x} x={x - 6} width="12" rx="6" fill="rgba(255,255,255,.8)" animate={{ y: [100 - 20 - i * 5, 100 - 60 - (i % 3) * 12, 100 - 20 - i * 5], height: [20 + i * 5, 60 + (i % 3) * 12, 20 + i * 5] }} transition={{ duration: 1.8 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }} />)}
        <path d="M40 116 H280" stroke="rgba(255,255,255,.5)" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 320 132" width="100%" height={h} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id={`og-${art}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={grad[0]} /><stop offset="1" stopColor={grad[1]} /></linearGradient></defs>
      <rect width="320" height="132" fill={`url(#og-${art})`} />
      {scenes[art]}
    </svg>
  );
}

const ENERGY = [
  { v: 1, label: 'A little', icon: 'BatteryFull' },
  { v: 2, label: 'Some', icon: 'BatteryFull' },
  { v: 3, label: 'Plenty', icon: 'BatteryFull' },
];

function Battery({ n }) {
  return <span className="battery">{[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>;
}

export default function GoingOut() {
  const { analysis } = usePatientData('alex');
  const outings = useStore((s) => s.outings);
  const circle = useStore((s) => s.circle);
  const approved = useStore((s) => s.carePlans.alex.approved);
  const suggested = analysis.status === 'review' || analysis.status === 'shift' ? 1 : 2;
  const [energy, setEnergy] = useState(suggested);
  const [cat, setCat] = useState('All');
  const [invite, setInvite] = useState(null);
  const [felt, setFelt] = useState(null);
  const [open, setOpen] = useState(null);
  const pod = partOfDay();

  const list = OUTINGS.filter((o) => o.energy <= energy && (cat === 'All' || o.cat === cat));
  const done = outings.done.map((d) => ({ ...d, o: OUTINGS.find((x) => x.id === d.id) })).filter((d) => d.o);

  const goWith = (p) => {
    actions.sendMessage(`circle:${p.id}`, 'alex', `Would you like to come to “${invite.title}” (${invite.when})? No pressure.`);
    haptic([16, 30, 16]);
    toast(`Invited ${p.name}`, { icon: 'Send' });
    simulateReply(p, [3000, 6000]);
    setInvite(null);
  };
  const logFelt = (v) => {
    actions.doneOuting(felt.id, v);
    actions.addFeedback('outing:walk', 'A short walk outside', v === 'fed' ? 'yes' : v === 'ok' ? 'some' : 'no');
    engine.chime(79, 0.05);
    toast(v === 'drained' ? 'Thanks. I’ll go gentler next time.' : 'Lovely — noted what fed you.', { icon: 'Heart' });
    setFelt(null);
  };

  if (approved.outings === false) {
    return <Screen tabs={false}><TopBar backTo="/p/home" title="Going out" /><Card flat className="center t-soft">Outings are paused in your care plan for now.</Card></Screen>;
  }

  return (
    <Screen tabs={false} bg="linear-gradient(180deg, color-mix(in srgb, var(--sage-200) 70%, var(--bg)), var(--bg) 380px)">
      <TopBar backTo="/p/home" sub={greeting(new Date(), 'Alex')} title="Going out" />
      <p className="t-body t-soft" style={{ maxWidth: 300 }}>Gentle ideas — no targets, no pressure. Staying in is also a good choice.</p>

      <Rise i={1}>
        <Card className="mt-16">
          <div className="row-flex between"><div className="bold">How much energy today?</div><Pill icon="Sparkles">Picked from your week</Pill></div>
          <div className="energy-row">
            {ENERGY.map((e) => (
              <button key={e.v} className={`energy ${energy === e.v ? 'on' : ''}`} onClick={() => { haptic(8); setEnergy(e.v); }}>
                {energy === e.v && <motion.span layoutId="energy-pill" className="energy-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <Battery n={e.v} />
                <span>{e.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </Rise>

      <SectionTitle sub="The smallest steps still count">Tiny steps</SectionTitle>
      <div className="scroll-x">
        {SMALL_STEPS.map((s) => (
          <Card key={s.id} tight onClick={() => { actions.doneOuting(s.id, 'ok'); actions.addFeedback('outing:walk', 'A short walk outside', 'some'); engine.chime(76, 0.04); toast('That counts. Really.', { icon: 'Heart' }); }} style={{ width: 150 }}>
            <div className="ico-dot"><Icon name={s.icon} size={19} /></div>
            <div className="t-sm bold mt-8" style={{ lineHeight: 1.3 }}>{s.text}</div>
            <div className="t-xs t-faint mt-4">Tap when done</div>
          </Card>
        ))}
      </div>

      <div className="chips-scroll mt-8">
        {OUTING_CATS.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => { haptic(6); setCat(c); }}>{c}</button>)}
      </div>

      <div className="stack gap-14" style={{ gap: 16, marginTop: 6 }}>
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((o, i) => {
            const saved = outings.saved.includes(o.id);
            return (
              <motion.div key={o.id} layout initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ type: 'spring', stiffness: 160, damping: 20, delay: i * 0.04 }}>
                <Card className="outing" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="outing-art"><OutingArt art={o.art} grad={o.grad} />
                    <div className="outing-date"><b>{o.when.split(' · ')[0]}</b><span>{o.when.split(' · ')[1] || ''}</span></div>
                    <button className={`save-btn ${saved ? 'on' : ''}`} aria-label={saved ? 'Unsave' : 'Save for later'} onClick={() => { haptic(10); actions.saveOuting(o.id); }}><Icon name="Bookmark" size={19} /></button>
                  </div>
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div className="row-flex between"><div className="h3">{o.title}</div><Battery n={o.energy} /></div>
                    <div className="t-sm t-soft mt-4"><Icon name="MapPin" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {o.place} · {o.dist}</div>
                    <div className="t-xs t-faint mt-4">{o.vibe}</div>
                    <div className="row-flex gap-8 mt-12 wrap">
                      <Btn kind="primary" size="sm" icon="HeartHandshake" onClick={() => setInvite(o)}>Go with someone</Btn>
                      <Btn kind="soft" size="sm" icon="Check" onClick={() => setFelt(o)}>I went</Btn>
                      <button className="t-xs bold" style={{ color: 'var(--primary)', padding: '0 6px' }} onClick={() => setOpen(open === o.id ? null : o.id)}>Ice-breakers</button>
                    </div>
                    <AnimatePresence initial={false}>
                      {open === o.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                          <div className="ice mt-12">
                            <div className="t-cap mb-8">For when you arrive</div>
                            {o.ice.map((q) => <div key={q} className="ice-q serif">{q}</div>)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {list.length === 0 && <Card flat className="center t-soft">Nothing at this energy level in that category — tiny steps above still count.</Card>}
      </div>

      {done.length > 0 && (
        <>
          <SectionTitle sub="What you’ve told us about how things felt">Things that fed you</SectionTitle>
          <div className="stack gap-8">
            {done.slice(0, 4).map((d, i) => (
              <Card key={i} tight className="row-flex gap-12">
                <div className="ico-dot"><Icon name={d.felt === 'fed' ? 'Sprout' : d.felt === 'drained' ? 'Cloud' : 'Sun'} size={18} /></div>
                <div className="grow"><div className="bold t-sm">{d.o.title}</div><div className="t-xs t-faint">{d.felt === 'fed' ? 'Fed me' : d.felt === 'drained' ? 'Took energy' : 'Fine'}</div></div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Sheet open={!!invite} onClose={() => setInvite(null)} title="Go with someone">
        {invite && <>
          <p className="t-sm t-soft mb-12">Invite someone from your circle to “{invite.title}”. It’s just a message — no pressure either way.</p>
          <div className="stack gap-8">
            {circle.map((p) => (
              <Card key={p.id} tight onClick={() => goWith(p)} className="row-flex gap-12">
                <div className="avatar" style={{ width: 44, height: 44, background: p.hue, fontSize: 16 }}>{p.name[0]}</div>
                <div className="grow"><div className="bold t-sm">{p.name}</div><div className="t-xs t-faint">{p.rel}</div></div>
                <Icon name="Send" size={17} style={{ color: 'var(--primary)' }} />
              </Card>
            ))}
          </div>
        </>}
      </Sheet>

      <Sheet open={!!felt} onClose={() => setFelt(null)} title="How did that feel?">
        <p className="t-sm t-soft mb-12">Helps Kokoryze learn which kinds of outings are restorative for you.</p>
        <div className="stack gap-8">
          <Btn kind="primary" block icon="Sprout" onClick={() => logFelt('fed')}>It fed me</Btn>
          <Btn kind="soft" block icon="Sun" onClick={() => logFelt('ok')}>It was fine</Btn>
          <Btn kind="ghost" block icon="Cloud" onClick={() => logFelt('drained')}>It took energy</Btn>
        </div>
      </Sheet>
    </Screen>
  );
}
