import { useMemo } from 'react';
import { PencilLine, PlusCircle, Trash2 } from 'lucide-react';
import { Fund, Transaction } from '../types';
import Sheet from './ui/Sheet';
import TransactionForm, { TxKind } from './TransactionForm';
import { revertTransaction, toISODate, TransactionInput } from '../ledger';

interface QuickAddSheetProps {
  open: boolean;
  sessionKey: number;
  onClose: () => void;
  funds: Fund[];
  initialType?: TxKind;
  initialFundId?: string;
  initialDate?: string;
  editing?: Transaction | null;
  onSubmit: (tx: TransactionInput) => void;
  onDelete?: (tx: Transaction) => void;
}

export default function QuickAddSheet({
  open,
  sessionKey,
  onClose,
  funds,
  initialType,
  initialFundId,
  initialDate,
  editing,
  onSubmit,
  onDelete,
}: QuickAddSheetProps) {
  const pastDate = !editing && initialDate && initialDate !== toISODate() ? initialDate.split('-').reverse().join('/') : null;
  // Khi sửa: kiểm tra số dư dựa trên số dư đã hoàn lại giao dịch cũ
  const formFunds = useMemo(() => (editing ? revertTransaction(funds, editing) : funds), [funds, editing]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      id="quick-add-sheet"
      title={editing ? 'Sửa giao dịch' : 'Ghi chép mới'}
      subtitle={
        editing
          ? 'Số dư các quỹ sẽ được tính lại theo thay đổi'
          : pastDate
            ? `Ghi cho ngày ${pastDate}`
            : 'Chi tiêu, bổ sung tiền hoặc chuyển giữa các quỹ'
      }
      icon={
        <span className="flex p-2 rounded-xl bg-indigo-50 text-indigo-600">
          {editing ? <PencilLine className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
        </span>
      }
    >
      <TransactionForm
        key={`${sessionKey}-${editing?.id ?? 'new'}`}
        variant="plain"
        idPrefix="qa"
        funds={formFunds}
        editing={editing}
        initialType={initialType}
        initialFundId={initialFundId}
        initialDate={initialDate}
        onSubmit={onSubmit}
      />
      {editing && onDelete && (
        <button
          id="quick-add-delete-btn"
          type="button"
          onClick={() => onDelete(editing)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" /> Xóa giao dịch này
        </button>
      )}
    </Sheet>
  );
}
