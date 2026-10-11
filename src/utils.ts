import { Fund, Transaction, MonthlyReport } from './types';

// Format currency to VND
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Group transactions by month and compute report
export function calculateMonthlyReports(
  transactions: Transaction[],
  currentDateStr: string = '2026-07-10'
): MonthlyReport[] {
  const reportsMap: Record<string, { income: number; expense: number }> = {};

  // Initialize from transaction dates
  transactions.forEach((tx) => {
    const month = tx.date.substring(0, 7); // "YYYY-MM"
    if (!reportsMap[month]) {
      reportsMap[month] = { income: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      reportsMap[month].income += tx.amount;
    } else if (tx.type === 'expense') {
      reportsMap[month].expense += tx.amount;
    }
    // Bỏ qua giao dịch chuyển quỹ (transfer) vì không phải thu/chi thực sự
  });

  // Ensure current and previous months exist for MoM calculation even if empty
  const currentMonth = currentDateStr.substring(0, 7);
  const currentYear = parseInt(currentMonth.split('-')[0]);
  const currentMonthNum = parseInt(currentMonth.split('-')[1]);

  let prevMonthNum = currentMonthNum - 1;
  let prevYear = currentYear;
  if (prevMonthNum === 0) {
    prevMonthNum = 12;
    prevYear -= 1;
  }
  const prevMonthStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

  if (!reportsMap[currentMonth]) {
    reportsMap[currentMonth] = { income: 0, expense: 0 };
  }
  if (!reportsMap[prevMonthStr]) {
    reportsMap[prevMonthStr] = { income: 0, expense: 0 };
  }

  const months = Object.keys(reportsMap).sort();

  return months.map((month, idx) => {
    const { income, expense } = reportsMap[month];
    const netChange = income - expense;

    // Calculate percentage change of net compared to previous month
    let percentageChange = 0;
    if (idx > 0) {
      const prevMonth = months[idx - 1];
      const prevNet = reportsMap[prevMonth].income - reportsMap[prevMonth].expense;
      if (prevNet !== 0) {
        percentageChange = ((netChange - prevNet) / Math.abs(prevNet)) * 100;
      } else if (netChange !== 0) {
        percentageChange = 100; // From zero to non-zero is 100%
      }
    }

    return {
      month,
      totalIncome: income,
      totalExpense: expense,
      netChange,
      percentageChange
    };
  });
}

// Compute spending by category for a specific month
export function calculateCategorySpending(
  transactions: Transaction[],
  monthStr: string // "YYYY-MM"
): { name: string; value: number }[] {
  const categoryMap: Record<string, number> = {};

  transactions
    .filter((tx) => tx.type === 'expense' && tx.date.startsWith(monthStr))
    .forEach((tx) => {
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    });

  return Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value
  }));
}

// Định dạng gọn cho chỗ hẹp: 1.840.647.277 -> "1,84 tỷ", 16.700.000 -> "16,7 tr", 950.000 -> "950k"
export function formatCompactVND(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const fmt = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: v < 10 ? 2 : 1 });
  if (abs >= 1e9) return `${sign}${fmt(abs / 1e9)} tỷ`;
  if (abs >= 1e6) return `${sign}${fmt(abs / 1e6)} tr`;
  if (abs >= 1e3) return `${sign}${fmt(abs / 1e3)}k`;
  return `${sign}${abs.toLocaleString('vi-VN')} ₫`;
}

// ---- Đọc số tiền thành chữ tiếng Việt (chống nhập thừa/thiếu số 0) ----
const DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

// Đọc 3 chữ số; full = đọc cả "không trăm"/"linh" (khi không phải nhóm đứng đầu)
function readTriple(n: number, full: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];
  if (h > 0 || full) parts.push(`${DIGIT_WORDS[h]} trăm`);
  if (t === 0) {
    if (u > 0) {
      if (h > 0 || full) parts.push('linh');
      parts.push(DIGIT_WORDS[u]);
    }
  } else if (t === 1) {
    parts.push('mười');
    if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGIT_WORDS[u]);
  } else {
    parts.push(`${DIGIT_WORDS[t]} mươi`);
    if (u === 1) parts.push('mốt');
    else if (u === 4) parts.push('tư');
    else if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGIT_WORDS[u]);
  }
  return parts.join(' ');
}

// Đọc số < 1 tỷ theo nhóm triệu / nghìn / đơn vị
function readBelowBillion(n: number, full: boolean): string {
  const groups = [n % 1000, Math.floor(n / 1000) % 1000, Math.floor(n / 1e6) % 1000];
  const names = ['', 'nghìn', 'triệu'];
  let top = 2;
  while (top > 0 && groups[top] === 0) top--;
  const words: string[] = [];
  for (let i = top; i >= 0; i--) {
    if (groups[i] === 0) continue;
    words.push(readTriple(groups[i], i === top ? full : true) + (names[i] ? ` ${names[i]}` : ''));
  }
  return words.join(' ');
}

function readNumber(n: number, full: boolean): string {
  if (n >= 1e9) {
    const head = `${readNumber(Math.floor(n / 1e9), full)} tỷ`;
    const rest = n % 1e9;
    return rest > 0 ? `${head} ${readBelowBillion(rest, true)}` : head;
  }
  return readBelowBillion(n, full);
}

export function numberToVietnameseWords(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Không đồng';
  const text = readNumber(n, false).replace(/\s+/g, ' ').trim();
  return `${amount < 0 ? 'Âm ' : ''}${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}

// Đọc "YYYY-MM-DD" thành Date theo giờ địa phương (tránh lệch ngày do múi giờ)
export function parseISODateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

// Nhãn ngày thân thiện cho lịch sử: "Hôm nay", "Hôm qua", "Thứ hai, 05/10/2026"
export function friendlyDayLabel(dateStr: string, now: Date = new Date()): string {
  const d = parseISODateLocal(dateStr);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]}, ${dd}/${mm}/${d.getFullYear()}`;
}

// Ngày đầy đủ cho lời chào: "Chủ nhật, 11/10/2026"
export function fullDateLabel(now: Date = new Date()): string {
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${WEEKDAYS[now.getDay()]}, ${dd}/${mm}/${now.getFullYear()}`;
}

// Format "YYYY-MM" to "Tháng MM/YYYY"
export function formatMonthYear(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return `Tháng ${month}/${year}`;
}

// Format ISO date or date string to full friendly date "DD/MM/YYYY" or "HH:MM DD/MM/YYYY"
export function formatFriendlyDate(dateStr: string, includeTime = false): string {
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    if (includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    }
    
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}
