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

const LABELS: Record<string, string> = {
  topup: 'Wallet top-up',
  topup_bonus: 'Top-up bonus',
  withdrawal: 'Withdrawal',
  commission: 'Ride fare',
};

const labelFor = (tx: Transaction) => {
  if (tx.type === 'ride_payment') return tx.direction === 'incoming' ? 'Ride earnings' : 'Ride fare';
  return LABELS[tx.type] ?? tx.type.replace(/_/g, ' ');
};

export function toTransactionRows(transactions: Transaction[]): TransactionRow[] {
  const rows: TransactionRow[] = [];
  const rideFares = new Map<number, TransactionRow>();

  for (const tx of transactions) {
    const label = labelFor(tx);
    if (label === 'Ride fare' && tx.rideId != null) {
      const existing = rideFares.get(tx.rideId);
      if (existing) {
        existing.amount += tx.amount;
        continue;
      }
      const row = { key: `ride-${tx.rideId}`, label: `Ride fare #${tx.rideId}`, amount: tx.amount, direction: tx.direction, date: tx.date };
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

export const formatTxDate = (date: string) =>
  new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
