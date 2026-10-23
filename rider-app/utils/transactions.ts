// Turns raw ledger transactions from GET /api/wallet/transactions into rows
// people can read. A rider's ride fare is paid as two entries (driver share +
// commission); they are shown as one "Ride fare" row.

export type Transaction = {
  id: number;
  amount: number;
  type: string;
  direction: 'incoming' | 'outgoing';
  rideId: number | null;
  paymentId: number | null;
  date: string;
};

export type TransactionRow = {
  key: string;
  label: string;
  amount: number;
  direction: 'incoming' | 'outgoing';
  date: string;
};

// Row names in the rider's language (wallet.tx* strings).
export type TransactionLabels = {
  topup: string;
  topupBonus: string;
  withdrawal: string;
  rideFare: string;
  rideEarnings: string;
};

const isRideFare = (tx: Transaction) => tx.type === 'commission' || (tx.type === 'ride_payment' && tx.direction !== 'incoming');

const labelFor = (tx: Transaction, l: TransactionLabels) => {
  if (isRideFare(tx)) return l.rideFare;
  if (tx.type === 'ride_payment') return l.rideEarnings;
  const known: Record<string, string> = { topup: l.topup, topup_bonus: l.topupBonus, withdrawal: l.withdrawal };
  return known[tx.type] ?? tx.type.replace(/_/g, ' ');
};

export function toTransactionRows(transactions: Transaction[], labels: TransactionLabels): TransactionRow[] {
  const rows: TransactionRow[] = [];
  const rideFares = new Map<number, TransactionRow>();

  for (const tx of transactions) {
    const label = labelFor(tx, labels);
    if (isRideFare(tx) && tx.rideId != null) {
      const existing = rideFares.get(tx.rideId);
      if (existing) {
        existing.amount += tx.amount;
        continue;
      }
      const row = { key: `ride-${tx.rideId}`, label: `${label} #${tx.rideId}`, amount: tx.amount, direction: tx.direction, date: tx.date };
      rideFares.set(tx.rideId, row);
      rows.push(row);
      continue;
    }
    rows.push({
      key: String(tx.id),
      label: tx.type === 'ride_payment' && tx.rideId != null ? `${label} #${tx.rideId}` : label,
      amount: tx.amount,
      direction: tx.direction,
      date: tx.date,
    });
  }
  return rows;
}

export const formatTxDate = (date: string, locale?: string) =>
  new Date(date).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
