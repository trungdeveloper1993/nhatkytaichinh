import { useState, useMemo } from 'react';
import { Transaction, Fund } from '../types';
import { calculateCategorySpending, calculateMonthlyReports, formatMonthYear } from '../utils';
import { usePrivacy } from '../PrivacyContext';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, PieChart as PieIcon, BarChart3, AlertCircle, AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface FinancialChartsProps {
  transactions: Transaction[];
  funds: Fund[];
}

const COLOR_PALETTE = [
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#64748b'  // Slate
];

export default function FinancialCharts({ transactions, funds }: FinancialChartsProps) {
  const { format: formatCurrency } = usePrivacy();
  // Get all unique months from transactions in sorted order
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    // Default current month in case transactions are empty
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentMonth);

    transactions.forEach((tx) => {
      months.add(tx.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse(); // Show latest month first
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0] || '2026-07';
  });

  // Calculate stats for selected month
  const selectedMonthStats = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions
      .filter((tx) => tx.date.startsWith(selectedMonth))
      .forEach((tx) => {
        if (tx.type === 'income') {
          income += tx.amount;
        } else if (tx.type === 'expense') {
          expense += tx.amount;
        }
        // Bỏ qua giao dịch chuyển quỹ (transfer)
      });

    return { income, expense, balance: income - expense };
  }, [transactions, selectedMonth]);

  // MoM monthly reports
  const monthlyReports = useMemo(() => {
    return calculateMonthlyReports(transactions);
  }, [transactions]);

  // Find percentage change for current selected month compared to previous month
  const momChange = useMemo(() => {
    const currentIdx = monthlyReports.findIndex((r) => r.month === selectedMonth);
    if (currentIdx > 0) {
      const prevReport = monthlyReports[currentIdx - 1];
      const currReport = monthlyReports[currentIdx];
      
      // Calculate spending change percentage
      let expenseChangePercent = 0;
      if (prevReport.totalExpense > 0) {
        expenseChangePercent = ((currReport.totalExpense - prevReport.totalExpense) / prevReport.totalExpense) * 100;
      } else if (currReport.totalExpense > 0) {
        expenseChangePercent = 100;
      }

      // Calculate net savings change percentage
      let netChangePercent = 0;
      if (prevReport.netChange !== 0) {
        netChangePercent = ((currReport.netChange - prevReport.netChange) / Math.abs(prevReport.netChange)) * 100;
      } else if (currReport.netChange !== 0) {
        netChangePercent = 100;
      }

      return {
        expenseChangePercent,
        netChangePercent,
        hasPrev: true,
        prevMonthName: formatMonthYear(prevReport.month)
      };
    }
    return { expenseChangePercent: 0, netChangePercent: 0, hasPrev: false, prevMonthName: '' };
  }, [monthlyReports, selectedMonth]);

  // Category spending data
  const categorySpendingData = useMemo(() => {
    return calculateCategorySpending(transactions, selectedMonth);
  }, [transactions, selectedMonth]);

  const totalSpending = useMemo(() => {
    return categorySpendingData.reduce((sum, item) => sum + item.value, 0);
  }, [categorySpendingData]);

  // Chi tiêu theo nhóm của THÁNG TRƯỚC (để so sánh nhận định)
  const prevMonth = useMemo(() => {
    const idx = monthlyReports.findIndex((r) => r.month === selectedMonth);
    return idx > 0 ? monthlyReports[idx - 1].month : null;
  }, [monthlyReports, selectedMonth]);

  const prevCategorySpending = useMemo(() => {
    return prevMonth ? calculateCategorySpending(transactions, prevMonth) : [];
  }, [transactions, prevMonth]);

  // Tổng kết & nhận định tự động cho tháng đang xem
  const insights = useMemo(() => {
    const list: { id: string; level: 'warning' | 'positive' | 'info'; text: string }[] = [];
    const { income, expense, balance } = selectedMonthStats;

    if (income === 0 && expense === 0) {
      list.push({ id: 'nodata', level: 'info', text: 'Chưa có giao dịch nào trong tháng này. Hãy ghi chép thu chi để nhận nhận định chi tiết.' });
      return list;
    }

    // Tổng chi tiêu so với tháng trước
    if (momChange.hasPrev && expense > 0) {
      const p = momChange.expenseChangePercent;
      if (p >= 20) {
        list.push({ id: 'exp-up', level: 'warning', text: `Tổng chi tiêu tháng này TĂNG MẠNH ${p.toFixed(0)}% so với ${momChange.prevMonthName}. Hãy chú ý kiểm soát và giảm chi tiêu xuống!` });
      } else if (p <= -15) {
        list.push({ id: 'exp-down', level: 'positive', text: `Tổng chi tiêu giảm ${Math.abs(p).toFixed(0)}% so với ${momChange.prevMonthName}. Bạn đang kiểm soát rất tốt!` });
      }
    }

    // Nhóm chi tiêu tăng mạnh so với tháng trước
    const prevMap = new Map<string, number>(prevCategorySpending.map((c) => [c.name, c.value] as [string, number]));
    categorySpendingData.forEach((c) => {
      const prev = prevMap.get(c.name) || 0;
      if (prev > 0) {
        const change = ((c.value - prev) / prev) * 100;
        if (change >= 30 && c.value >= 300000) {
          list.push({ id: `cat-${c.name}`, level: 'warning', text: `Chi cho "${c.name}" tăng mạnh ${change.toFixed(0)}% (${formatCurrency(c.value)}) so với tháng trước. Cân nhắc giảm bớt khoản này.` });
        }
      } else if (c.value >= 1000000 && momChange.hasPrev) {
        list.push({ id: `cat-new-${c.name}`, level: 'warning', text: `Khoản chi mới đáng kể cho "${c.name}": ${formatCurrency(c.value)}. Hãy kiểm tra xem có thực sự cần thiết không.` });
      }
    });

    // Thâm hụt / thặng dư
    if (balance < 0) {
      list.push({ id: 'deficit', level: 'warning', text: `Tháng này CHI NHIỀU HƠN THU ${formatCurrency(Math.abs(balance))}. Cần tiết kiệm hơn để tránh thâm hụt.` });
    } else if (income > 0 && balance > 0) {
      const rate = (balance / income) * 100;
      list.push({ id: 'surplus', level: 'positive', text: `Bạn để dành được ${formatCurrency(balance)} (${rate.toFixed(0)}% thu nhập) trong tháng này. Tiếp tục phát huy!` });
    }

    // Khoản chi lớn nhất
    if (categorySpendingData.length > 0 && expense > 0) {
      const top = [...categorySpendingData].sort((a, b) => b.value - a.value)[0];
      const pct = (top.value / expense) * 100;
      list.push({ id: 'top', level: 'info', text: `Khoản chi lớn nhất: "${top.name}" — ${formatCurrency(top.value)} (${pct.toFixed(0)}% tổng chi tiêu).` });
    }

    return list;
  }, [selectedMonthStats, momChange, categorySpendingData, prevCategorySpending, formatCurrency]);

  // Data for the MoM Income vs Expense bar chart
  const barChartData = useMemo(() => {
    return monthlyReports.map((r) => ({
      name: formatMonthYear(r.month),
      'Thu nhập 💰': r.totalIncome,
      'Chi tiêu 💸': r.totalExpense
    }));
  }, [monthlyReports]);

  return (
    <div id="financial-charts-container" className="space-y-6">
      {/* Month Filter Selector & Quick Summary */}
      <div className="bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl p-3.5 min-[450px]:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <h4 className="text-[11px] min-[360px]:text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian xem báo cáo</h4>
            <div className="flex items-center gap-2 mt-1">
              <select
                id="charts-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="font-display font-bold text-slate-800 text-xs min-[360px]:text-sm bg-white/60 border border-white/60 px-2.5 py-1.5 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-100 cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthYear(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 min-[380px]:gap-2 sm:gap-4 md:gap-6 flex-1 w-full max-w-xl">
          <div className="bg-white/60 px-2 py-2.5 min-[380px]:px-2.5 min-[450px]:p-3.5 rounded-xl border border-white/40 shadow-xs flex flex-col justify-between min-w-0">
            <p className="text-[9px] min-[360px]:text-[10px] font-bold text-slate-500 uppercase tracking-tight">Tổng Thu</p>
            <p className="font-display font-bold text-[10.5px] min-[360px]:text-xs min-[450px]:text-sm sm:text-base text-emerald-600 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" title={`+${formatCurrency(selectedMonthStats.income)}`}>
              +{formatCurrency(selectedMonthStats.income)}
            </p>
          </div>
          <div className="bg-white/60 px-2 py-2.5 min-[380px]:px-2.5 min-[450px]:p-3.5 rounded-xl border border-white/40 shadow-xs flex flex-col justify-between min-w-0">
            <p className="text-[9px] min-[360px]:text-[10px] font-bold text-slate-500 uppercase tracking-tight">Tổng Chi</p>
            <p className="font-display font-bold text-[10.5px] min-[360px]:text-xs min-[450px]:text-sm sm:text-base text-red-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" title={`-${formatCurrency(selectedMonthStats.expense)}`}>
              -{formatCurrency(selectedMonthStats.expense)}
            </p>
          </div>
          <div className="bg-white/60 px-2 py-2.5 min-[380px]:px-2.5 min-[450px]:p-3.5 rounded-xl border border-white/40 shadow-xs flex flex-col justify-between min-w-0">
            <p className="text-[9px] min-[360px]:text-[10px] font-bold text-slate-500 uppercase tracking-tight">Thặng dư</p>
            <p className={`font-display font-bold text-[10.5px] min-[360px]:text-xs min-[450px]:text-sm sm:text-base mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis ${
              selectedMonthStats.balance >= 0 ? 'text-indigo-600' : 'text-amber-600'
            }`} title={`${selectedMonthStats.balance >= 0 ? '+' : ''}${formatCurrency(selectedMonthStats.balance)}`}>
              {selectedMonthStats.balance >= 0 ? '+' : ''}
              {formatCurrency(selectedMonthStats.balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Tổng Kết & Nhận Định */}
      {insights.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-white/40 shadow-xs">
          <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Tổng Kết &amp; Nhận Định — {formatMonthYear(selectedMonth)}
          </h3>
          <div className="space-y-2">
            {insights.map((ins) => {
              const isWarn = ins.level === 'warning';
              const isPos = ins.level === 'positive';
              const wrap = isWarn
                ? 'bg-red-50 border-red-300'
                : isPos
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-white/50 border-white/60';
              const textCls = isWarn
                ? 'text-red-700 font-bold'
                : isPos
                ? 'text-emerald-800 font-semibold'
                : 'text-slate-600 font-medium';
              return (
                <div key={ins.id} className={`flex items-start gap-2.5 p-3 rounded-xl border ${wrap}`}>
                  {isWarn ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                  ) : isPos ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  )}
                  <p className={`text-xs leading-relaxed ${textCls}`}>{ins.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month over Month Report Metrics */}
      {momChange.hasPrev && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-white/40 shadow-xs">
            <div className={`p-2.5 rounded-xl ${
              momChange.expenseChangePercent > 0 ? 'bg-red-100/50 text-red-700' : 'bg-emerald-100/50 text-emerald-700'
            }`}>
              {momChange.expenseChangePercent > 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Chi tiêu so với {momChange.prevMonthName}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {momChange.expenseChangePercent > 0 ? 'Tăng' : 'Giảm'}{' '}
                <span className={`font-bold ${momChange.expenseChangePercent > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {Math.abs(momChange.expenseChangePercent).toFixed(1)}%
                </span>
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-white/40 shadow-xs">
            <div className={`p-2.5 rounded-xl ${
              momChange.netChangePercent >= 0 ? 'bg-emerald-100/50 text-emerald-700' : 'bg-rose-100/50 text-rose-700'
            }`}>
              {momChange.netChangePercent >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Thặng dư tích lũy so với {momChange.prevMonthName}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {momChange.netChangePercent >= 0 ? 'Tăng trưởng' : 'Suy giảm'}{' '}
                <span className={`font-bold ${momChange.netChangePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {Math.abs(momChange.netChangePercent).toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Two main sections: Category breakdown and MoM Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Category Spending Pie Chart */}
        <div id="category-pie-chart" className="glass-card rounded-3xl p-5 shadow-xs border border-white/40 lg:col-span-5 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
              <PieIcon className="w-4 h-4 text-rose-500" />
              <span>Cơ cấu Chi Tiêu</span>
            </h3>

            {totalSpending === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-white/20 backdrop-blur-xs rounded-2xl border border-dashed border-white/40">
                <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-500">Không có dữ liệu chi tiêu</p>
                <p className="text-[10px] text-slate-500 mt-1">Vui lòng ghi chép chi tiêu trong tháng này để hiển thị cơ cấu biểu đồ.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recharts Pie */}
                <div className="h-[180px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySpendingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categorySpendingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [formatCurrency(Number(value)), 'Đã chi']}
                        contentStyle={{ fontSize: '12px', borderRadius: '10px', fontFamily: 'sans-serif' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom list details */}
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {categorySpendingData.map((item, index) => {
                    const percent = ((item.value / totalSpending) * 100).toFixed(1);
                    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
                    return (
                      <div key={item.name} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-medium text-slate-700 truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <span className="text-slate-800 font-semibold">{formatCurrency(item.value)}</span>
                          <span className="text-slate-400 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md font-bold">{percent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: MoM Income vs Expense Comparison Chart */}
        <div id="mom-bar-chart" className="glass-card rounded-3xl p-5 shadow-xs border border-white/40 lg:col-span-7 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>Đối Soát Thu Nhập & Chi Tiêu Hàng Tháng</span>
            </h3>

            {barChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                <p className="text-xs text-slate-400 font-medium">Chưa có dữ liệu tháng</p>
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value))]}
                      contentStyle={{ fontSize: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar
                      dataKey="Thu nhập 💰"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Chi tiêu 💸"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
