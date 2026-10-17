import React, { useState } from 'react';
import { Fund, Transaction, CATEGORIES_EXPENSE, CATEGORIES_INCOME } from '../types';
import { MinusCircle, PlusCircle, ArrowLeftRight, Repeat, FileText, Check, Pencil } from 'lucide-react';
import { usePrivacy } from '../PrivacyContext';
import MoneyInput, { DEFAULT_QUICK_AMOUNTS } from './ui/MoneyInput';
import { TransactionInput, toISODate } from '../ledger';
import { inputClass, labelClass, FieldError } from './ui/primitives';

export type TxKind = 'expense' | 'income' | 'transfer';

interface TransactionFormProps {
  funds: Fund[];
  onSubmit: (tx: TransactionInput) => void;
  initialType?: TxKind;
  initialFundId?: string;
  /** Ngày ghi sẵn (YYYY-MM-DD), vd. khi ghi chép từ lịch báo cáo */
  initialDate?: string;
  editing?: Transaction | null;
  variant?: 'card' | 'plain';
  /** Tiền tố id khi trang có 2 form cùng lúc (vd. sheet ghi chép nhanh) để id không trùng */
  idPrefix?: string;
}

const TABS: { key: TxKind; label: string; Icon: typeof MinusCircle; activeText: string }[] = [
  { key: 'expense', label: 'Chi tiêu', Icon: MinusCircle, activeText: 'text-rose-600' },
  { key: 'income', label: 'Bổ sung', Icon: PlusCircle, activeText: 'text-emerald-600' },
  { key: 'transfer', label: 'Chuyển quỹ', Icon: ArrowLeftRight, activeText: 'text-indigo-600' },
];

