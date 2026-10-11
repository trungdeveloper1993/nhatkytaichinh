import { useEffect, useRef, useState } from 'react';
import { Fund } from '../types';
import { ClipboardList, Pencil, Save } from 'lucide-react';
import Sheet from './ui/Sheet';
import { inputClass } from './ui/primitives';

interface ManagementModalProps {
  fund: Fund | null;
  onClose: () => void;
  onSave: (updatedFund: Fund) => void;
}

export default function ManagementModal({ fund, onClose, onSave }: ManagementModalProps) {
  const open = !!fund;
  // Giữ quỹ cuối cùng để nội dung không biến mất trong hiệu ứng đóng
  const lastFund = useRef<Fund | null>(fund);
  if (fund) lastFund.current = fund;
  const current = lastFund.current;

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (fund) {
      setText(fund.managementMethod || '');
      setEditing(!fund.managementMethod); // Chưa có nội dung thì mở sẵn chế độ sửa
    }
    // Chỉ khởi tạo lại khi mở quỹ khác
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fund?.id]);

  if (!current) return null;

  const handleSave = () => {
    onSave({ ...current, managementMethod: text.trim() ? text.trim() : undefined });
    setEditing(false);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      id="management-sheet"
      title="Cách quản lý"
      subtitle={current.name}
      icon={
        <span className="flex p-2 rounded-xl bg-indigo-50 text-indigo-600">
          <ClipboardList className="w-5 h-5" />
        </span>
      }
      footer={
        editing ? (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                setText(current.managementMethod || '');
                if (current.managementMethod) setEditing(false);
                else onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              id="management-save-btn"
              type="button"
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu
            </button>
          </div>
        ) : (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              id="management-edit-btn"
              type="button"
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" /> Chỉnh sửa
            </button>
          </div>
        )
      }
    >
      {/* Gợi ý phân bổ */}
      {(current.allocationPercent || current.isSpending || current.monthlyLimit || current.maxBalance) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {current.allocationPercent ? (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Phân bổ: {current.allocationPercent}% thu nhập
            </span>
          ) : null}
          {current.isSpending && (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
              🛒 Quỹ tiêu dùng
            </span>
          )}
          {current.monthlyLimit ? (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 font-mono">
              Giới hạn/tháng: {current.monthlyLimit.toLocaleString('vi-VN')} ₫
            </span>
          ) : null}
          {current.maxBalance ? (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 font-mono">
              Trần quỹ: {current.maxBalance.toLocaleString('vi-VN')} ₫
            </span>
          ) : null}
        </div>
      )}

      {editing ? (
        <textarea
          id="management-method-input"
          rows={10}
          placeholder="Nhập cách quản lý & gợi ý phân bổ cho quỹ này..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`${inputClass()} leading-relaxed resize-y`}
        />
      ) : (
        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4">
          {current.managementMethod ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{current.managementMethod}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">Chưa có ghi chú cách quản lý. Bấm "Chỉnh sửa" để thêm.</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
