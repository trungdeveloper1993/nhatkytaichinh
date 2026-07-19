import React, { useState } from 'react';
import { Fund, FUND_COLORS, FundType, VIETNAM_BANKS } from '../types';
import { Landmark, Wallet, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FundFormProps {
  onAddFund: (fund: Omit<Fund, 'id' | 'createdAt'>) => void;
}

export default function FundForm({ onAddFund }: FundFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<FundType>('cash');
  const [balance, setBalance] = useState<number>(0);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState('emerald');
  const [hasLimit, setHasLimit] = useState(false);
  const [limitAmount, setLimitAmount] = useState<number>(0);
  const [allocationPercent, setAllocationPercent] = useState<number>(0);
  const [isSpending, setIsSpending] = useState(false);
  const [maxBalance, setMaxBalance] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Tên quỹ không được để trống';
    } else if (name.length > 40) {
      newErrors.name = 'Tên quỹ không vượt quá 40 ký tự';
    }

    if (balance < 0) {
      newErrors.balance = 'Số dư ban đầu không được nhỏ hơn 0';
    }

    if (type === 'bank' && !accountNumber.trim()) {
      newErrors.accountNumber = 'Số tài khoản ngân hàng là bắt buộc';
    }

    if (type === 'bank' && !bankName.trim()) {
      newErrors.bankName = 'Vui lòng chọn ngân hàng';
    }

    if (hasLimit && limitAmount <= 0) {
      newErrors.limitAmount = 'Hạn mức chi tiêu hàng tháng phải lớn hơn 0';
    }

    if (allocationPercent < 0 || allocationPercent > 100) {
      newErrors.allocationPercent = 'Tỷ lệ phân bổ phải từ 0 đến 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onAddFund({
      name: name.trim(),
      type,
      balance,
      accountNumber: type === 'bank' ? accountNumber.trim() : undefined,
      bankName: type === 'bank' ? bankName.trim() : undefined,
      note: note.trim() ? note.trim() : undefined,
      color,
      monthlyLimit: hasLimit ? limitAmount : undefined,
      maxBalance: maxBalance > 0 ? maxBalance : undefined,
      allocationPercent: !isSpending && allocationPercent > 0 ? allocationPercent : undefined,
      isSpending: isSpending || undefined
    });

    // Reset Form
    setName('');
    setType('cash');
    setBalance(0);
    setAccountNumber('');
    setBankName('');
    setNote('');
    setColor('emerald');
    setHasLimit(false);
    setLimitAmount(0);
    setAllocationPercent(0);
    setIsSpending(false);
    setMaxBalance(0);
    setIsOpen(false);
    setErrors({});
  };

  return (
    <div id="fund-form-container" className="mb-6">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            id="open-fund-form-btn"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="w-full h-[150px] border-2 border-dashed border-white/50 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-indigo-700 bg-white/30 hover:bg-white/50 backdrop-blur-md transition-all duration-300 group cursor-pointer shadow-xs"
          >
            <span className="p-3 bg-white/80 rounded-full shadow-xs border border-white/40 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-indigo-600" />
            </span>
            <span className="font-display font-semibold text-sm tracking-wide">Tạo Quỹ Tài Chính Mới</span>
          </motion.button>
        ) : (
          <motion.div
            id="fund-form-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="glass-card rounded-2xl p-5 shadow-xs border border-white/40"
          >
            <div className="flex items-center justify-between mb-4 border-b border-white/20 pb-3">
              <h3 className="font-display font-bold text-base text-slate-800">✨ Tạo Quỹ Mới</h3>
              <button
                id="close-fund-form-btn"
                onClick={() => {
                  setIsOpen(false);
                  setErrors({});
                }}
                className="p-1.5 rounded-lg hover:bg-white/40 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Tên Quỹ Tài Chính
                </label>
                <input
                  id="fund-name-input"
                  type="text"
                  placeholder="Ví dụ: Quỹ Ăn Trưa, Quỹ Laptop, Quỹ Tiết Kiệm..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border glass-input ${
                    errors.name ? 'border-red-400 bg-red-50/20 focus:ring-red-100' : 'border-white/60 focus:border-indigo-400 focus:ring-indigo-100/50'
                  } outline-hidden focus:ring-4 transition-all text-sm text-slate-800 font-medium`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  id="select-type-cash-btn"
                  type="button"
                  onClick={() => setType('cash')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-left cursor-pointer ${
                    type === 'cash'
                      ? 'border-emerald-500 bg-emerald-50/10 text-emerald-700 font-bold ring-3 ring-emerald-50'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Wallet className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs">Tiền Mặt / Ví</span>
                </button>

                <button
                  id="select-type-bank-btn"
                  type="button"
                  onClick={() => setType('bank')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-left cursor-pointer ${
                    type === 'bank'
                      ? 'border-indigo-500 bg-indigo-50/10 text-indigo-700 font-bold ring-3 ring-indigo-50'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Landmark className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs">Tài Khoản Ngân Hàng</span>
                </button>
              </div>

              {type === 'bank' && (
                <motion.div
                  id="bank-account-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Ngân hàng
                    </label>
                    <select
                      id="fund-bank-name-select"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border glass-input ${
                        errors.bankName ? 'border-red-400 focus:ring-red-100' : 'border-white/60 focus:border-indigo-400 focus:ring-indigo-100/50'
                      } outline-hidden focus:ring-4 transition-all text-sm text-slate-800 font-medium cursor-pointer`}
                    >
                      <option value="">-- Chọn ngân hàng --</option>
                      {VIETNAM_BANKS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                    {errors.bankName && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{errors.bankName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Số tài khoản
                    </label>
                    <input
                      id="fund-account-number-input"
                      type="text"
                      placeholder="Ví dụ: 1903456789012"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border glass-input ${
                        errors.accountNumber ? 'border-red-400 focus:ring-red-100' : 'border-white/60 focus:border-indigo-400 focus:ring-indigo-100/50'
                      } outline-hidden focus:ring-4 transition-all text-sm text-slate-800 font-medium font-mono`}
                    />
                    {errors.accountNumber && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{errors.accountNumber}</p>
                    )}
                  </div>
                </motion.div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Số dư ban đầu (VND)
                </label>
                <div className="relative">
                  <input
                    id="fund-balance-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={balance === 0 ? '' : balance}
                    onChange={(e) => setBalance(Number(e.target.value))}
                    className={`w-full pl-3.5 pr-12 py-2.5 rounded-xl border glass-input ${
                      errors.balance ? 'border-red-400 focus:ring-red-100' : 'border-white/60 focus:border-indigo-400 focus:ring-indigo-100/50'
                    } outline-hidden focus:ring-4 transition-all text-sm text-slate-800 font-semibold font-mono`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-display">
                    VND
                  </span>
                </div>
                {errors.balance && <p className="text-red-500 text-xs mt-1 font-medium">{errors.balance}</p>}
              </div>

              {/* Note: purpose of this fund */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Ghi chú <span className="normal-case font-medium text-slate-400">(mục đích của quỹ này)</span>
                </label>
                <textarea
                  id="fund-note-input"
                  rows={2}
                  placeholder="Ví dụ: Quỹ dành cho việc tiết kiệm mua nhà, dự phòng khẩn cấp..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border glass-input border-white/60 focus:border-indigo-400 focus:ring-indigo-100/50 outline-hidden focus:ring-4 transition-all text-sm text-slate-800 font-medium resize-none"
                />
              </div>

              {/* Monthly spending limit checkbox and input */}
              <div className="bg-white/40 p-3.5 rounded-xl border border-white/50 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    id="fund-has-limit-checkbox"
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
                    id="fund-limit-amount-container"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Hạn mức tối đa (VND / tháng)
                    </label>
                    <div className="relative">
                      <input
                        id="fund-limit-amount-input"
                        type="number"
                        min="1"
                        placeholder="Ví dụ: 5000000"
                        value={limitAmount === 0 ? '' : limitAmount}
                        onChange={(e) => setLimitAmount(Number(e.target.value))}
                        className={`w-full pl-3 pr-12 py-2 rounded-lg border bg-white/80 ${
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

              {/* Quỹ tiêu dùng + Tỷ lệ phân bổ thu nhập */}
              <div className="bg-white/40 p-3.5 rounded-xl border border-white/50 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    id="fund-is-spending-checkbox"
                    type="checkbox"
                    checked={isSpending}
                    onChange={(e) => setIsSpending(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Đây là quỹ tiêu dùng 🛒 <span className="font-medium text-slate-400">(không hiện trong danh sách phân bổ)</span>
                  </span>
                </label>

                {!isSpending && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Tỷ lệ phân bổ thu nhập <span className="normal-case font-medium text-slate-400">(% mỗi tháng, tùy chọn)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="fund-allocation-percent-input"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Ví dụ: 10"
                        value={allocationPercent === 0 ? '' : allocationPercent}
                        onChange={(e) => setAllocationPercent(Number(e.target.value))}
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border glass-input ${
                          errors.allocationPercent ? 'border-red-400 focus:ring-red-100' : 'border-white/60 focus:border-indigo-400 focus:ring-indigo-100/50'
                        } outline-hidden focus:ring-4 transition-all text-sm text-slate-800 font-semibold font-mono`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    {errors.allocationPercent && <p className="text-red-500 text-xs mt-1 font-medium">{errors.allocationPercent}</p>}
                  </div>
                )}
              </div>

              {/* Trần quỹ (số dư tối đa) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Trần quỹ - số dư tối đa <span className="normal-case font-medium text-slate-400">(0 = không giới hạn)</span>
                </label>
                <div className="relative">
                  <input
                    id="fund-max-balance-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={maxBalance === 0 ? '' : maxBalance}
                    onChange={(e) => setMaxBalance(Number(e.target.value))}
                    className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border glass-input border-white/60 focus:border-indigo-400 focus:ring-indigo-100/50 outline-hidden focus:ring-4 transition-all text-sm text-slate-800 font-semibold font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VND</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Khi số dư đạt mức này, quỹ sẽ không nhận thêm tiền phân bổ.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Màu sắc đại diện
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {FUND_COLORS.map((clr) => (
                    <button
                      id={`select-color-${clr.value}-btn`}
                      key={clr.value}
                      type="button"
                      onClick={() => setColor(clr.value)}
                      className={`h-8 rounded-lg cursor-pointer flex items-center justify-center transition-all border ${clr.bg} ${
                        color === clr.value ? 'ring-3 ring-slate-200 font-black border-white' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={clr.name}
                    >
                      {color === clr.value && <span className="text-[10px]">●</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  id="submit-fund-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-xs hover:shadow-md"
                >
                  Xác nhận Tạo Quỹ
                </button>
                <button
                  id="cancel-fund-btn"
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setErrors({});
                  }}
                  className="py-2.5 px-4 border border-white/60 bg-white/40 hover:bg-white/60 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
