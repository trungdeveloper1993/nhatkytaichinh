import React, { useState } from 'react';
import { Fund, CATEGORIES_EXPENSE, CATEGORIES_INCOME, Transaction } from '../types';
import { MinusCircle, PlusCircle, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle, ArrowLeftRight, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../utils';
import { usePrivacy } from '../PrivacyContext';

interface TransactionFormProps {
  funds: Fund[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export default function TransactionForm({ funds, onAddTransaction }: TransactionFormProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [fundId, setFundId] = useState('');
  const [toFundId, setToFundId] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  // Che số dư quỹ (số tiền đang có) khi bật chế độ riêng tư
  const { format: formatBalance } = usePrivacy();

  // Default selected fund if not set
  const selectedFundId = fundId || (funds.length > 0 ? funds[0].id : '');
  // Quỹ đích cho chuyển quỹ: mặc định là quỹ khác quỹ nguồn
  const selectedToFundId =
    toFundId || funds.find((f) => f.id !== selectedFundId)?.id || '';

  const categoriesList = activeTab === 'expense' ? CATEGORIES_EXPENSE : CATEGORIES_INCOME;

  // Đảo chiều quỹ nguồn <-> quỹ đích
  const handleSwapFunds = () => {
    setFundId(selectedToFundId);
    setToFundId(selectedFundId);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (amount <= 0) {
      newErrors.amount = 'Số tiền phải lớn hơn 0';
    }

    if (!selectedFundId) {
      newErrors.fundId = 'Vui lòng chọn một quỹ tài chính';
    }

    // Chế độ chuyển quỹ: kiểm tra quỹ đích và số dư quỹ nguồn
    if (activeTab === 'transfer') {
      if (!selectedToFundId) {
        newErrors.toFundId = 'Vui lòng chọn quỹ nhận tiền';
      } else if (selectedToFundId === selectedFundId) {
        newErrors.toFundId = 'Quỹ nhận phải khác quỹ nguồn';
      }
      const sourceFund = funds.find((f) => f.id === selectedFundId);
      if (sourceFund && sourceFund.balance < amount) {
        newErrors.amount = `Số dư quỹ nguồn không đủ (Hiện có ${formatBalance(sourceFund.balance)})`;
      }
    } else {
      // Chi tiêu / Bổ sung: bắt buộc chọn mục đích/hạng mục
      const finalCategory = isCustomCategory ? customCategory.trim() : category;
      if (!finalCategory) {
        newErrors.category = 'Vui lòng chọn hoặc nhập mục đích/hạng mục';
      }

      // Check if the expense exceeds the chosen fund's balance
      if (activeTab === 'expense' && selectedFundId) {
        const chosenFund = funds.find((f) => f.id === selectedFundId);
        if (chosenFund && chosenFund.balance < amount) {
          newErrors.amount = `Số dư quỹ không đủ (Hiện có ${formatBalance(chosenFund.balance)})`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Get current local date (YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const currentDateStr = `${yyyy}-${mm}-${dd}`;

    const sourceName = funds.find((f) => f.id === selectedFundId)?.name;

    if (activeTab === 'transfer') {
      const destName = funds.find((f) => f.id === selectedToFundId)?.name;
      onAddTransaction({
        type: 'transfer',
        amount,
        fundId: selectedFundId,
        toFundId: selectedToFundId,
        category: 'Chuyển quỹ 🔄',
        notes: notes.trim(),
        date: currentDateStr
      });
      setSuccessMsg(`Đã chuyển ${formatCurrency(amount)} từ ${sourceName} ➡️ ${destName}`);
    } else {
      const finalCategory = isCustomCategory ? customCategory.trim() : category;
      onAddTransaction({
        type: activeTab,
        amount,
        fundId: selectedFundId,
        category: finalCategory,
        notes: notes.trim(),
        date: currentDateStr
      });
      setSuccessMsg(
        activeTab === 'expense'
          ? `Đã ghi nhận chi tiêu ${formatCurrency(amount)} từ ${sourceName}`
          : `Đã bổ sung ${formatCurrency(amount)} vào ${sourceName}`
      );
    }

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
        activeTab === 'expense' ? 'bg-red-500/80' : activeTab === 'income' ? 'bg-emerald-500/80' : 'bg-indigo-500/80'
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
          className={`flex-1 py-3 px-2 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'expense'
              ? 'backdrop-blur-md bg-white/80 text-red-600 shadow-xs border border-white/50'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <MinusCircle className="w-4 h-4 shrink-0" />
          <span>Chi Tiêu</span>
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
          className={`flex-1 py-3 px-2 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'income'
              ? 'backdrop-blur-md bg-white/80 text-emerald-600 shadow-xs border border-white/50'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>Bổ Sung</span>
        </button>
        <button
          id="tab-transfer-btn"
          type="button"
          onClick={() => {
            setActiveTab('transfer');
            setErrors({});
          }}
          className={`flex-1 py-3 px-2 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'transfer'
              ? 'backdrop-blur-md bg-white/80 text-indigo-600 shadow-xs border border-white/50'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 shrink-0" />
          <span>Chuyển Quỹ</span>
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
      ) : activeTab === 'transfer' && funds.length < 2 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm font-semibold">Cần có ít nhất 2 quỹ để chuyển tiền qua lại. Hãy tạo thêm một quỹ nữa nhé!</p>
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
                step="any"
                placeholder="0"
                value={amount === 0 ? '' : amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={`w-full pl-4 pr-16 py-3 rounded-2xl border glass-input font-mono text-xl font-bold ${
                  errors.amount
                    ? 'border-red-400 focus:ring-red-100 bg-red-50/10'
                    : 'border-white/60 focus:border-slate-400 focus:ring-indigo-100/30'
                } outline-hidden focus:ring-4 transition-all ${
                  activeTab === 'expense' ? 'text-red-600' : activeTab === 'income' ? 'text-emerald-600' : 'text-indigo-600'
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
          {activeTab === 'transfer' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Chuyển tiền giữa các quỹ
              </label>
              <div className="space-y-2">
                {/* Quỹ nguồn */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Từ quỹ (trích ra)</span>
                  <select
                    id="tx-from-fund-select"
                    value={selectedFundId}
                    onChange={(e) => setFundId(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border glass-input border-white/60 focus:border-indigo-400 outline-hidden focus:ring-4 focus:ring-indigo-100/30 transition-all text-sm font-medium text-slate-800 bg-white"
                  >
                    {funds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({formatBalance(f.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nút đảo chiều */}
                <div className="flex justify-center">
                  <button
                    id="tx-swap-funds-btn"
                    type="button"
                    onClick={handleSwapFunds}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-full transition-all cursor-pointer shadow-2xs hover:rotate-180 duration-300"
                    title="Đảo chiều quỹ nguồn và quỹ đích"
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                </div>

                {/* Quỹ đích */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Đến quỹ (nhận vào)</span>
                  <select
                    id="tx-to-fund-select"
                    value={selectedToFundId}
                    onChange={(e) => setToFundId(e.target.value)}
                    className={`w-full mt-1 px-3.5 py-2.5 rounded-xl border glass-input ${
                      errors.toFundId ? 'border-red-400 focus:ring-red-100' : 'border-white/60 focus:border-indigo-400 focus:ring-indigo-100/30'
                    } outline-hidden focus:ring-4 transition-all text-sm font-medium text-slate-800 bg-white`}
                  >
                    {funds
                      .filter((f) => f.id !== selectedFundId)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({formatBalance(f.balance)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              {errors.toFundId && (
                <p className="text-red-500 text-xs mt-1 font-semibold">{errors.toFundId}</p>
              )}
            </div>
          ) : (
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
                    {f.name} ({formatBalance(f.balance)})
                  </option>
                ))}
              </select>
              {errors.fundId && (
                <p className="text-red-500 text-xs mt-1 font-semibold">{errors.fundId}</p>
              )}
            </div>
          )}

          {/* Purpose / Category (không áp dụng cho chuyển quỹ) */}
          {activeTab !== 'transfer' && (
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
          )}

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
                  : activeTab === 'income'
                  ? 'Ghi cụ thể nguồn tiền từ đâu (Ví dụ: Tiền thưởng hoàn thành dự án, bố mẹ gửi hỗ trợ...)'
                  : 'Lý do phân bổ (Ví dụ: Trích lương vào quỹ tiết kiệm, dồn tiền mua laptop...)'
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
                : activeTab === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-50 focus:ring-4 focus:ring-emerald-100'
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-50 focus:ring-4 focus:ring-indigo-100'
            }`}
          >
            {activeTab === 'expense' ? (
              <>
                <ArrowDownLeft className="w-4 h-4" />
                <span>Ghi Nhận Khoản Chi Tiêu</span>
              </>
            ) : activeTab === 'income' ? (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>Hoàn Tất Bổ Sung Tiền</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4" />
                <span>Xác Nhận Chuyển Quỹ</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
