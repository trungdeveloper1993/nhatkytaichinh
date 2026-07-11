export type FundType = 'cash' | 'bank';

export interface Fund {
  id: string;
  name: string;
  type: FundType;
  balance: number;
  accountNumber?: string;
  color: string; // Tailwind color name like 'emerald', 'indigo', 'amber', 'rose' etc.
  monthlyLimit?: number; // Hạn mức chi tiêu hàng tháng tối đa
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  fundId: string;
  category: string; // mục đích/hạng mục chi tiêu hoặc nguồn tiền
  notes?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  percentageChange: number; // so với tháng trước
}

export const CATEGORIES_EXPENSE = [
  'Ăn uống 🍜',
  'Mua sắm 🛍️',
  'Di chuyển 🚗',
  'Nhà cửa 🏠',
  'Học tập 📚',
  'Giải trí 🎬',
  'Sức khỏe 💊',
  'Khác ⚙️'
];

export const CATEGORIES_INCOME = [
  'Lương cố định 💼',
  'Thưởng công việc 🏆',
  'Làm thêm (Freelance) 💻',
  'Đầu tư 📈',
  'Quà tặng 🎁',
  'Nguồn khác 💵'
];

export const FUND_COLORS = [
  { name: 'Xanh Lá (Sức sống)', value: 'emerald', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', activeBg: 'bg-emerald-500' },
  { name: 'Xanh Dương (Tin cậy)', value: 'blue', bg: 'bg-blue-50 text-blue-700 border-blue-200', activeBg: 'bg-blue-500' },
  { name: 'Tím (Mơ ước)', value: 'purple', bg: 'bg-purple-50 text-purple-700 border-purple-200', activeBg: 'bg-purple-500' },
  { name: 'Vàng (Năng lượng)', value: 'amber', bg: 'bg-amber-50 text-amber-700 border-amber-200', activeBg: 'bg-amber-500' },
  { name: 'Đỏ (Quyết tâm)', value: 'rose', bg: 'bg-rose-50 text-rose-700 border-rose-200', activeBg: 'bg-rose-500' },
  { name: 'Chàm (Bền vững)', value: 'indigo', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', activeBg: 'bg-indigo-500' },
];
