import { Plus } from 'lucide-react';
import { Fund, Transaction } from '../types';
import TransactionForm from '../components/TransactionForm';
import TransactionHistory from '../components/TransactionHistory';
import { PageHeader } from '../components/ui/primitives';
import { TransactionInput } from '../ledger';
import { NAV_BY_KEY } from '../nav';

interface TransactionsPageProps {
  funds: Fund[];
  transactions: Transaction[];
  onAdd: (tx: TransactionInput) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onQuickAdd: () => void;
}

export default function TransactionsPage({ funds, transactions, onAdd, onEdit, onDelete, onClear, onQuickAdd }: TransactionsPageProps) {
  const nav = NAV_BY_KEY.transactions;

  return (
    <div>
      {/* Desktop đã có tiêu đề ở thanh trên và form bên trái */}
      <div className="lg:hidden">
        <PageHeader
          title={nav.label}
          description={nav.description}
          actions={
            <button
              onClick={onQuickAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ghi chép
            </button>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form ghi chép cố định (desktop) */}
        <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-[92px]">
          <h2 className="font-display font-bold text-sm text-slate-800 mb-2.5 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" /> Ghi chép mới
          </h2>
          <TransactionForm funds={funds} onSubmit={onAdd} variant="card" />
        </div>

        <div className="lg:col-span-7">
          <TransactionHistory
            transactions={transactions}
            funds={funds}
            onDeleteTransaction={onDelete}
            onClearTransactions={onClear}
            onEditTransaction={onEdit}
          />
        </div>
      </div>
    </div>
  );
}
