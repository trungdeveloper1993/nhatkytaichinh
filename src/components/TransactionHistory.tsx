import { useMemo, useState } from 'react';
import { Transaction, Fund } from '../types';
import { formatMonthYear, friendlyDayLabel } from '../utils';
import { usePrivacy } from '../PrivacyContext';
import { useConfirm } from '../DialogContext';
import { Search, Trash2, X, AlertTriangle, ArrowRight, Inbox, Eraser, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortTransactionsDesc, toMonthKey, fundSpentInMonth } from '../ledger';
import { TxTypeIcon, txAmountClass, txSign, EmptyState, ProgressBar } from './ui/primitives';

interface TransactionHistoryProps {
  transactions: Transaction[];
  funds: Fund[];
  onDeleteTransaction: (id: string) => void;
  onClearTransactions: () => void;
  onEditTransaction?: (tx: Transaction) => void;
}

type TypeFilter = 'all' | Transaction['type'];

const TYPE_FILTERS: { key: TypeFilter; label: string; active: string }[] = [
  { key: 'all', label: 'Tất cả', active: 'bg-slate-900 text-white' },
  { key: 'expense', label: 'Chi tiêu 💸', active: 'bg-rose-600 text-white' },
  { key: 'income', label: 'Bổ sung 💰', active: 'bg-emerald-600 text-white' },
  { key: 'transfer', label: 'Chuyển 🔄', active: 'bg-indigo-600 text-white' },
];

const PAGE_SIZE = 60;

