import type { TKey } from '@/i18n';

type T = (key: TKey, values?: Record<string, string | number>) => string;

// "Today · 14:30", "Tomorrow · 08:00" or "Sat 25 Oct · 08:00", in the phone's time zone.
export function departureLabel(iso: string, locale: string, t: T): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((day - today) / 86_400_000);
  if (days === 0) return t('scheduled.todayAt', { time });
  if (days === 1) return t('scheduled.tomorrowAt', { time });
  return `${d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · ${time}`;
}