const TONE = {
  expense: { amount: 'text-rose-600', strip: 'bg-rose-500', chip: 'bg-rose-600 border-rose-600', button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' },
  income: { amount: 'text-emerald-600', strip: 'bg-emerald-500', chip: 'bg-emerald-600 border-emerald-600', button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' },
  transfer: { amount: 'text-indigo-600', strip: 'bg-indigo-500', chip: 'bg-indigo-600 border-indigo-600', button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' },
};

const TRANSFER_CATEGORY = 'Chuyển quỹ 🔄';

function categoriesFor(type: TxKind) {
  return type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;
}

export default function TransactionForm({
  funds,
  onSubmit,
  initialType = 'expense',
  initialFundId,
  initialDate,
  editing,
  variant = 'card',
  idPrefix,
}: TransactionFormProps) {
  const fid = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name);
  const today = toISODate();
  const yesterday = toISODate(new Date(new Date().setDate(new Date().getDate() - 1)));

  const startType: TxKind = editing?.type ?? initialType;
  const editingIsCustom =
    !!editing && editing.type !== 'transfer' && !categoriesFor(editing.type).includes(editing.category);

  const [type, setType] = useState<TxKind>(startType);
  const [amount, setAmount] = useState<number>(editing?.amount ?? 0);
  const [fundId, setFundId] = useState(editing?.fundId ?? initialFundId ?? '');
  const [toFundId, setToFundId] = useState(editing?.toFundId ?? '');
  const [category, setCategory] = useState(editing && !editingIsCustom && editing.type !== 'transfer' ? editing.category : '');
  const [customCategory, setCustomCategory] = useState(editingIsCustom ? editing!.category : '');
  const [isCustom, setIsCustom] = useState(editingIsCustom);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [date, setDate] = useState(editing?.date ?? initialDate ?? today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { format: formatBalance } = usePrivacy();

  const tone = TONE[type];
  const selectedFundId = fundId && funds.some((f) => f.id === fundId) ? fundId : funds[0]?.id || '';
  const selectedToFundId =
    (toFundId && toFundId !== selectedFundId && funds.some((f) => f.id === toFundId) ? toFundId : '') ||
    funds.find((f) => f.id !== selectedFundId)?.id ||
    '';
  const categoriesList = categoriesFor(type);

  const switchType = (next: TxKind) => {
    if (next === type) return;
    setType(next);
    setCategory('');
    setIsCustom(false);
    setCustomCategory('');
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (amount <= 0) e.amount = 'Số tiền phải lớn hơn 0';
    if (!selectedFundId) e.fundId = 'Vui lòng chọn một quỹ tài chính';
    if (!date) e.date = 'Vui lòng chọn ngày giao dịch';

    if (type === 'transfer') {
      if (!selectedToFundId) e.toFundId = 'Vui lòng chọn quỹ nhận tiền';
      else if (selectedToFundId === selectedFundId) e.toFundId = 'Quỹ nhận phải khác quỹ nguồn';
      const source = funds.find((f) => f.id === selectedFundId);
      if (source && source.balance < amount) {
        e.amount = `Số dư quỹ nguồn không đủ (Hiện có ${formatBalance(source.balance)})`;
      }
      const dest = funds.find((f) => f.id === selectedToFundId);
      if (dest && dest.maxBalance && dest.balance + amount > dest.maxBalance) {
        const room = dest.maxBalance - dest.balance;
        e.toFundId =
          room > 0
            ? `Quỹ nhận sắp vượt trần (tối đa ${formatBalance(dest.maxBalance)}). Chỉ nhận thêm tối đa ${formatBalance(room)}.`
            : `Quỹ nhận đã đạt trần (${formatBalance(dest.maxBalance)}), không thể nhận thêm.`;
      }
    } else {
      const finalCategory = isCustom ? customCategory.trim() : category;
      if (!finalCategory) e.category = 'Vui lòng chọn hoặc nhập mục đích / hạng mục';
      const fund = funds.find((f) => f.id === selectedFundId);
      if (type === 'expense' && fund && fund.balance < amount) {
        e.amount = `Số dư quỹ không đủ (Hiện có ${formatBalance(fund.balance)})`;
      }
      if (type === 'income' && fund && fund.maxBalance && fund.balance + amount > fund.maxBalance) {
        const room = fund.maxBalance - fund.balance;
        e.amount =
          room > 0
            ? `Sắp vượt trần quỹ (tối đa ${formatBalance(fund.maxBalance)}). Chỉ thêm được tối đa ${formatBalance(room)}.`
            : `Quỹ đã đạt trần (${formatBalance(fund.maxBalance)}), không thể thêm nữa.`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const tx: TransactionInput = {
      type,
      amount,
      fundId: selectedFundId,
      category: type === 'transfer' ? TRANSFER_CATEGORY : isCustom ? customCategory.trim() : category,
      notes: notes.trim(),
      date,
      ...(type === 'transfer' ? { toFundId: selectedToFundId } : {}),
    };
    onSubmit(tx);

    // Ở trang Sổ giao dịch: giữ loại, quỹ và ngày để ghi tiếp nhanh
    if (variant === 'card' && !editing) {
      setAmount(0);
      setCategory('');
      setCustomCategory('');
      setIsCustom(false);
      setNotes('');
      setErrors({});
    }
  };

  const fundOption = (f: Fund) => (
    <option key={f.id} value={f.id}>
      {f.pinned ? '📌 ' : ''}
      {f.name} ({formatBalance(f.balance)})
    </option>
  );

  const chipClass = (selected: boolean) =>
    `px-3 py-2 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
      selected ? `${tone.chip} text-white shadow-sm` : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
    }`;

  const body = (
    <>
      {/* Chọn loại giao dịch */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 mb-5" role="tablist">
        {TABS.map(({ key, label, Icon, activeText }) => (
          <button
            key={key}
            id={fid(`tab-${key}-btn`)}
            type="button"
            role="tab"
            aria-selected={type === key}
            onClick={() => switchType(key)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
              type === key ? `bg-white shadow-sm ${activeText}` : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {funds.length === 0 ? (
        <p className="text-center py-8 text-sm font-semibold text-slate-500">
          Vui lòng tạo ít nhất 1 quỹ tài chính trước khi ghi chép.
        </p>
      ) : type === 'transfer' && funds.length < 2 ? (
        <p className="text-center py-8 text-sm font-semibold text-slate-500">
          Cần có ít nhất 2 quỹ để chuyển tiền qua lại. Hãy tạo thêm một quỹ nữa nhé!
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Số tiền */}
          <div>
            <label htmlFor={fid('tx-amount-input')} className={labelClass}>
              Số tiền
            </label>
            <MoneyInput
              id={fid('tx-amount-input')}
              value={amount}
              onChange={setAmount}
              size="lg"
              toneClass={tone.amount}
              invalid={!!errors.amount}
              quickAmounts={DEFAULT_QUICK_AMOUNTS}
              showWords
            />
            <FieldError message={errors.amount} />
          </div>

          {/* Quỹ */}
          {type === 'transfer' ? (
            <div>
              <span className={labelClass}>Chuyển tiền giữa các quỹ</span>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Từ quỹ (trích ra)</span>
                  <select
                    id={fid('tx-from-fund-select')}
                    value={selectedFundId}
                    onChange={(e) => setFundId(e.target.value)}
                    className={`${inputClass()} mt-1 cursor-pointer`}
                  >
                    {funds.map(fundOption)}
                  </select>
                </div>
                <div className="flex justify-center">
                  <button
                    id={fid('tx-swap-funds-btn')}
                    type="button"
                    onClick={() => {
                      setFundId(selectedToFundId);
                      setToFundId(selectedFundId);
                    }}
                    className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 transition-transform duration-300 hover:rotate-180 cursor-pointer"
                    title="Đảo chiều quỹ nguồn và quỹ đích"
                    aria-label="Đảo chiều quỹ nguồn và quỹ đích"
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Đến quỹ (nhận vào)</span>
                  <select
                    id={fid('tx-to-fund-select')}
                    value={selectedToFundId}
                    onChange={(e) => setToFundId(e.target.value)}
                    className={`${inputClass(!!errors.toFundId)} mt-1 cursor-pointer`}
                  >
                    {funds.filter((f) => f.id !== selectedFundId).map(fundOption)}
                  </select>
                </div>
              </div>
              <FieldError message={errors.toFundId} />
            </div>
          ) : (
            <div>
              <label htmlFor={fid('tx-fund-select')} className={labelClass}>
                {type === 'expense' ? 'Trích từ quỹ nào' : 'Bổ sung vào quỹ nào'}
              </label>
              <select
                id={fid('tx-fund-select')}
                value={selectedFundId}
                onChange={(e) => setFundId(e.target.value)}
                className={`${inputClass(!!errors.fundId)} cursor-pointer`}
              >
                {funds.map(fundOption)}
              </select>
              <FieldError message={errors.fundId} />
            </div>
          )}

          {/* Hạng mục */}
          {type !== 'transfer' && (
            <div>
              <span className={labelClass}>{type === 'expense' ? 'Mục đích chi tiêu' : 'Nguồn tiền / Mục đích'}</span>
              <div className="flex flex-wrap gap-2" id={fid('tx-category-chips')}>
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setIsCustom(false);
                      setCategory(cat);
                    }}
                    className={chipClass(!isCustom && category === cat)}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  id={fid('tx-toggle-custom-category-btn')}
                  type="button"
                  onClick={() => {
                    setIsCustom(true);
                    setCategory('');
                  }}
                  className={chipClass(isCustom)}
                >
                  <Pencil className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                  Tự nhập
                </button>
              </div>
              {isCustom && (
                <input
                  id={fid('tx-category-input')}
                  type="text"
                  autoFocus={!editing}
                  placeholder="Nhập mục đích (vd: Mua tivi, Tiền nhà, Quà sinh nhật...)"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className={`${inputClass(!!errors.category)} mt-2`}
                />
              )}
              <FieldError message={errors.category} />
            </div>
          )}

          {/* Ngày giao dịch */}
          <div>
            <label htmlFor={fid('tx-date-input')} className={labelClass}>
              Ngày giao dịch
            </label>
            <div className="flex gap-2">
              <input
                id={fid('tx-date-input')}
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass(!!errors.date)} min-w-0 flex-1`}
              />
              {[
                { label: 'Hôm nay', value: today },
                { label: 'Hôm qua', value: yesterday },
              ].map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setDate(d.value)}
                  className={`shrink-0 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    date === d.value ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <FieldError message={errors.date} />
          </div>

          {/* Ghi chú */}
          <div>
            <label htmlFor={fid('tx-notes-input')} className={`${labelClass} flex items-center gap-1`}>
              <FileText className="w-3.5 h-3.5" /> Ghi chú <span className="normal-case font-medium text-slate-400">(tùy chọn)</span>
            </label>
            <textarea
              id={fid('tx-notes-input')}
              rows={2}
              placeholder={
                type === 'expense'
                  ? 'Chi cho việc gì (vd: Ăn bún chả với đồng nghiệp...)'
                  : type === 'income'
                    ? 'Tiền từ đâu (vd: Thưởng dự án, bố mẹ hỗ trợ...)'
                    : 'Lý do phân bổ (vd: Trích lương vào quỹ tiết kiệm...)'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass()} resize-none`}
            />
          </div>

          <button
            id={fid('tx-submit-btn')}
            type="submit"
            className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer ${tone.button}`}
          >
            {editing ? (
              <>
                <Check className="w-4 h-4" /> Lưu thay đổi
              </>
            ) : type === 'expense' ? (
              <>
                <MinusCircle className="w-4 h-4" /> Ghi nhận khoản chi
              </>
            ) : type === 'income' ? (
              <>
                <PlusCircle className="w-4 h-4" /> Bổ sung tiền
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4" /> Xác nhận chuyển quỹ
              </>
            )}
          </button>
        </form>
      )}
    </>
  );

  if (variant === 'plain') return body;

  return (
    <div id={fid('transaction-form-card')} className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white rounded-2xl shadow-sm p-4 sm:p-5">
      <div className={`absolute top-0 inset-x-0 h-1 transition-colors ${tone.strip}`} />
      {body}
    </div>
  );
}