export default function TransactionHistory({
  transactions,
  funds,
  onDeleteTransaction,
  onClearTransactions,
  onEditTransaction,
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fundFilter, setFundFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { format: formatCurrency } = usePrivacy();
  const confirm = useConfirm();

  const fundName = (id?: string) => funds.find((f) => f.id === id)?.name || 'Quỹ đã xóa';

  // Cảnh báo hạn mức chi tiêu tháng
  const warningFunds = useMemo(() => {
    const month = toMonthKey();
    return funds
      .filter((f) => f.monthlyLimit && f.monthlyLimit > 0)
      .map((f) => {
        const spent = fundSpentInMonth(transactions, f.id, month);
        return { fund: f, spent, ratio: spent / (f.monthlyLimit || 1) };
      })
      .filter((x) => x.ratio >= 0.8);
  }, [funds, transactions]);

  const months = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.date.slice(0, 7)))).sort().reverse(),
    [transactions]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return sortTransactionsDesc(transactions).filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (monthFilter !== 'all' && !tx.date.startsWith(monthFilter)) return false;
      if (fundFilter !== 'all' && tx.fundId !== fundFilter && tx.toFundId !== fundFilter) return false;
      if (!q) return true;
      return (
        tx.category.toLowerCase().includes(q) ||
        (tx.notes || '').toLowerCase().includes(q) ||
        fundName(tx.fundId).toLowerCase().includes(q) ||
        (tx.toFundId ? fundName(tx.toFundId).toLowerCase().includes(q) : false) ||
        (qDigits.length >= 3 && String(tx.amount).includes(qDigits))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, searchTerm, fundFilter, typeFilter, monthFilter, funds]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filtered.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    });
    return { income, expense };
  }, [filtered]);

  // Nhóm theo ngày (chỉ phần đang hiển thị)
  const groups = useMemo(() => {
    const out: { date: string; items: Transaction[]; net: number }[] = [];
    filtered.slice(0, visibleCount).forEach((tx) => {
      let g = out[out.length - 1];
      if (!g || g.date !== tx.date) {
        g = { date: tx.date, items: [], net: 0 };
        out.push(g);
      }
      g.items.push(tx);
      if (tx.type === 'income') g.net += tx.amount;
      else if (tx.type === 'expense') g.net -= tx.amount;
    });
    return out;
  }, [filtered, visibleCount]);

  const hasFilters = searchTerm || fundFilter !== 'all' || typeFilter !== 'all' || monthFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setFundFilter('all');
    setTypeFilter('all');
    setMonthFilter('all');
  };

  const handleClear = async () => {
    const ok = await confirm({
      title: 'Dọn dẹp toàn bộ nhật ký?',
      tone: 'danger',
      confirmText: 'Dọn dẹp',
      message: (
        <div className="space-y-2">
          <p>
            Xóa sạch <strong>{transactions.length}</strong> dòng lịch sử ghi chép để sổ gọn gàng hơn.
          </p>
          <p className="text-emerald-700 font-semibold">✔ Số dư các quỹ được giữ nguyên, không bị thay đổi.</p>
          <p className="text-slate-500 text-xs">
            Muốn hoàn lại số dư do nhập sai? Hãy xóa từng giao dịch cụ thể thay vì dọn dẹp.
          </p>
        </div>
      ),
    });
    if (ok) onClearTransactions();
  };

  return (
    <div id="transaction-history-card" className="bg-white/80 backdrop-blur-xl border border-white rounded-2xl shadow-sm">
      {/* Tiêu đề */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-base text-slate-800">📖 Nhật ký giao dịch</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} giao dịch{hasFilters ? ' (đang lọc)' : ''} · chạm vào dòng để sửa
          </p>
        </div>
        {transactions.length > 0 && (
          <button
            onClick={handleClear}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
            title="Dọn dẹp lịch sử ghi chép cũ"
          >
            <Eraser className="w-3.5 h-3.5" /> Dọn dẹp
          </button>
        )}
      </div>

      {/* Cảnh báo hạn mức */}
      {warningFunds.length > 0 && (
        <div className="mx-4 sm:mx-5 mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-rose-700">
            <AlertTriangle className="w-4 h-4 animate-pulse" /> Cảnh báo hạn mức chi tiêu tháng
          </p>
          {warningFunds.map(({ fund, spent, ratio }) => (
            <div key={fund.id} className="bg-white/80 rounded-lg p-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 text-xs font-semibold">
                <span className="text-slate-800">
                  {fund.name}{' '}
                  <span className={ratio >= 1 ? 'text-rose-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                    {ratio >= 1 ? '· Đã vượt hạn mức!' : `· Sắp chạm hạn mức (${Math.round(ratio * 100)}%)`}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 shrink-0">
                  {formatCurrency(spent)} / {formatCurrency(fund.monthlyLimit || 0)}
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar ratio={ratio} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bộ lọc */}
      <div className="px-4 sm:px-5 pb-3 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Tìm mục đích, ghi chú, số tiền..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-base sm:text-sm font-medium text-slate-700 outline-hidden focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all"
          />
          {searchTerm && (
            <button
              id="clear-search-btn"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              id={`filter-type-${f.key}-btn`}
              onClick={() => setTypeFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                typeFilter === f.key ? f.active : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            id="history-month-filter"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm font-medium text-slate-700 outline-hidden focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">Mọi thời gian</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonthYear(m)}
              </option>
            ))}
          </select>
          <select
            id="history-fund-filter"
            value={fundFilter}
            onChange={(e) => setFundFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm font-medium text-slate-700 outline-hidden focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">Tất cả quỹ</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {filtered.length > 0 && (totals.income > 0 || totals.expense > 0) && (
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span>
              Thu: <span className="font-mono font-bold text-emerald-600">+{formatCurrency(totals.income)}</span>
            </span>
            <span>
              Chi: <span className="font-mono font-bold text-rose-600">-{formatCurrency(totals.expense)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Danh sách theo ngày */}
      {filtered.length === 0 ? (
        <div className="border-t border-slate-100">
          <EmptyState
            icon={<Inbox className="w-6 h-6" />}
            title={hasFilters ? 'Không tìm thấy giao dịch phù hợp' : 'Chưa có giao dịch nào'}
            message={hasFilters ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.' : 'Bấm nút + để ghi chép khoản thu chi đầu tiên.'}
            action={
              hasFilters ? (
                <button
                  id="reset-filters-btn"
                  onClick={resetFilters}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="border-t border-slate-100">
          {groups.map((g) => (
            <div key={g.date}>
              <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] lg:top-[72px] z-10 flex items-center justify-between px-4 sm:px-5 py-1.5 bg-slate-50/95 backdrop-blur border-b border-slate-100">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{friendlyDayLabel(g.date)}</span>
                {g.net !== 0 && (
                  <span className={`text-[11px] font-bold font-mono ${g.net > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {g.net > 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(g.net))}
                  </span>
                )}
              </div>
              <AnimatePresence initial={false}>
                {g.items.map((tx) => (
                  <motion.div
                    key={tx.id}
                    id={`tx-row-${tx.id}`}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    role={onEditTransaction ? 'button' : undefined}
                    tabIndex={onEditTransaction ? 0 : undefined}
                    onClick={() => onEditTransaction?.(tx)}
                    onKeyDown={(e) => {
                      if (onEditTransaction && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onEditTransaction(tx);
                      }
                    }}
                    className={`group flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-100 last:border-b-0 transition-colors ${
                      onEditTransaction ? 'cursor-pointer hover:bg-indigo-50/40 focus:bg-indigo-50/60 outline-hidden' : ''
                    }`}
                  >
                    <TxTypeIcon type={tx.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{tx.category}</p>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        {tx.type === 'transfer' ? (
                          <>
                            <span className="truncate">{fundName(tx.fundId)}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 text-indigo-400" />
                            <span className="truncate">{fundName(tx.toFundId)}</span>
                          </>
                        ) : (
                          <span className="truncate">{fundName(tx.fundId)}</span>
                        )}
                        {tx.notes && <span className="truncate italic text-slate-400">· {tx.notes}</span>}
                      </p>
                    </div>
                    <span className={`shrink-0 font-display font-bold text-sm font-mono tabular-nums ${txAmountClass(tx.type)}`}>
                      {txSign(tx.type)}
                      {formatCurrency(tx.amount)}
                    </span>
                    <button
                      id={`delete-tx-btn-${tx.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTransaction(tx.id);
                      }}
                      className="shrink-0 p-1.5 -mr-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="Xóa giao dịch (có thể hoàn tác)"
                      aria-label="Xóa giao dịch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))}

          {filtered.length > visibleCount && (
            <div className="p-3">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" /> Xem thêm ({filtered.length - visibleCount} giao dịch)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
