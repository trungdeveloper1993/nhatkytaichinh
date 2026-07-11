import React, { useState } from 'react';
import { Fund, CATEGORIES_EXPENSE, CATEGORIES_INCOME, Transaction } from '../types';
import { MinusCircle, PlusCircle, ArrowUpRight, ArrowDownLeft, Calendar, FileText, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../utils';

interface TransactionFormProps {
  funds: Fund[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export default function TransactionForm({ funds, onAddTransaction }: TransactionFormProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [fundId, setFundId] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // Default selected fund if not set
  const selectedFundId = fundId || (funds.length > 0 ? funds[0].id : '');

  const categoriesList = activeTab === 'expense' ? CATEGORIES_EXPENSE : CATEGORIES_INCOME;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (amount <= 0) {
      newErrors.amount = 'Số tiền phải lớn hơn 0';
    }

    if (!selectedFundId) {
      newErrors.fundId = 'Vui lòng chọn một quỹ tài chính';
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (!finalCategory) {
      newErrors.category = 'Vui lòng chọn hoặc nhập mục đích/hạng mục';
    }

    // Check if the expense exceeds the chosen fund's balance
    if (activeTab === 'expense' && selectedFundId) {
      const chosenFund = funds.find((f) => f.id === selectedFundId);
      if (chosenFund && chosenFund.balance < amount) {
        newErrors.amount = `Số dư quỹ không đủ (Hiện có ${formatCurrency(chosenFund.balance)})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalCategory = isCustomCategory ? customCategory.trim() : category;

    // Get current local date (YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const currentDateStr = `${yyyy}-${mm}-${dd}`;

    onAddTransaction({
      type: activeTab,
      amount,
      fundId: selectedFundId,
      category: finalCategory,
      notes: notes.trim(),
      date: currentDateStr
    });

    // Show beautiful success banner
    setSuccessMsg(
      activeTab === 'expense'
        ? `Đã ghi nhận chi tiêu ${formatCurrency(amount)} từ ${funds.find((f) => f.id === selectedFundId)?.name}`
        : `Đã bổ sung ${formatCurrency(amount)} vào ${funds.find((f) => f.id === selectedFundId)?.name}`
    );

    // Reset inputs
    setAmount(0);
    setCategory('');
    setCustomCategory('');
    setIsCustomCategory(false);
    setNotes('');
    setErrors({});

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  return (
    <div id="transaction-form-card" className="glass-card rounded-3xl p-6 shadow-xs relative overflow-hidden border border-white/40">
      {/* Decorative colored strip based on active tab */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors duration-300 ${
        activeTab === 'expense' ? 'bg-red-500/80' : 'bg-emerald-500/80'
      }`} />

      {/* Tabs */}
      <div className="flex bg-white/30 backdrop-blur-md border border-white/30 p-1 rounded-2xl mb-6">
        <button
          id="tab-expense-btn"
          type="button"
          onClick={() => {
            setActiveTab('expense');
            setCategory('');
            setIsCustomCategory(false);
            setErrors({});
          }}
          className={`flex-1 py-3.5 px-4 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'expense'
              ? 'backdrop-blur-md bg-white/80 text-red-600 shadow-xs border border-white/50'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <MinusCircle className="w-4 h-4" />
          <span>Ghi chép Chi Tiêu</span>
        </button>
        <button
          id="tab-income-btn"
          type="button"
          onClick={() => {
            setActiveTab('income');
            setCategory('');
            setIsCustomCategory(false);
            setErrors({});
          }}
          className={`flex-1 py-3.5 px-4 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'income'
              ? 'backdrop-blur-md bg-white/80 text-emerald-600 shadow-xs border border-white/50'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Bổ Sung Tiền</span>
        </button>
      </div>

      {/* Success feedback overlay */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            id="transaction-success-alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {funds.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm font-semibold">Vui lòng tạo ít nhất 1 quỹ tài chính trước khi thực hiện ghi chép.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Số tiền (VND)
            </label>
            <div className="relative">
              <input
                id="tx-amount-input"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={amount === 0 ? '' : amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={`w-full pl-4 pr-16 py-3 rounded-2xl border glass-input font-mono text-xl font-bold ${
                  errors.amount
                    ? 'border-red-400 focus:ring-red-100 bg-red-50/10'
                    : 'border-white/60 focus:border-slate-400 focus:ring-indigo-100/30'
                } outline-hidden focus:ring-4 transition-all ${
                  activeTab === 'expense' ? 'text-red-600' : 'text-emerald-600'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                VND
              </span>
            </div>
            {amount > 0 && (
              <p className="text-xs text-slate-400 mt-1 font-semibold font-mono">
                Bằng chữ: {formatCurrency(amount)}
              </p>
            )}
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1 font-semibold">{errors.amount}</p>
            )}
          </div>

          {/* Fund selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {activeTab === 'expense' ? 'Trích từ Quỹ nào' : 'Bổ sung vào Quỹ nào'}
            </label>
            <select
              id="tx-fund-select"
              value={selectedFundId}
              onChange={(e) => setFundId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border glass-input border-white/60 focus:border-indigo-400 outline-hidden focus:ring-4 focus:ring-indigo-100/30 transition-all text-sm font-medium text-slate-800 bg-white"
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({formatCurrency(f.balance)})
                </option>
              ))}
            </select>
            {errors.fundId && (
              <p className="text-red-500 text-xs mt-1 font-semibold">{errors.fundId}</p>
            )}
          </div>

          {/* Purpose / Category */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                {activeTab === 'expense' ? 'Mục đích chi tiêu' : 'Nguồn tiền / Mục đích'}
              </label>
              <button
                id="tx-toggle-custom-category-btn"
                type="button"
                onClick={() => {
                  setIsCustomCategory(!isCustomCategory);
                  setCategory('');
                  setCustomCategory('');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {isCustomCategory ? 'Chọn hạng mục có sẵn' : 'Tự nhập hạng mục mới'}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!isCustomCategory ? (
                <motion.div
                  key="select-cat"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  <select
                    id="tx-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border glass-input border-white/60 focus:border-indigo-400 outline-hidden focus:ring-4 focus:ring-indigo-100/30 transition-all text-sm font-medium text-slate-800 bg-white"
                  >
                    <option value="">-- Chọn một danh mục --</option>
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </motion.div>
              ) : (
                <motion.div
                  key="input-cat"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  <input
                    id="tx-category-input"
                    type="text"
                    placeholder="Ví dụ: Mua tivi mới, Chuyển tiền nhà, Tiền sinh hoạt..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border glass-input border-white/60 focus:border-indigo-400 outline-hidden focus:ring-4 focus:ring-indigo-100/30 transition-all text-sm text-slate-800 font-medium"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {errors.category && (
              <p className="text-red-500 text-xs mt-1 font-semibold">{errors.category}</p>
            )}
          </div>

          {/* Notes (Ghi chú rõ nguồn tiền/mục đích cụ thể) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Ghi chú chi tiết
            </label>
            <textarea
              id="tx-notes-input"
              rows={2}
              placeholder={
                activeTab === 'expense'
                  ? 'Ghi cụ thể chi tiêu cho việc gì (Ví dụ: Ăn bún chả với đồng nghiệp, mua sắm đồ dùng học tập...)'
                  : 'Ghi cụ thể nguồn tiền từ đâu (Ví dụ: Tiền thưởng hoàn thành dự án, bố mẹ gửi hỗ trợ...)'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border glass-input border-white/60 focus:border-indigo-400 outline-hidden focus:ring-4 focus:ring-indigo-100/30 transition-all text-sm text-slate-800"
            />
          </div>

          {/* Submit button */}
          <button
            id="tx-submit-btn"
            type="submit"
            className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all duration-300 ${
              activeTab === 'expense'
                ? 'bg-red-600 hover:bg-red-700 hover:shadow-md hover:shadow-red-50 focus:ring-4 focus:ring-red-100'
                : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-50 focus:ring-4 focus:ring-emerald-100'
            }`}
          >
            {activeTab === 'expense' ? (
              <>
                <ArrowDownLeft className="w-4 h-4" />
                <span>Ghi Nhận Khoản Chi Tiêu</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>Hoàn Tất Bổ Sung Tiền</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
