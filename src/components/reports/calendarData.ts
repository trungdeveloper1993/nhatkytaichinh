import { Transaction } from '../../types';

// Tổng hợp thu – chi theo ngày cho lịch báo cáo. Chuyển quỹ không tính vào thu/chi.

export interface DaySummary {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
  net: number; // thu − chi
  count: number; // tổng số giao dịch (kể cả chuyển quỹ)
  transfers: number;
}

export interface MonthSummary {
  days: Map<string, DaySummary>;
  income: number;
  expense: number;
  net: number;
  maxGain: number; // ngày có (thu − chi) dương lớn nhất
  maxLoss: number; // độ lớn của ngày âm nhiều nhất
  biggestSpendDay: DaySummary | null;
}

export function summarizeMonth(transactions: Transaction[], monthKey: string): MonthSummary {
  const days = new Map<string, DaySummary>();
  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey)) continue;
    let d = days.get(tx.date);
    if (!d) {
      d = { date: tx.date, income: 0, expense: 0, net: 0, count: 0, transfers: 0 };
      days.set(tx.date, d);
    }
    d.count += 1;
    if (tx.type === 'income') d.income += tx.amount;
    else if (tx.type === 'expense') d.expense += tx.amount;
    else d.transfers += 1;
    d.net = d.income - d.expense;
  }

  let income = 0;
  let expense = 0;
  let maxGain = 0;
  let maxLoss = 0;
  let biggestSpendDay: DaySummary | null = null;
  for (const d of days.values()) {
    income += d.income;
    expense += d.expense;
    if (d.net > maxGain) maxGain = d.net;
    if (-d.net > maxLoss) maxLoss = -d.net;
    if (d.expense > 0 && (!biggestSpendDay || d.expense > biggestSpendDay.expense)) biggestSpendDay = d;
  }
  return { days, income, expense, net: income - expense, maxGain, maxLoss, biggestSpendDay };
}

// Thu − chi cộng dồn từ đầu tháng đến hết ngày `date`
export function cumulativeNet(summary: MonthSummary, date: string): number {
  let total = 0;
  for (const d of summary.days.values()) if (d.date <= date) total += d.net;
  return total;
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftDay(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(y, m - 1, d + delta);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

// Ô lịch tuần bắt đầu từ Thứ Hai; null = ô trống ngoài tháng. Độ dài luôn chia hết cho 7.
export function buildMonthGrid(monthKey: string): (string | null)[] {
  const [y, m] = monthKey.split('-').map(Number);
  const leading = (new Date(y, m - 1, 1).getDay() + 6) % 7; // CN=0 -> 6
  const total = daysInMonth(monthKey);
  const cells: (string | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= total; day++) cells.push(`${monthKey}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// Mức màu −4..4 (âm = chi nhiều hơn thu). Chia căn bậc hai theo từng phía để ngày nhỏ vẫn thấy màu.
export function heatLevel(net: number, maxGain: number, maxLoss: number): number {
  if (net > 0 && maxGain > 0) return Math.min(4, Math.max(1, Math.ceil(Math.sqrt(net / maxGain) * 4)));
  if (net < 0 && maxLoss > 0) return -Math.min(4, Math.max(1, Math.ceil(Math.sqrt(-net / maxLoss) * 4)));
  return 0;
}

// Số siêu gọn cho ô lịch: 16,7k · 1,25tr · 30tr · 1,84 tỷ (không dấu, không ₫)
export function formatShort(amount: number, tight = false): string {
  const abs = Math.abs(amount);
  const fmt = (v: number, digits: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: digits });
  if (abs >= 1e9) return `${fmt(abs / 1e9, tight ? 1 : 2)}${tight ? 'tỷ' : ' tỷ'}`;
  if (abs >= 1e6) return `${fmt(abs / 1e6, abs >= 1e8 ? 0 : abs >= 1e7 || tight ? 1 : 2)}tr`;
  if (abs >= 1e3) return `${fmt(abs / 1e3, abs >= 1e5 ? 0 : 1)}k`;
  return fmt(abs, 0);
}

export function signedShort(amount: number, tight = false): string {
  if (amount === 0) return '0';
  return `${amount > 0 ? '+' : '−'}${formatShort(amount, tight)}`;
}
