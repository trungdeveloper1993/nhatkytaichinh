import React, { useRef, useState } from 'react';
import { Landmark, Wallet, Sparkles, Save, Check } from 'lucide-react';
import { Fund, FUND_COLORS, FundType, VIETNAM_BANKS } from '../types';
import Sheet from './ui/Sheet';
import MoneyInput from './ui/MoneyInput';
import { inputClass, labelClass, FieldError } from './ui/primitives';

export type FundInput = Omit<Fund, 'id' | 'createdAt'>;

interface FundEditorSheetProps {
  open: boolean;
  sessionKey: number;
  fund?: Fund | null; // không có = tạo quỹ mới
  onClose: () => void;
  onSave: (data: FundInput, original?: Fund) => void;
}

const FORM_ID = 'fund-editor-form';

export default function FundEditorSheet({ open, sessionKey, fund, onClose, onSave }: FundEditorSheetProps) {
  // Giữ quỹ cuối cùng để nội dung không biến mất khi sheet đang đóng (hiệu ứng thoát)
  const lastFund = useRef<Fund | null | undefined>(fund);
  if (open) lastFund.current = fund;
  const editing = lastFund.current;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      id="fund-editor-sheet"
      title={editing ? 'Chỉnh sửa quỹ' : 'Tạo quỹ mới'}
      subtitle={editing ? editing.name : 'Mỗi quỹ là một "túi tiền" với mục đích riêng'}
      icon={
        <span className="flex p-2 rounded-xl bg-indigo-50 text-indigo-600">
          {editing ? <Save className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </span>
      }
      footer={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            id="submit-fund-btn"
            type="submit"
            form={FORM_ID}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" /> {editing ? 'Lưu thay đổi' : 'Tạo quỹ'}
          </button>
        </div>
      }
    >
      <FundEditorForm key={`${sessionKey}-${editing?.id ?? 'new'}`} fund={editing || undefined} onSave={onSave} />
    </Sheet>
  );
}

