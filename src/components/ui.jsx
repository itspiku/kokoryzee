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

