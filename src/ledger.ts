import { Fund, Transaction } from './types';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;

// Áp dụng ảnh hưởng của một giao dịch lên số dư các quỹ.
// sign = -1 để hoàn tác (dùng khi xóa / sửa giao dịch).
export function applyTransaction(funds: Fund[], tx: TransactionInput, sign: 1 | -1 = 1): Fund[] {
  return funds.map((f) => {
    if (tx.type === 'transfer') {
      if (f.id === tx.fundId) return { ...f, balance: f.balance - sign * tx.amount };
      if (f.id === tx.toFundId) return { ...f, balance: f.balance + sign * tx.amount };
      return f;
    }
    if (f.id === tx.fundId) {
      const delta = tx.type === 'income' ? tx.amount : -tx.amount;
      return { ...f, balance: f.balance + sign * delta };
    }
    return f;
  });
}

export function revertTransaction(funds: Fund[], tx: TransactionInput): Fund[] {
  return applyTransaction(funds, tx, -1);
}

// Mới nhất trước: theo ngày giao dịch, cùng ngày thì theo thời điểm ghi
export function sortTransactionsDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

// "YYYY-MM-DD" theo giờ địa phương
export function toISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "YYYY-MM" theo giờ địa phương
export function toMonthKey(d: Date = new Date()): string {
  return toISODate(d).slice(0, 7);
}

export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return toMonthKey(new Date(y, m - 2, 1));
}

// Tổng chi tiêu của một quỹ trong tháng
export function fundSpentInMonth(transactions: Transaction[], fundId: string, monthKey: string): number {
  return transactions
    .filter((t) => t.fundId === fundId && t.type === 'expense' && t.date.startsWith(monthKey))
    .reduce((sum, t) => sum + t.amount, 0);
}

// Tổng thu / chi trong tháng (bỏ qua chuyển quỹ vì không phải thu chi thật)
export function monthTotals(transactions: Transaction[], monthKey: string) {
  let income = 0;
  let expense = 0;
  transactions.forEach((t) => {
    if (!t.date.startsWith(monthKey)) return;
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expense += t.amount;
  });
  return { income, expense, net: income - expense };
}

// Quỹ ghim lên đầu, còn lại theo bảng chữ cái tiếng Việt
export function sortFunds(funds: Fund[]): Fund[] {
  return [...funds].sort(
    (a, b) =>
      (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
      a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
  );
}
