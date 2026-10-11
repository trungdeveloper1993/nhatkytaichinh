import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Wallet,
  Landmark,
  MinusCircle,
  PlusCircle,
  ArrowLeftRight,
  Edit3,
  Pin,
  Trash2,
  ClipboardList,
  Copy,
  Check,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { Fund, Transaction } from '../types';
import Sheet from './ui/Sheet';
import { usePrivacy, formatAmount } from '../PrivacyContext';
import { TxKind } from './TransactionForm';
import { fundSpentInMonth, sortTransactionsDesc, toMonthKey } from '../ledger';
import { friendlyDayLabel } from '../utils';
import { FundDot, ProgressBar, TxTypeIcon, EmptyState } from './ui/primitives';

interface FundDetailSheetProps {
  fund: Fund | null;
  onClose: () => void;
  funds: Fund[];
  transactions: Transaction[];
  canDelete: boolean;
  onQuickAdd: (type: TxKind, fundId: string) => void;
  onEdit: (fund: Fund) => void;
  onTogglePin: (fund: Fund) => void;
  onOpenManagement: (fund: Fund) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDelete: (fund: Fund) => void;
}

const partialMask = (s: string) => (s.length <= 6 ? s.slice(0, 2) + '*'.repeat(Math.max(1, s.length - 2)) : s.slice(0, 3) + '*'.repeat(s.length - 6) + s.slice(-3));

