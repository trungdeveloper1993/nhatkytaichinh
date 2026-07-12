import React, { useState, useEffect } from 'react';
import { Fund, FUND_COLORS } from '../types';
import { usePrivacy, formatAmount } from '../PrivacyContext';
import { Wallet, Landmark, Copy, Check, Trash2, Edit3, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface FundCardProps {
  key?: string;
  fund: Fund;
  onDelete?: (fundId: string) => void;
  onEdit?: (fund: Fund) => void;
  canDelete: boolean;
  currentMonthSpent?: number;
}

export default function FundCard({ fund, onDelete, onEdit, canDelete, currentMonthSpent = 0 }: FundCardProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { hidden: globalHidden } = usePrivacy();

  // Trạng thái ẩn riêng cho từng quỹ, khởi tạo theo chế độ toàn cục
  const [localHidden, setLocalHidden] = useState(globalHidden);

  // Khi chế độ toàn cục thay đổi, đồng bộ lại trạng thái riêng của quỹ
  useEffect(() => {
    setLocalHidden(globalHidden);
  }, [globalHidden]);

  const formatCurrency = (amount: number) => formatAmount(amount, localHidden);

  // Find color style
  const colorScheme = FUND_COLORS.find((c) => c.value === fund.color) || FUND_COLORS[0];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fund.accountNumber) {
      navigator.clipboard.writeText(fund.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      id={`fund-card-${fund.id}`}
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`group relative p-5 rounded-2xl border transition-all duration-300 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden backdrop-blur-md bg-opacity-60 border-white/40 ${colorScheme.bg}`}
    >
      {/* Custom Confirmation Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md p-4 flex flex-col justify-center items-center text-center z-20 animate-fade-in">
          <p className="text-sm font-black text-slate-800">Xác nhận xóa quỹ?</p>
          <p className="text-[10px] text-slate-500 font-semibold mt-1 max-w-[200px]">
            Tất cả dữ liệu số dư và giao dịch liên quan sẽ bị ảnh hưởng.
          </p>
          <div className="flex gap-2.5 mt-4 w-full justify-center">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-200"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                if (onDelete) onDelete(fund.id);
                setShowConfirm(false);
              }}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      )}

      {/* Decorative Background Glow */}
      <div className={`absolute -right-12 -top-12 w-28 h-28 rounded-full opacity-10 filter blur-xl pointer-events-none ${colorScheme.activeBg}`} />

      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`p-2 rounded-xl flex items-center justify-center bg-white/80 shadow-xs`}>
              {fund.type === 'bank' ? (
                <Landmark className="w-5 h-5 text-indigo-600" />
              ) : (
                <Wallet className="w-5 h-5 text-emerald-600" />
              )}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
              {fund.type === 'bank' ? 'Tài khoản' : 'Tiền mặt'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 relative z-10">
            <button
              id={`toggle-fund-privacy-btn-${fund.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setLocalHidden((prev) => !prev);
              }}
              className="p-1.5 rounded-lg hover:bg-white/90 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
              title={localHidden ? 'Hiện số tiền quỹ này' : 'Ẩn số tiền quỹ này'}
            >
              {localHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {onEdit && (
              <button
                id={`edit-fund-btn-${fund.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(fund);
                }}
                className="p-1.5 rounded-lg hover:bg-white/90 text-slate-400 hover:text-indigo-650 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                title="Chỉnh sửa quỹ"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {canDelete && onDelete && (
              <button
                id={`delete-fund-btn-${fund.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirm(true);
                }}
                className="p-1.5 rounded-lg hover:bg-white/90 text-slate-400 hover:text-red-500 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                title="Xóa quỹ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <h3 className="font-display font-semibold text-lg text-slate-800 tracking-tight leading-snug">
          {fund.name}
        </h3>

        {fund.type === 'bank' && fund.bankName && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-indigo-700 bg-white/60 px-2 py-0.5 rounded-md w-fit border border-indigo-100">
            <Landmark className="w-3 h-3" />
            <span>{fund.bankName}</span>
          </div>
        )}

        {fund.type === 'bank' && fund.accountNumber && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-mono bg-white/50 px-2 py-0.5 rounded-md w-fit border border-slate-100">
            <span>STK: {localHidden ? '••••••••••' : fund.accountNumber}</span>
            {!localHidden && (
              <button
                id={`copy-stk-btn-${fund.id}`}
                onClick={handleCopy}
                className="hover:text-indigo-600 transition-colors p-0.5"
                title="Sao chép số tài khoản"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        )}

        {fund.note && (
          <p className="mt-2 text-xs text-slate-600 leading-snug italic bg-white/40 px-2.5 py-1.5 rounded-lg border border-white/50">
            📝 {fund.note}
          </p>
        )}
      </div>

      <div className="mt-6">
        <p className="text-xs text-slate-500 font-medium">Số dư khả dụng</p>
        <p className="font-display font-bold text-2xl tracking-tight text-slate-900 mt-0.5">
          {formatCurrency(fund.balance)}
        </p>
      </div>

      {fund.monthlyLimit !== undefined && fund.monthlyLimit > 0 && (
        <div className="mt-4 pt-3.5 border-t border-dashed border-slate-200/60">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            <span>Chi tiêu tháng</span>
            <span className={
              currentMonthSpent >= fund.monthlyLimit
                ? 'text-rose-600 font-extrabold'
                : currentMonthSpent >= fund.monthlyLimit * 0.8
                ? 'text-amber-600 font-extrabold'
                : 'text-indigo-600'
            }>
              {formatCurrency(currentMonthSpent)} / {formatCurrency(fund.monthlyLimit)}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden border border-slate-200/20">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                currentMonthSpent >= fund.monthlyLimit
                  ? 'bg-rose-500'
                  : currentMonthSpent >= fund.monthlyLimit * 0.8
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
              style={{
                width: `${Math.min(100, ((currentMonthSpent / fund.monthlyLimit) * 100))}%`
              }}
            />
          </div>
          {currentMonthSpent >= fund.monthlyLimit ? (
            <p className="text-[9px] text-rose-600 font-bold mt-1">⚠️ Đã vượt hạn mức chi tiêu tháng!</p>
          ) : currentMonthSpent >= fund.monthlyLimit * 0.8 ? (
            <p className="text-[9px] text-amber-600 font-bold mt-1">⚠️ Sắp chạm hạn mức chi tiêu tháng!</p>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}
