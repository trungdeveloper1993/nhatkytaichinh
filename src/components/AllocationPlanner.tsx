import { useMemo, useState } from 'react';
import { Fund, Transaction, FUND_COLORS } from '../types';
import { formatCurrency } from '../utils';
import { PieChart, Wallet, RefreshCw, Sparkles, Info } from 'lucide-react';
import { motion } from 'motion/react';
import MoneyInput from './ui/MoneyInput';

const LS_ALLOC_INCOME = 'nhat_ky_tai_chinh_alloc_income';

interface AllocationPlannerProps {
  funds: Fund[];
  transactions: Transaction[];
  onUpdateFund: (fund: Fund) => void;
}

export default function AllocationPlanner({ funds, transactions, onUpdateFund }: AllocationPlannerProps) {
  // Bảng phân bổ chỉ là gợi ý nên luôn hiển thị số thật (không che theo chế độ ẩn)
  const formatMasked = formatCurrency;

  // Tổng thu nhập ("Bổ sung tiền") của tháng hiện tại
  const currentMonthIncome = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions
      .filter((t) => t.type === 'income' && t.date.startsWith(prefix))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Quỹ tiêu dùng (không tham gia phân bổ) và quỹ được phân bổ
  const spendingFunds = funds.filter((f) => f.isSpending);
  const allocatableFunds = funds.filter((f) => !f.isSpending);

  // Tổng giới hạn của các quỹ tiêu dùng (dùng làm số giữ lại tiêu dùng mặc định)
  const spendingLimit = spendingFunds.reduce((s, f) => s + (f.monthlyLimit ?? 0), 0);

  // Tổng thu nhập tháng: lưu lại giá trị đã nhập, dùng lại lần sau (không reset)
  const [income, setIncomeState] = useState<number>(() => {
    const saved = localStorage.getItem(LS_ALLOC_INCOME);
    if (saved !== null && saved !== '') {
      const n = Number(saved);
      if (!Number.isNaN(n)) return n;
    }
    return currentMonthIncome;
  });
  const setIncome = (value: number) => {
    setIncomeState(value);
    try {
      localStorage.setItem(LS_ALLOC_INCOME, String(value));
    } catch {
      // bỏ qua nếu trình duyệt chặn lưu trữ
    }
  };
  const [consumption, setConsumption] = useState<number>(spendingLimit);
  const [ticked, setTicked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    funds.forEach((f) => {
      // Mặc định tick sẵn (đã chia %) cho các quỹ có tỷ lệ phân bổ
      init[f.id] = !f.isSpending && (f.allocationPercent ?? 0) > 0;
    });
    return init;
  });

  const distributable = Math.max(0, income - consumption);

  // Tính số tiền gợi ý cho từng quỹ (chỉ những quỹ được tick, đã loại quỹ tiêu dùng)
  const rows = allocatableFunds.map((f) => {
    const percent = f.allocationPercent ?? 0;
    const included = ticked[f.id] ?? false;
    const raw = included ? Math.round((distributable * percent) / 100) : 0;
    // Tôn trọng trần quỹ: không gợi ý vượt quá số dư tối đa
    const room = f.maxBalance ? Math.max(0, f.maxBalance - f.balance) : Infinity;
    const amount = Math.min(raw, room);
    const capped = raw > amount; // bị giới hạn bởi trần quỹ
    return { fund: f, percent, included, amount, capped };
  });

  const totalPercentTicked = rows.filter((r) => r.included).reduce((s, r) => s + r.percent, 0);
  const totalAllocated = rows.reduce((s, r) => s + r.amount, 0);
  const leftover = distributable - totalAllocated;

  const colorOf = (fund: Fund) =>
    FUND_COLORS.find((c) => c.value === fund.color) || FUND_COLORS[0];

  const handlePercentChange = (fund: Fund, value: number) => {
    const clamped = Math.max(0, Math.min(100, value || 0));
    onUpdateFund({ ...fund, allocationPercent: clamped > 0 ? clamped : undefined });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="lg:hidden font-display font-black text-2xl text-slate-900 flex items-center gap-2">
          <PieChart className="w-6 h-6 text-indigo-600" />
          Phân bổ thu nhập
        </h2>
        <p className="text-xs text-slate-500 mt-1 lg:mt-0">
          Nhập tổng thu nhập tháng này, chọn (tick) các quỹ muốn phân bổ — app sẽ gợi ý số tiền theo tỷ lệ của từng quỹ. Đây chỉ là gợi ý, không tự tạo giao dịch.
        </p>
      </div>

      {funds.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-slate-500">
          <p className="text-sm font-semibold">Bạn chưa có quỹ nào. Hãy tạo quỹ và đặt "Tỷ lệ phân bổ thu nhập (%)" cho từng quỹ trước.</p>
        </div>
      ) : allocatableFunds.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-slate-500">
          <p className="text-sm font-semibold">Tất cả quỹ đang được đánh dấu là "quỹ tiêu dùng". Hãy bỏ tick ở ít nhất một quỹ (hoặc tạo quỹ mới) để có quỹ nhận phân bổ.</p>
        </div>
      ) : (
        <>
          {/* Inputs */}
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-2xl shadow-sm p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="alloc-income-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Tổng thu nhập tháng này
              </label>
              <MoneyInput id="alloc-income-input" value={income} onChange={setIncome} toneClass="text-emerald-600" showWords />
              <button
                id="alloc-use-actual-income-btn"
                type="button"
                onClick={() => setIncome(currentMonthIncome)}
                className="mt-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Dùng thu nhập thực tế tháng này ({formatMasked(currentMonthIncome)})
              </button>
            </div>

            <div>
              <label htmlFor="alloc-consumption-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Giữ lại cho tiêu dùng
              </label>
              <MoneyInput
                id="alloc-consumption-input"
                value={consumption}
                onChange={setConsumption}
                toneClass="text-amber-600"
                placeholder="Ví dụ: 5.000.000"
              />
              <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                Số còn lại đem chia theo tỷ lệ: <span className="text-indigo-600 font-bold">{formatMasked(distributable)}</span>
              </p>
              {spendingFunds.length > 0 && (
                <div className="mt-1 text-[11px] font-semibold text-slate-400">
                  <p>
                    Quỹ tiêu dùng: <span className="text-amber-600 font-bold">{spendingFunds.map((f) => f.name).join(', ')}</span>
                  </p>
                  {spendingLimit > 0 && (
                    <button
                      id="alloc-use-spending-limit-btn"
                      type="button"
                      onClick={() => setConsumption(spendingLimit)}
                      className="mt-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Dùng giới hạn quỹ tiêu dùng ({formatMasked(spendingLimit)})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bảng phân bổ */}
          <div className="glass-card rounded-2xl shadow-xs border border-white/40 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/30 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Danh sách quỹ</span>
              <span className="text-[11px] font-bold text-slate-400">Tổng tỷ lệ đã chọn: <span className={totalPercentTicked > 100 ? 'text-rose-600' : 'text-indigo-600'}>{totalPercentTicked}%</span></span>
            </div>

            <div className="divide-y divide-white/30">
              {rows.map(({ fund, percent, included, amount, capped }) => {
                const clr = colorOf(fund);
                return (
                  <div
                    key={fund.id}
                    className={`px-4 sm:px-5 py-3 flex items-center gap-2.5 sm:gap-3 transition-colors ${included ? 'bg-white/40' : 'bg-white/10 opacity-70'}`}
                  >
                    <input
                      id={`alloc-tick-${fund.id}`}
                      type="checkbox"
                      checked={included}
                      onChange={(e) => setTicked((prev) => ({ ...prev, [fund.id]: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />

                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clr.activeBg}`} />

                    <label htmlFor={`alloc-tick-${fund.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <p className="text-sm font-bold text-slate-800 leading-tight break-words">{fund.name}</p>
                      {fund.note && <p className="hidden sm:block text-[11px] text-slate-400 truncate italic">{fund.note}</p>}
                    </label>

                    {/* % editable (lưu vào quỹ) */}
                    <div className="relative shrink-0">
                      <input
                        id={`alloc-percent-${fund.id}`}
                        type="number"
                        min="0"
                        max="100"
                        value={percent === 0 ? '' : percent}
                        placeholder="0"
                        onChange={(e) => handlePercentChange(fund, Number(e.target.value))}
                        inputMode="numeric"
                        aria-label={`Tỷ lệ phân bổ cho ${fund.name}`}
                        className="w-14 sm:w-16 pl-2 pr-5 py-1.5 rounded-lg border border-slate-200 bg-white outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm sm:text-xs font-bold font-mono text-slate-700 text-right"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                    </div>

                    {/* Số tiền gợi ý */}
                    <div className="w-[5.5rem] sm:w-28 text-right shrink-0">
                      <span className={`text-xs sm:text-sm font-display font-bold font-mono tabular-nums ${included ? 'text-indigo-600' : 'text-slate-300'}`}>
                        {included ? formatMasked(amount) : '—'}
                      </span>
                      {included && capped && (
                        <p className="text-[10px] text-amber-600 font-bold">🔒 chạm trần quỹ</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tổng kết */}
            <div className="px-5 py-4 border-t border-white/40 bg-white/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Giữ lại tiêu dùng</span>
                <span className="font-mono font-bold text-amber-600">{formatMasked(consumption)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Tổng đã phân bổ</span>
                <span className="font-mono font-bold text-indigo-600">{formatMasked(totalAllocated)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-700 pt-1.5 border-t border-dashed border-slate-200">
                <span>Còn lại chưa phân bổ</span>
                <span className={`font-mono ${leftover < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatMasked(leftover)}</span>
              </div>
              {leftover < 0 && (
                <p className="text-[11px] text-rose-600 font-bold pt-1">⚠️ Tổng phân bổ vượt quá số tiền còn lại. Hãy giảm tỷ lệ hoặc số giữ lại tiêu dùng.</p>
              )}
            </div>
          </div>

          {/* Diễn giải chi tiết */}
          {income > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-5 shadow-xs border border-white/40"
            >
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-indigo-600" /> Diễn giải chi tiết
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li>• Tổng thu nhập: <b className="text-emerald-600 font-mono">{formatMasked(income)}</b></li>
                {consumption > 0 && (
                  <li>• Giữ lại cho tiêu dùng: <b className="text-amber-600 font-mono">{formatMasked(consumption)}</b></li>
                )}
                <li>• Số tiền đem chia theo tỷ lệ: <b className="text-indigo-600 font-mono">{formatMasked(distributable)}</b></li>
                {rows.filter((r) => r.included && r.amount > 0).map((r) => (
                  <li key={r.fund.id} className="pl-3">
                    → <b className="text-slate-800">{r.fund.name}</b>: {r.percent}% ={' '}
                    <b className="text-indigo-600 font-mono">{formatMasked(r.amount)}</b>
                  </li>
                ))}
                {leftover > 0 && (
                  <li>• Còn lại chưa phân bổ (có thể để tiêu dùng): <b className="font-mono text-slate-800">{formatMasked(leftover)}</b></li>
                )}
              </ul>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