export default function FundDetailSheet({
  fund,
  onClose,
  funds,
  transactions,
  canDelete,
  onQuickAdd,
  onEdit,
  onTogglePin,
  onOpenManagement,
  onEditTransaction,
  onDelete,
}: FundDetailSheetProps) {
  const open = !!fund;
  const lastFund = useRef<Fund | null>(fund);
  if (fund) lastFund.current = fund;
  const current = lastFund.current;
  const { hidden } = usePrivacy();
  const [copied, setCopied] = useState(false);
  // Con mắt riêng của màn chi tiết (giống con mắt trên thẻ quỹ)
  const [reveal, setReveal] = useState(false);
  useEffect(() => setReveal(false), [fund?.id]);
  const masked = hidden && !reveal;
  const format = (amount: number) => formatAmount(amount, masked);

  const month = toMonthKey();

  const stats = useMemo(() => {
    if (!current) return { inflow: 0, spent: 0, outflow: 0, list: [] as Transaction[] };
    let inflow = 0;
    let outflow = 0;
    const related = transactions.filter((t) => t.fundId === current.id || t.toFundId === current.id);
    related.forEach((t) => {
      if (!t.date.startsWith(month)) return;
      if (t.type === 'income' && t.fundId === current.id) inflow += t.amount;
      if (t.type === 'transfer' && t.toFundId === current.id) inflow += t.amount;
      if (t.type === 'transfer' && t.fundId === current.id) outflow += t.amount;
    });
    return {
      inflow,
      outflow,
      spent: fundSpentInMonth(transactions, current.id, month),
      list: sortTransactionsDesc(related).slice(0, 20),
    };
  }, [current, transactions, month]);

  if (!current) return null;

  const fundName = (id?: string) => funds.find((f) => f.id === id)?.name || 'Quỹ đã xóa';

  const handleCopy = () => {
    if (!current.accountNumber) return;
    navigator.clipboard?.writeText(current.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const quickActions: { label: string; Icon: typeof MinusCircle; cls: string; onClick: () => void }[] = [
    { label: 'Chi tiêu', Icon: MinusCircle, cls: 'text-rose-600 bg-rose-50', onClick: () => onQuickAdd('expense', current.id) },
    { label: 'Bổ sung', Icon: PlusCircle, cls: 'text-emerald-600 bg-emerald-50', onClick: () => onQuickAdd('income', current.id) },
    { label: 'Chuyển đi', Icon: ArrowLeftRight, cls: 'text-indigo-600 bg-indigo-50', onClick: () => onQuickAdd('transfer', current.id) },
    { label: 'Sửa quỹ', Icon: Edit3, cls: 'text-slate-700 bg-slate-100', onClick: () => onEdit(current) },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      id="fund-detail-sheet"
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <FundDot color={current.color} />
          {current.name}
          {current.pinned && <Pin className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />}
        </span>
      }
      subtitle={
        current.type === 'bank'
          ? `Tài khoản ngân hàng${current.bankName && !masked ? ` · ${current.bankName}` : ''}`
          : 'Tiền mặt / Ví'
      }
      icon={
        <span className={`flex p-2 rounded-xl ${current.type === 'bank' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {current.type === 'bank' ? <Landmark className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
        </span>
      }
      footer={
        <div className="flex gap-2.5">
          <button
            id="fund-detail-pin-btn"
            type="button"
            onClick={() => onTogglePin(current)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
              current.pinned ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Pin className={`w-4 h-4 ${current.pinned ? 'fill-indigo-600' : ''}`} /> {current.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
          </button>
          {canDelete && (
            <button
              id="fund-detail-delete-btn"
              type="button"
              onClick={() => onDelete(current)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Xóa quỹ
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Số dư */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 text-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Số dư hiện tại</p>
            {hidden && (
              <button
                id="fund-detail-reveal-btn"
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="p-1.5 -m-1 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={reveal ? 'Ẩn số tiền quỹ này' : 'Hiện số tiền quỹ này'}
              >
                {reveal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            )}
          </div>
          <p className="font-display font-black text-3xl tabular-nums mt-1" id="fund-detail-balance">
            {format(current.balance)}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {current.isSpending && <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/15">🛒 Quỹ tiêu dùng</span>}
            {current.allocationPercent ? (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/15">Phân bổ {current.allocationPercent}% thu nhập</span>
            ) : null}
          </div>
        </div>

        {/* Thao tác nhanh */}
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className={`flex w-10 h-10 rounded-xl items-center justify-center ${a.cls}`}>
                <a.Icon className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold text-slate-600">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Tháng này */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Vào tháng này', value: stats.inflow, cls: 'text-emerald-600', sign: '+' },
            { label: 'Đã chi', value: stats.spent, cls: 'text-rose-600', sign: '-' },
            { label: 'Chuyển đi', value: stats.outflow, cls: 'text-indigo-600', sign: '' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400 truncate">{s.label}</p>
              <p className={`text-sm font-bold font-mono tabular-nums truncate mt-0.5 ${s.cls}`}>
                {s.value > 0 ? s.sign : ''}
                {format(s.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Tiến độ hạn mức / trần quỹ */}
        {(current.monthlyLimit || current.maxBalance) && (
          <div className="rounded-xl border border-slate-100 p-3 space-y-3">
            {current.monthlyLimit ? (
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Hạn mức chi tháng</span>
                  <span className="font-mono">
                    {format(stats.spent)} / {format(current.monthlyLimit)}
                  </span>
                </div>
                <ProgressBar ratio={stats.spent / current.monthlyLimit} />
              </div>
            ) : null}
            {current.maxBalance ? (
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Trần quỹ</span>
                  <span className="font-mono">
                    {format(current.balance)} / {format(current.maxBalance)}
                  </span>
                </div>
                <ProgressBar ratio={current.balance / current.maxBalance} tone={current.balance >= current.maxBalance ? 'amber' : 'emerald'} />
              </div>
            ) : null}
          </div>
        )}

        {/* STK */}
        {current.type === 'bank' && current.accountNumber && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Số tài khoản</p>
              <p className="font-mono text-sm font-semibold text-slate-800 truncate">
                {masked ? '••••••••••' : hidden ? partialMask(current.accountNumber) : current.accountNumber}
              </p>
            </div>
            {!masked && (
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                title="Sao chép số tài khoản (đầy đủ)"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Đã chép' : 'Sao chép'}
              </button>
            )}
          </div>
        )}

        {/* Mục đích & cách quản lý */}
        {current.note && (
          <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/70">Mục đích</p>
            <p className="text-sm text-slate-700 leading-relaxed mt-0.5">{current.note}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => onOpenManagement(current)}
          className="w-full flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="flex p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
            <ClipboardList className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-800">Cách quản lý</span>
            <span className="block text-xs text-slate-500 truncate">
              {current.managementMethod ? current.managementMethod.split('\n')[0].replace(/^[-•]\s*/, '') : 'Chưa có — bấm để thêm'}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {/* Giao dịch của quỹ */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Giao dịch gần đây</p>
          {stats.list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200">
              <EmptyState icon={<Inbox className="w-6 h-6" />} title="Chưa có giao dịch" message="Các khoản thu chi của quỹ này sẽ hiện ở đây." />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
              {stats.list.map((tx) => {
                const isOut = tx.type === 'expense' || (tx.type === 'transfer' && tx.fundId === current.id);
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <TxTypeIcon type={tx.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 truncate">{tx.category}</span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {friendlyDayLabel(tx.date)}
                        {tx.type === 'transfer' && (tx.fundId === current.id ? ` · đến ${fundName(tx.toFundId)}` : ` · từ ${fundName(tx.fundId)}`)}
                      </span>
                    </span>
                    <span className={`shrink-0 text-sm font-bold font-mono tabular-nums ${isOut ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isOut ? '-' : '+'}
                      {format(tx.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
