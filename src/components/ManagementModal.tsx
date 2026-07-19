import { useState, useEffect } from 'react';
import { Fund } from '../types';
import { X, ClipboardList, Pencil, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManagementModalProps {
  fund: Fund | null;
  onClose: () => void;
  onSave: (updatedFund: Fund) => void;
}

export default function ManagementModal({ fund, onClose, onSave }: ManagementModalProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (fund) {
      setText(fund.managementMethod || '');
      setEditing(!fund.managementMethod); // Chưa có nội dung thì mở sẵn chế độ sửa
    }
  }, [fund]);

  if (!fund) return null;

  const handleSave = () => {
    onSave({ ...fund, managementMethod: text.trim() ? text.trim() : undefined });
    setEditing(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl border border-white/45 p-6 rounded-3xl shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <ClipboardList className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display font-black text-slate-800 text-base truncate">Cách Quản Lý</h3>
                <p className="text-[11px] font-semibold text-slate-400 truncate">{fund.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Gợi ý phân bổ */}
          {(fund.allocationPercent || fund.isSpending || fund.monthlyLimit || fund.maxBalance) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {fund.allocationPercent ? (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Phân bổ: {fund.allocationPercent}% thu nhập
                </span>
              ) : null}
              {fund.isSpending && (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                  🛒 Quỹ tiêu dùng
                </span>
              )}
              {fund.monthlyLimit ? (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 font-mono">
                  Giới hạn/tháng: {fund.monthlyLimit.toLocaleString('vi-VN')} ₫
                </span>
              ) : null}
              {fund.maxBalance ? (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 font-mono">
                  Trần quỹ: {fund.maxBalance.toLocaleString('vi-VN')} ₫
                </span>
              ) : null}
            </div>
          )}

          {/* Nội dung cách quản lý */}
          {editing ? (
            <textarea
              id="management-method-input"
              rows={10}
              autoFocus
              placeholder="Nhập cách quản lý & gợi ý phân bổ cho quỹ này..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border bg-white border-slate-200 focus:border-indigo-400 focus:ring-indigo-100/50 outline-hidden focus:ring-4 transition-all text-sm text-slate-800 font-medium leading-relaxed resize-y"
            />
          ) : (
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 max-h-[50vh] overflow-y-auto">
              {fund.managementMethod ? (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{fund.managementMethod}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">Chưa có ghi chú cách quản lý. Bấm "Chỉnh sửa" để thêm.</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex items-center gap-3">
            {editing ? (
              <>
                <button
                  id="management-save-btn"
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-xs hover:shadow-md flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Lưu
                </button>
                <button
                  onClick={() => {
                    setText(fund.managementMethod || '');
                    setEditing(false);
                    if (!fund.managementMethod) onClose();
                  }}
                  className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Hủy
                </button>
              </>
            ) : (
              <>
                <button
                  id="management-edit-btn"
                  onClick={() => setEditing(true)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-xs hover:shadow-md flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Chỉnh sửa
                </button>
                <button
                  onClick={onClose}
                  className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
