import { useState, useMemo } from 'react';
import { Transaction, Fund } from '../types';
import { formatCurrency, formatFriendlyDate } from '../utils';
import { Search, ArrowDownLeft, ArrowUpRight, Trash2, Filter, Info, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  funds: Fund[];
  onDeleteTransaction: (id: string) => void;
  onClearTransactions: () => void;
}

export default function TransactionHistory({ 
  transactions, 
  funds, 
  onDeleteTransaction,
  onClearTransactions 
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFundId, setSelectedFundId] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Calculate warning funds
  const warningFunds = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return funds
      .filter((f) => f.monthlyLimit !== undefined && f.monthlyLimit > 0)
      .map((f) => {
        const spent = transactions
          .filter((t) => t.fundId === f.id && t.type === 'expense' && t.date.startsWith(currentMonthPrefix))
          .reduce((sum, t) => sum + t.amount, 0);
        
        const ratio = spent / (f.monthlyLimit || 1);
        return {
          fund: f,
          spent,
          ratio,
          isExceeded: spent >= f.monthlyLimit!,
          isNear: spent >= f.monthlyLimit! * 0.8 && spent < f.monthlyLimit!
        };
      })
      .filter((item) => item.isExceeded || item.isNear);
  }, [funds, transactions]);

  // Find a fund name by ID
  const getFundName = (id: string) => {
    return funds.find((f) => f.id === id)?.name || 'Quỹ không rõ';
  };

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search term filter
        const matchesSearch =
          tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (tx.notes && tx.notes.toLowerCase().includes(searchTerm.toLowerCase()));

        // Fund filter
        const matchesFund = selectedFundId === 'all' || tx.fundId === selectedFundId;

        // Type filter
        const matchesType = selectedType === 'all' || tx.type === selectedType;

        return matchesSearch && matchesFund && matchesType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Show latest first
  }, [transactions, searchTerm, selectedFundId, selectedType]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFundId('all');
    setSelectedType('all');
  };

  return (
    <div id="transaction-history-card" className="glass-card rounded-3xl p-6 shadow-xs border border-white/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/20 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-display font-bold text-base text-slate-800">📖 Nhật Ký Giao Dịch</h3>
            {transactions.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                title="Dọn dẹp các lịch sử ghi chép cũ để gọn sổ tay"
              >
                🧹 Dọn dẹp sổ
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Danh sách ghi chép dòng tiền vào ra chi tiết</p>
        </div>

        {/* Tab filters (All, Income, Expense) */}
        <div className="flex bg-white/30 backdrop-blur-md border border-white/30 p-0.5 rounded-xl text-xs font-bold self-start sm:self-center">
          <button
            id="filter-type-all-btn"
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedType === 'all' ? 'bg-white/80 border border-white/50 text-slate-850 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả
          </button>
          <button
            id="filter-type-expense-btn"
            onClick={() => setSelectedType('expense')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedType === 'expense' ? 'bg-white/80 border border-white/50 text-red-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Chi tiêu 💸
          </button>
          <button
            id="filter-type-income-btn"
            onClick={() => setSelectedType('income')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedType === 'income' ? 'bg-white/80 border border-white/50 text-emerald-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Bổ sung 💰
          </button>
        </div>
      </div>

      {/* Clear/Sweep History Explanatory Notice */}
      {showClearConfirm && (
        <div className="mb-5 p-4.5 bg-amber-50/90 border border-amber-200/80 rounded-2xl shadow-xs text-slate-800 relative z-10 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 text-amber-800 p-1.5 rounded-xl font-bold text-sm shrink-0">
              ⚠️ Chú ý
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950">Xác nhận dọn dẹp toàn bộ nhật ký?</h4>
              <p className="text-xs text-amber-850 mt-1.5 leading-relaxed font-semibold">
                Hành động này sẽ <strong>xóa sạch toàn bộ các dòng lịch sử</strong> ghi chép cũ để sổ tay tài chính của bạn trông gọn gàng hơn.
              </p>
              <div className="mt-2.5 bg-white/70 border border-amber-100/50 p-2.5 rounded-xl text-xs text-slate-600 space-y-2 font-semibold">
                <p className="text-slate-700 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✔</span> <strong>Giữ nguyên số dư:</strong> Toàn bộ số tiền hiện tại của các Quỹ tài chính sẽ <strong>KHÔNG</strong> bị thay đổi hay mất đi.
                </p>
                <p className="text-slate-700 flex items-center gap-1.5">
                  <span className="text-rose-600 font-bold">ℹ</span> <strong>Lưu ý:</strong> Nếu bạn muốn xóa một giao dịch cụ thể để hoàn lại/thu hồi số dư (do nhập sai), hãy bấm nút <span className="text-rose-500 font-black">Xóa</span> đỏ nhỏ bên cạnh giao dịch đó bên dưới.
                </p>
              </div>
              <div className="flex gap-2.5 mt-4 justify-end">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-200"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    onClearTransactions();
                    setShowClearConfirm(false);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Xác nhận dọn dẹp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly spending limit warning panel */}
      {warningFunds.length > 0 && (
        <div className="mb-5 p-4 bg-rose-50 border border-rose-250 rounded-2xl shadow-xs text-rose-900 animate-fade-in space-y-2.5">
          <div className="flex items-center gap-2 text-rose-800">
            <span className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            </span>
            <h4 className="text-sm font-black uppercase tracking-wider">⚠️ CẢNH BÁO HẠN MỨC CHI TIÊU THÁNG</h4>
          </div>
          <div className="space-y-2">
            {warningFunds.map(({ fund, spent, ratio, isExceeded }) => (
              <div key={fund.id} className="bg-white/80 border border-rose-100/50 p-3 rounded-xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
                <div>
                  <p className="text-slate-800">
                    Quỹ <strong className="text-slate-900 font-black">{fund.name}</strong>{' '}
                    {isExceeded ? (
                      <span className="text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 ml-1">Đã vượt hạn mức!</span>
                    ) : (
                      <span className="text-amber-600 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 ml-1">Sắp chạm hạn mức!</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Đã dùng: {formatCurrency(spent)} / {formatCurrency(fund.monthlyLimit || 0)} ({Math.round(ratio * 100)}%)
                  </p>
                </div>
                <div className="w-full sm:w-28 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/20 shrink-0">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExceeded ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inputs (Search & Fund selector) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
        {/* Search */}
        <div className="md:col-span-7 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="history-search-input"
            type="text"
            placeholder="Tìm kiếm theo mục đích chi tiêu hoặc ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border glass-input border-white/60 rounded-xl focus:border-indigo-400 outline-hidden focus:ring-4 focus:ring-indigo-100/30 transition-all font-medium text-slate-700"
          />
          {searchTerm && (
            <button
              id="clear-search-btn"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/40 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Fund Filter */}
        <div className="md:col-span-5 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Filter className="w-3.5 h-3.5" />
          </span>
          <select
            id="history-fund-filter"
            value={selectedFundId}
            onChange={(e) => setSelectedFundId(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border glass-input border-white/60 rounded-xl focus:border-indigo-400 outline-hidden focus:ring-4 focus:ring-indigo-100/30 transition-all font-medium text-slate-700 bg-white"
          >
            <option value="all">Tất cả tài khoản / quỹ</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline List of transactions */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white/20 backdrop-blur-xs rounded-2xl border border-dashed border-white/40">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">Không tìm thấy giao dịch nào</p>
          <p className="text-xs text-slate-400 mt-1">Hãy thay đổi bộ lọc hoặc thêm ghi chép mới để bắt đầu Nhật ký.</p>
          {(searchTerm || selectedFundId !== 'all' || selectedType !== 'all') && (
            <button
              id="reset-filters-btn"
              onClick={handleResetFilters}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline transition-colors cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/30 shadow-2xs">
          <div className="divide-y divide-white/20">
            <AnimatePresence initial={false}>
              {filteredTransactions.map((tx) => (
                <motion.div
                  id={`tx-row-${tx.id}`}
                  key={tx.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 bg-white/40 hover:bg-white/60 backdrop-blur-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Badge Icon based on Type */}
                    <div className={`p-2 rounded-xl shrink-0 ${
                      tx.type === 'expense' ? 'bg-rose-100/50 text-rose-600' : 'bg-emerald-100/50 text-emerald-600'
                    }`}>
                      {tx.type === 'expense' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800 leading-tight">
                          {tx.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-semibold bg-white/60 border border-white/50 px-1.5 py-0.5 rounded-md">
                          {formatFriendlyDate(tx.date)}
                        </span>
                      </div>

                      {/* Notes (Mô tả) */}
                      {tx.notes && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic font-medium leading-relaxed">
                          "{tx.notes}"
                        </p>
                      )}

                      {/* Source/Fund used */}
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                        <span>Quỹ:</span>
                        <span className="text-slate-600 font-sans normal-case">{getFundName(tx.fundId)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {confirmDeleteId === tx.id ? (
                      <div className="relative z-10 flex items-center gap-1.5 bg-rose-50/90 border border-rose-100 p-1.5 rounded-xl shadow-xs" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-extrabold text-rose-600 px-1">Xóa?</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTransaction(tx.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          Xóa
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Price display */}
                        <span className={`font-display font-bold text-sm sm:text-base leading-none font-mono ${
                          tx.type === 'expense' ? 'text-red-500' : 'text-emerald-500'
                        }`}>
                          {tx.type === 'expense' ? '-' : '+'}
                          {formatCurrency(tx.amount)}
                        </span>

                        {/* Quick trash action */}
                        <button
                          id={`delete-tx-btn-${tx.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(tx.id);
                          }}
                          className="relative z-10 p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-red-500 transition-all opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                          title="Xóa dòng tiền"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