function FundEditorForm({ fund, onSave }: { fund?: Fund; onSave: (data: FundInput, original?: Fund) => void }) {
  const [name, setName] = useState(fund?.name ?? '');
  const [type, setType] = useState<FundType>(fund?.type ?? 'cash');
  const [balance, setBalance] = useState(fund?.balance ?? 0);
  const [bankName, setBankName] = useState(fund?.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState(fund?.accountNumber ?? '');
  const [note, setNote] = useState(fund?.note ?? '');
  const [color, setColor] = useState(fund?.color ?? 'emerald');
  const [hasLimit, setHasLimit] = useState(!!fund?.monthlyLimit && fund.monthlyLimit > 0);
  const [limitAmount, setLimitAmount] = useState(fund?.monthlyLimit ?? 0);
  const [isSpending, setIsSpending] = useState(!!fund?.isSpending);
  const [allocationPercent, setAllocationPercent] = useState<number>(fund?.allocationPercent ?? 0);
  const [maxBalance, setMaxBalance] = useState(fund?.maxBalance ?? 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Tên quỹ không được để trống';
    else if (name.trim().length > 40) e.name = 'Tên quỹ không vượt quá 40 ký tự';
    if (balance < 0) e.balance = 'Số dư không được nhỏ hơn 0';
    if (type === 'bank' && !bankName.trim()) e.bankName = 'Vui lòng chọn ngân hàng';
    if (type === 'bank' && !accountNumber.trim()) e.accountNumber = 'Số tài khoản ngân hàng là bắt buộc';
    if (hasLimit && limitAmount <= 0) e.limitAmount = 'Hạn mức chi tiêu hàng tháng phải lớn hơn 0';
    if (allocationPercent < 0 || allocationPercent > 100) e.allocationPercent = 'Tỷ lệ phân bổ phải từ 0 đến 100%';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    onSave(
      {
        name: name.trim(),
        type,
        balance,
        bankName: type === 'bank' ? bankName.trim() : undefined,
        accountNumber: type === 'bank' ? accountNumber.trim() : undefined,
        note: note.trim() || undefined,
        color,
        monthlyLimit: hasLimit ? limitAmount : undefined,
        maxBalance: maxBalance > 0 ? maxBalance : undefined,
        allocationPercent: !isSpending && allocationPercent > 0 ? allocationPercent : undefined,
        isSpending: isSpending || undefined,
        // Giữ nguyên các thông tin không chỉnh ở form này
        managementMethod: fund?.managementMethod,
        pinned: fund?.pinned,
      },
      fund
    );
  };

  const groupClass = 'rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-4';
  const groupTitle = 'text-[11px] font-black uppercase tracking-wider text-slate-400 -mb-1';

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Thông tin cơ bản */}
      <div className={groupClass}>
        <p className={groupTitle}>Thông tin cơ bản</p>
        <div>
          <label htmlFor="fund-name-input" className={labelClass}>
            Tên quỹ
          </label>
          <input
            id="fund-name-input"
            type="text"
            placeholder="Ví dụ: Quỹ Tiết Kiệm, Quỹ Laptop..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass(!!errors.name)}
          />
          <FieldError message={errors.name} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { key: 'cash', label: 'Tiền mặt / Ví', Icon: Wallet, active: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100', icon: 'text-emerald-600' },
              { key: 'bank', label: 'Tài khoản ngân hàng', Icon: Landmark, active: 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100', icon: 'text-indigo-600' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              id={`select-type-${opt.key}-btn`}
              type="button"
              onClick={() => setType(opt.key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                type === opt.key ? opt.active : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <opt.Icon className={`w-5 h-5 ${opt.icon}`} />
              {opt.label}
            </button>
          ))}
        </div>

        {type === 'bank' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="fund-bank-name-select" className={labelClass}>
                Ngân hàng
              </label>
              <select
                id="fund-bank-name-select"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className={`${inputClass(!!errors.bankName)} cursor-pointer`}
              >
                <option value="">-- Chọn ngân hàng --</option>
                {VIETNAM_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <FieldError message={errors.bankName} />
            </div>
            <div>
              <label htmlFor="fund-account-number-input" className={labelClass}>
                Số tài khoản
              </label>
              <input
                id="fund-account-number-input"
                type="text"
                inputMode="numeric"
                placeholder="Ví dụ: 1903456789012"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className={`${inputClass(!!errors.accountNumber)} font-mono`}
              />
              <FieldError message={errors.accountNumber} />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="fund-balance-input" className={labelClass}>
            {fund ? 'Số dư hiện tại' : 'Số dư ban đầu'}
          </label>
          <MoneyInput id="fund-balance-input" value={balance} onChange={setBalance} invalid={!!errors.balance} showWords />
          <FieldError message={errors.balance} />
        </div>

        <div>
          <label htmlFor="fund-note-input" className={labelClass}>
            Ghi chú <span className="normal-case font-medium text-slate-400">(mục đích của quỹ này)</span>
          </label>
          <textarea
            id="fund-note-input"
            rows={2}
            placeholder="Ví dụ: Tiết kiệm mua nhà, dự phòng khẩn cấp..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass()} resize-none`}
          />
        </div>
      </div>

      {/* Phân bổ & giới hạn */}
      <div className={groupClass}>
        <p className={groupTitle}>Phân bổ & giới hạn</p>

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            id="fund-is-spending-checkbox"
            type="checkbox"
            checked={isSpending}
            onChange={(e) => setIsSpending(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className="text-sm font-semibold text-slate-700">
            Đây là quỹ tiêu dùng 🛒
            <span className="block text-xs font-medium text-slate-400">Không hiện trong danh sách phân bổ thu nhập</span>
          </span>
        </label>

        {!isSpending && (
          <div>
            <label htmlFor="fund-allocation-percent-input" className={labelClass}>
              Tỷ lệ phân bổ thu nhập <span className="normal-case font-medium text-slate-400">(% mỗi tháng, tùy chọn)</span>
            </label>
            <div className="relative">
              <input
                id="fund-allocation-percent-input"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="any"
                placeholder="Ví dụ: 10"
                value={allocationPercent === 0 ? '' : allocationPercent}
                onChange={(e) => setAllocationPercent(Number(e.target.value))}
                className={`${inputClass(!!errors.allocationPercent)} pr-10 font-mono font-semibold`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
            <FieldError message={errors.allocationPercent} />
          </div>
        )}

        <div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-2">
            <input
              id="fund-has-limit-checkbox"
              type="checkbox"
              checked={hasLimit}
              onChange={(e) => setHasLimit(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm font-semibold text-slate-700">Đặt hạn mức chi tiêu hàng tháng</span>
          </label>
          {hasLimit && (
            <>
              <MoneyInput
                id="fund-limit-amount-input"
                value={limitAmount}
                onChange={setLimitAmount}
                invalid={!!errors.limitAmount}
                placeholder="Ví dụ: 4.000.000"
                ariaLabel="Hạn mức chi tiêu mỗi tháng"
              />
              <FieldError message={errors.limitAmount} />
            </>
          )}
        </div>

        <div>
          <label htmlFor="fund-max-balance-input" className={labelClass}>
            Trần quỹ - số dư tối đa <span className="normal-case font-medium text-slate-400">(0 = không giới hạn)</span>
          </label>
          <MoneyInput id="fund-max-balance-input" value={maxBalance} onChange={setMaxBalance} />
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Khi số dư đạt mức này, quỹ sẽ không nhận thêm tiền.</p>
        </div>
      </div>

      {/* Màu sắc */}
      <div className={groupClass}>
        <p className={groupTitle}>Màu sắc đại diện</p>
        <div className="grid grid-cols-6 gap-2">
          {FUND_COLORS.map((clr) => (
            <button
              key={clr.value}
              id={`select-color-${clr.value}-btn`}
              type="button"
              onClick={() => setColor(clr.value)}
              title={clr.name}
              aria-label={clr.name}
              className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${clr.activeBg} ${
                color === clr.value ? 'ring-4 ring-offset-2 ring-slate-300 scale-105' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {color === clr.value && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
