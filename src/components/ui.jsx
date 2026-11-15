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

