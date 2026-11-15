import Icon from '../../components/Icon.jsx';
import { Pill } from '../../components/ui.jsx';
import { deltaText } from '../../engine/insights.js';

export const STATUS = {
  urgent: { label: 'Asked for support', tone: 'rose', color: '#d47468', icon: 'HandHeart', rank: 0 },
  review: { label: 'Review suggested', tone: 'amber', color: '#e0a35c', icon: 'Eye', rank: 1 },
  shift: { label: 'Gentle shift', tone: 'amber', color: '#e8bd7a', icon: 'Activity', rank: 2 },
  gap: { label: 'Not synced', tone: 'lav', color: '#a99bdc', icon: 'Watch', rank: 3 },
  forming: { label: 'Baseline forming', tone: 'lav', color: '#a99bdc', icon: 'Hourglass', rank: 4 },
  steady: { label: 'Steady', tone: '', color: '#7aa774', icon: 'Check', rank: 5 },
  better: { label: 'Brighter than baseline', tone: '', color: '#5c9a6a', icon: 'Sunrise', rank: 6 },
};

export const LEVEL = {
  urgent: { label: 'Urgent · patient request', color: '#d47468', icon: 'HandHeart', tone: 'rose' },
  review: { label: 'Review suggested', color: '#e0a35c', icon: 'Eye', tone: 'amber' },
  watch: { label: 'Gentle shift', color: '#e8bd7a', icon: 'Activity', tone: 'amber' },
  data: { label: 'Data quality', color: '#a99bdc', icon: 'Watch', tone: 'lav' },
};

export function patientStatus(analysis, openAlerts = []) {
  if (openAlerts.some((a) => a.level === 'urgent' && a.status === 'new')) return 'urgent';
  return analysis.status;
}

export function StatusPill({ s }) {
  const m = STATUS[s] || STATUS.steady;
  return <Pill tone={m.tone} icon={m.icon}>{m.label}</Pill>;
}

export function topShiftText(analysis, n = 2) {
  const list = analysis.shifted.length ? analysis.shifted : analysis.improved;
  if (!list.length) return 'Within personal baseline';
  return list.slice(0, n).map((s) => `${s.meta.short} ${deltaText(s)}`).join(' · ');
}
