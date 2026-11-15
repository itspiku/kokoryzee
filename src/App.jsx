import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useRoute, go, getDirection, levelOf } from './lib/nav.js';
import { useStore, actions } from './lib/store.js';
import { partOfDay } from './lib/util.js';
import { Ambient, StatusBar, TabBar, MiniPlayer, SideLeft, SideRight } from './components/Shell.jsx';
import { ToastHost, toast } from './components/ui.jsx';
import { matchRoute } from './screens/registry.jsx';
import Koko from './components/Koko.jsx';

const variants = {
  enter: (d) => {
    if (d === 'forward') return { opacity: 0, x: 56, scale: 0.985 };
    if (d === 'back') return { opacity: 0, x: -36, scale: 0.99 };
    return { opacity: 0, y: 14, scale: 0.99 };
  },
  center: { opacity: 1, x: 0, y: 0, scale: 1 },
  exit: (d) => {
    if (d === 'forward') return { opacity: 0, x: -36, scale: 0.99 };
    if (d === 'back') return { opacity: 0, x: 56, scale: 0.985 };
    return { opacity: 0, y: -8, scale: 0.995 };
  },
};

function Loading() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <Koko size={96} mood="sleepy" interactive={false} />
    </div>
  );
}

function useDeviceScale() {
  useEffect(() => {
    const fit = () => {
      const el = document.querySelector('.device');
      if (!el) return;
      if (window.innerWidth <= 520) {
        el.style.setProperty('--device-scale', 1);
        return;
      }
      const s = Math.min(1, (window.innerHeight - 24) / 862, (window.innerWidth - 16) / 408);
      el.style.setProperty('--device-scale', String(Math.max(0.5, s)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
}

export default function App() {
  const route = useRoute();
  const role = useStore((s) => s.role);
  const onboarded = useStore((s) => s.onboarded);
  const prefs = useStore((s) => s.prefs);
  const threads = useStore((s) => s.threads);
  const alerts = useStore((s) => s.alerts);
  useDeviceScale();

  // initial route
  useEffect(() => {
    const p = route.path;
    if (!p || p === '/') {
      if (!role) go('/welcome', { replace: true });
      else go(role === 'clinician' ? '/c/overview' : '/p/home', { replace: true });
    } else if (p.startsWith('/p/') && role !== 'patient') actions.setRole('patient');
    else if (p.startsWith('/c/') && role !== 'clinician') actions.setRole('clinician');
    // eslint-disable-next-line
  }, [route.path]);

  const m = matchRoute(route.path || '/welcome');
  const dir = getDirection();

  // theme
  const [hour, setHour] = useState(new Date().getHours());
  useEffect(() => {
    const i = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(i);
  }, []);
  const autoTheme = hour >= 20 || hour < 6 ? 'evening' : 'day';
  const theme = prefs.theme === 'auto' ? autoTheme : prefs.theme;
  const dark = theme === 'evening' || m?.dark;
  const isClin = role === 'clinician' || route.path?.startsWith('/c/');

  // badges
  const patientUnread = useMemo(() => (threads['dr:alex'] || []).filter((x) => x.r && !x.r.p).length, [threads]);
  const clinUnread = useMemo(() => Object.entries(threads).filter(([k]) => k.startsWith('dr:')).reduce((n, [, l]) => n + l.filter((x) => x.r && !x.r.c).length, 0), [threads]);
  const openAlerts = useMemo(() => alerts.filter((a) => a.status === 'new' && a.level !== 'data').length, [alerts]);
  const showTabs = m?.tab && role !== null;

  // live cross-window notifications (e.g. Dr. Marsh replies while Alex has the app open)
  const seen = useRef(null);
  useEffect(() => {
    const cur = {
      drAlex: (threads['dr:alex'] || []).filter((x) => x.from === 'marsh').length,
      clinMsgs: Object.entries(threads).filter(([k]) => k.startsWith('dr:')).reduce((n, [, l]) => n + l.filter((x) => x.from !== 'marsh' && x.from !== 'system').length, 0),
      alerts: alerts.length,
    };
    const prev = seen.current;
    seen.current = cur;
    if (!prev) return;
    if (!isClin && cur.drAlex > prev.drAlex) toast('Dr. Marsh sent you a message', { icon: 'MessageCircle', ms: 4200 });
    if (isClin && cur.clinMsgs > prev.clinMsgs) toast('New message from a patient', { icon: 'MessageCircle', ms: 4200 });
    if (isClin && cur.alerts > prev.alerts) toast('A patient asked for support', { icon: 'HandHeart', ms: 5000 });
  }, [threads, alerts, isClin]);

  const mood = m?.mood || (isClin ? 'cool' : 'calm');
  const keyPath = (route.path || '/welcome').split('?')[0];

  const switchRole = (r) => {
    actions.setRole(r);
    if (r === 'patient' && !onboarded) {
      actions.finishOnboarding();
    }
    go(r === 'clinician' ? '/c/overview' : '/p/home', { dir: 'swap' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="stage" data-theme={theme} data-role={isClin ? 'clinician' : 'patient'}>
        <div className="stage-bg" />
        <SideLeft role={isClin ? 'clinician' : 'patient'} onRole={switchRole} />
        <div className="device">
          <div className="device-screen" data-theme={theme}>
            <Ambient mood={mood} />
            <StatusBar />
            <div className="viewport">
              <AnimatePresence mode="popLayout" custom={dir} initial={false}>
                {m && (
                  <motion.div
                    key={keyPath}
                    className="screen"
                    custom={dir}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.9, opacity: { duration: 0.28 } }}
                  >
                    <Suspense fallback={<Loading />}>
                      <m.Comp params={m.params} query={route.params} path={route.path} />
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {showTabs && <MiniPlayer hidden={!!m?.noMini} />}
            <AnimatePresence>
              {showTabs && (
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 60 }}
                >
                  <TabBar role={isClin ? 'clinician' : 'patient'} active={m.tab} dark={m.dark} badges={isClin ? { messages: clinUnread, alerts: openAlerts } : { journal: 0, home: 0 }} />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="overlay-root" />
            <ToastHost />
          </div>
        </div>
        <SideRight />
      </div>
    </MotionConfig>
  );
}
