import React, { useState, useEffect } from 'react';
import { Fund, FUND_COLORS, FundType } from '../types';
import { Landmark, Wallet, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EditFundModalProps {
  fund: Fund | null;
  onClose: () => void;
  onSave: (updatedFund: Fund) => void;
}

export default function EditFundModal({ fund, onClose, onSave }: EditFundModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FundType>('cash');
  const [balance, setBalance] = useState<number>(0);
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('emerald');
  const [hasLimit, setHasLimit] = useState(false);
  const [limitAmount, setLimitAmount] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate state when fund prop changes
  useEffect(() => {
    if (fund) {
      setName(fund.name);
      setType(fund.type);
      setBalance(fund.balance);
      setAccountNumber(fund.accountNumber || '');
      setColor(fund.color);
      setHasLimit(fund.monthlyLimit !== undefined && fund.monthlyLimit > 0);
      setLimitAmount(fund.monthlyLimit || 0);
      setErrors({});
    }
  }, [fund]);

  if (!fund) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Tên quỹ không được để trống';
    } else if (name.length > 40) {
      newErrors.name = 'Tên quỹ không vượt quá 40 ký tự';
    }

    if (balance < 0) {
      newErrors.balance = 'Số dư không được nhỏ hơn 0';
    }

    if (type === 'bank' && !accountNumber.trim()) {
      newErrors.accountNumber = 'Số tài khoản ngân hàng là bắt buộc';
    }

    if (hasLimit && limitAmount <= 0) {
      newErrors.limitAmount = 'Hạn mức chi tiêu hàng tháng phải lớn hơn 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      ...fund,
      name: name.trim(),
      type,
      balance,
      accountNumber: type === 'bank' ? accountNumber.trim() : undefined,
      color,
      monthlyLimit: hasLimit ? limitAmount : undefined,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white/45 p-6 rounded-3xl shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Save className="w-4 h-4" />
              </span>
              <h3 className="font-display font-black text-slate-800 text-base">
                ⚙️ Chỉnh sửa Quỹ Tài Chính
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Tên Quỹ Tài Chính
              </label>
              <input
                id="edit-fund-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white ${
                  errors.name ? 'border-red-450 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100/50'
                } outline-hidden focus:ring-4 transition-all text-sm text-slate-800 font-bold`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.name}</p>}
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('cash')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'cash'
                    ? 'border-emerald-500 bg-emerald-50/10 text-emerald-700 font-bold ring-3 ring-emerald-50'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-bold">Tiền Mặt / Ví</span>
              </button>

              <button
                type="button"
                onClick={() => setType('bank')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'bank'
                    ? 'border-indigo-500 bg-indigo-50/10 text-indigo-700 font-bold ring-3 ring-indigo-50'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Landmark className="w-4 h-4 text-indigo-500" />
                <span className="text-[11px] font-bold">Tài khoản Ngân hàng</span>
              </button>
            </div>

            {/* Conditional Account Number */}
            {type === 'bank' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Số tài khoản ngân hàng / Số thẻ
                </label>
                <input
                  id="edit-fund-account-input"
                  type="text"
                  placeholder="Nhập số tài khoản/ thẻ"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white ${
                    errors.accountNumber ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100/50'
                  } outline-hidden focus:ring-4 transition-all text-sm font-semibold font-mono text-slate-800`}
                />
                {errors.accountNumber && (
                  <p className="text-red-500 text-xs mt-1 font-semibold">{errors.accountNumber}</p>
                )}
              </motion.div>
            )}

            {/* Editable Balance */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Số dư hiện tại (VND)
              </label>
              <div className="relative">
                <input
                  id="edit-fund-balance-input"
                  type="number"
                  min="0"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className={`w-full pl-3.5 pr-14 py-2.5 rounded-xl border bg-white ${
                    errors.balance ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100/50'
                  } outline-hidden focus:ring-4 transition-all text-sm font-bold font-mono text-slate-800`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  VND
                </span>
              </div>
              {errors.balance && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.balance}</p>}
            </div>

            {/* Monthly Limit Section */}
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="edit-fund-has-limit-checkbox"
                  type="checkbox"
                  checked={hasLimit}
                  onChange={(e) => setHasLimit(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">
                  Đặt hạn mức chi tiêu hàng tháng
                </span>
              </label>

              {hasLimit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-1"
                >
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Hạn mức tối đa (VND / tháng)
                  </label>
                  <div className="relative">
                    <input
                      id="edit-fund-limit-amount-input"
                      type="number"
                      min="1"
                      placeholder="Ví dụ: 5000000"
                      value={limitAmount === 0 ? '' : limitAmount}
                      onChange={(e) => setLimitAmount(Number(e.target.value))}
                      className={`w-full pl-3 pr-12 py-2 rounded-lg border bg-white ${
                        errors.limitAmount ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100/30'
                      } outline-hidden focus:ring-4 transition-all text-xs text-slate-800 font-bold font-mono`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      VND
                    </span>
                  </div>
                  {errors.limitAmount && (
                    <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.limitAmount}</p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Color grid */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Màu sắc đại diện
              </label>
              <div className="grid grid-cols-6 gap-2">
                {FUND_COLORS.map((clr) => (
                  <button
                    id={`edit-select-color-${clr.value}-btn`}
                    key={clr.value}
                    type="button"
                    onClick={() => setColor(clr.value)}
                    className={`h-8 rounded-lg cursor-pointer flex items-center justify-center transition-all border ${clr.bg} ${
                      color === clr.value ? 'ring-3 ring-slate-350 font-black border-white' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={clr.name}
                  >
                    {color === clr.value && <span className="text-[10px]">●</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                id="edit-submit-fund-btn"
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-xs hover:shadow-md flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Lưu thay đổi
              </button>
              <button
                id="edit-cancel-fund-btn"
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
