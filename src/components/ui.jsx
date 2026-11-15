import { useState, useRef, useEffect, useCallback, useLayoutEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, useMotionValue, useTransform, animate } from 'framer-motion';
import Icon from './Icon.jsx';
import { haptic, cx } from '../lib/util.js';
import { back } from '../lib/nav.js';

export const SPRING = { type: 'spring', stiffness: 380, damping: 30 };
export const SOFT_SPRING = { type: 'spring', stiffness: 160, damping: 22, mass: 0.9 };

// ── resize hook ──
export function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// ── button with ripple ──
export function Btn({ kind = 'primary', size, block, icon, iconRight, children, onClick, className, style, disabled, type = 'button', ...rest }) {
  const [ripples, setRipples] = useState([]);
  const press = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2;
    const id = Math.random();
    setRipples((x) => [...x, { id, x: e.clientX - r.left - d / 2, y: e.clientY - r.top - d / 2, d }]);
    setTimeout(() => setRipples((x) => x.filter((q) => q.id !== id)), 700);
  };
  return (
    <motion.button
      type={type}
      className={cx('btn', `btn-${kind}`, size && `btn-${size}`, block && 'btn-block', className)}
      style={style}
      disabled={disabled}
      whileTap={{ scale: 0.965 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      onPointerDown={press}
      onClick={(e) => {
        haptic(8);
        onClick?.(e);
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 17 : 20} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 17 : 20} />}
      {ripples.map((r) => (
        <span key={r.id} className="ripple-ink" style={{ left: r.x, top: r.y, width: r.d, height: r.d }} />
      ))}
    </motion.button>
  );
}

export function Card({ tint, tight, flat, pressable, onClick, className, children, style, as, ...rest }) {
  const Comp = motion[as || 'div'];
  return (
    <Comp
      className={cx('card', tint && `tint-${tint}`, tight && 'tight', flat && 'flat', (pressable || onClick) && 'pressable', className)}
      style={style}
      onClick={
        onClick
          ? (e) => {
              haptic(6);
              onClick(e);
            }
          : undefined
      }
      whileTap={onClick || pressable ? { scale: 0.982 } : undefined}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function Pill({ tone, children, icon, className }) {
  return (
    <span className={cx('pill', tone, className)}>
      {icon && <Icon name={icon} size={12} stroke={2.4} />}
      {children}
    </span>
  );
}

export function Switch({ on, onChange, label, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={!!on}
      aria-label={label}
      aria-disabled={disabled}
      className={cx('switch', on && 'on')}
      onClick={() => {
        haptic(10);
        onChange?.(!on);
      }}
    />
  );
}

export function Avatar({ name = '?', size = 44, hue = '#7aa774', src, ring, style }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${hue} 55%, white), ${hue} 75%)`,
        boxShadow: ring ? `0 0 0 3px ${hue}55, 0 0 0 2px var(--card-solid)` : undefined,
        ...style,
      }}
    >
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

// ── entrance helpers ──
export function Rise({ i = 0, y = 18, children, className, style, delay = 0, as = 'div', ...rest }) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.06 + i * 0.07 + delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
export function InView({ children, className, style, y = 22, delay = 0, ...rest }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ type: 'spring', stiffness: 110, damping: 20, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ value, format = (v) => Math.round(v).toLocaleString(), duration = 1.2 }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration, ease: [0.22, 0.8, 0.28, 1], onUpdate: setT });
    return () => c.stop();
  }, [value, duration]);
  return <>{format(t)}</>;
}

// ── top bar ──
export function TopBar({ title, sub, onBack, backTo, right, light, transparent }) {
  return (
    <div className="topbar" style={light ? { color: '#fff' } : undefined}>
      {(onBack || backTo) && (
        <button
          className="icon-btn"
          aria-label="Back"
          onClick={() => (onBack ? onBack() : back(backTo))}
          style={light ? { background: 'rgba(255,255,255,.16)', borderColor: 'rgba(255,255,255,.2)', color: '#fff', boxShadow: 'none' } : undefined}
        >
          <Icon name="ChevronLeft" size={22} />
        </button>
      )}
      <div className="title">
        {sub && <div className="t-cap" style={light ? { color: 'rgba(255,255,255,.7)' } : undefined}>{sub}</div>}
        {title && <h1 className="h2" style={{ marginTop: sub ? 2 : 0 }}>{title}</h1>}
      </div>
      {right}
    </div>
  );
}

// ── bottom sheet ──
export function useOverlayRoot() {
  const [el, setEl] = useState(null);
  useEffect(() => {
    setEl(document.querySelector('.overlay-root'));
  }, []);
  return el;
}
export function Sheet({ open, onClose, children, title, height, dark }) {
  const root = useOverlayRoot();
  const controls = useDragControls();
  const y = useMotionValue(0);
  const bd = useTransform(y, [0, 300], [1, 0.2]);
  if (!root) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="sheet-wrap" style={{ position: 'absolute', inset: 0, zIndex: 130 }}>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ opacity: bd }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            role="dialog"
            aria-label={title}
            style={{ y, height, ...(dark ? { background: '#15241e', color: '#eaf1e6' } : null) }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose?.();
            }}
          >
            <div className="sheet-grab" onPointerDown={(e) => controls.start(e)} style={{ touchAction: 'none', cursor: 'grab', padding: '6px 0 10px', background: 'transparent', height: 'auto' }}>
              <div style={{ width: 44, height: 5, borderRadius: 3, background: 'var(--line-2)', margin: '0 auto' }} />
            </div>
            {title && <h2 className="h2 mb-12" onPointerDown={(e) => controls.start(e)} style={{ touchAction: 'none' }}>{title}</h2>}
            <div className="sheet-body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    root
  );
}

// ── confirm dialog ──
export function Confirm({ open, title, body, confirm = 'Confirm', cancel = 'Not now', danger, onConfirm, onClose }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="stack gap-12" style={{ paddingBottom: 6 }}>
        <h2 className="h2">{title}</h2>
        {body && <p className="t-body t-soft">{body}</p>}
        <div className="stack gap-8 mt-8">
          <Btn kind={danger ? 'warm' : 'primary'} block onClick={() => { onConfirm?.(); onClose?.(); }}>{confirm}</Btn>
          <Btn kind="ghost" block onClick={onClose}>{cancel}</Btn>
        </div>
      </div>
    </Sheet>
  );
}

// ── toasts ──
let toastSubs = new Set();
let toastList = [];
export function toast(text, { icon = 'Check', ms = 2800 } = {}) {
  const t = { id: Math.random(), text, icon };
  toastList = [...toastList, t].slice(-3);
  toastSubs.forEach((f) => f(toastList));
  setTimeout(() => {
    toastList = toastList.filter((x) => x.id !== t.id);
    toastSubs.forEach((f) => f(toastList));
  }, ms);
}
export function ToastHost() {
  const [list, setList] = useState([]);
  useEffect(() => {
    toastSubs.add(setList);
    return () => toastSubs.delete(setList);
  }, []);
  return (
    <div className="toast-host">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            className="toast"
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          >
            <Icon name={t.icon} size={18} />
            <span>{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

