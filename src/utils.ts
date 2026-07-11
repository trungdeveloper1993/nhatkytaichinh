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
    } else {
      reportsMap[month].expense += tx.amount;
    }
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
