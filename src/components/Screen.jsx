import { forwardRef } from 'react';
import { cx } from '../lib/util.js';

/**
 * Screen = scroll container with safe-area padding.
 * `theme="evening"` makes the screen self-dark (own background), so exiting/entering
 * screens in a transition each keep their own colours.
 */
const Screen = forwardRef(function Screen(
  { children, tabs = true, theme, bg, flush, className, style, scrollStyle, onScroll, padTop = true, noScroll },
  ref
) {
  const inner = (
    <div
      ref={ref}
      className={cx('screen-scroll', !tabs && 'no-tabs', flush && 'flush', className)}
      style={{ ...(padTop ? null : { paddingTop: 0 }), ...(noScroll ? { overflow: 'hidden' } : null), ...scrollStyle }}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
  if (!theme && !bg) return inner;
  return (
    <div
      data-theme={theme}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: bg || 'var(--bg-grad)',
        color: 'var(--ink)',
        ...style,
      }}
    >
      {inner}
    </div>
  );
});
export default Screen;
