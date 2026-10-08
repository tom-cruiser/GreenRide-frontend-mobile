// Formatting shared by both apps.

const NBSP = ' '; // narrow no-break space, as on the website: "12 500 FBU"

// Whole amounts with grouped thousands: 12500 → "12 500 FBU".
export function formatMoney(amount: number | null | undefined, currency = 'FBU'): string {
  const n = Math.round(Number(amount ?? 0));
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${digits} ${currency}`;
}

export const formatKm = (km: number | null | undefined) =>
  km == null ? '—' : `${Number(km).toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`;

// Riders and drivers see each other's first name and initials only.
export const firstName = (name?: string | null) => String(name ?? '').trim().split(/\s+/)[0] || '';
export const initials = (name?: string | null) =>
  String(name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

export function formatDateTime(iso: string | null | undefined, locale = 'fr') {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
}
