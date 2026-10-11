import { useMemo } from 'react';
import { Plus, Wallet, Landmark, Sigma } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Fund, Transaction } from '../types';
import FundCard from '../components/FundCard';
import { PageHeader } from '../components/ui/primitives';
import { usePrivacy } from '../PrivacyContext';
import { fundSpentInMonth, toMonthKey } from '../ledger';
import { NAV_BY_KEY } from '../nav';

interface FundsPageProps {
  funds: Fund[];
  transactions: Transaction[];
  onCreateFund: () => void;
  onOpenFund: (fund: Fund) => void;
  onEditFund: (fund: Fund) => void;
  onDeleteFund: (fundId: string) => void;
  onTogglePin: (fund: Fund) => void;
  onOpenManagement: (fund: Fund) => void;
}

export default function FundsPage({
  funds,
  transactions,
  onCreateFund,
  onOpenFund,
  onEditFund,
  onDeleteFund,
  onTogglePin,
  onOpenManagement,
}: FundsPageProps) {
  const { format, compact } = usePrivacy();
  const month = toMonthKey();
  const nav = NAV_BY_KEY.funds;

  const summary = useMemo(() => {
    let total = 0;
    let cash = 0;
    let bank = 0;
    funds.forEach((f) => {
      total += f.balance;
      if (f.type === 'cash') cash += f.balance;
      else bank += f.balance;
    });
    return { total, cash, bank };
  }, [funds]);

  const tiles = [
    { label: 'Tổng tài sản', value: summary.total, Icon: Sigma, cls: 'text-slate-900', iconCls: 'bg-slate-100 text-slate-600' },
    { label: 'Tiền mặt & Ví', value: summary.cash, Icon: Wallet, cls: 'text-emerald-600', iconCls: 'bg-emerald-50 text-emerald-600' },
    { label: 'Ngân hàng', value: summary.bank, Icon: Landmark, cls: 'text-indigo-600', iconCls: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div>
      <PageHeader
        title={nav.label}
        description={`${funds.length} quỹ · chạm vào quỹ để xem chi tiết`}
        actions={
          <button
            id="open-fund-form-btn"
            onClick={onCreateFund}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm quỹ
          </button>
        }
      />

      <div id="summary-cards-grid" className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white/80 backdrop-blur border border-white p-3 sm:p-4 shadow-sm min-w-0">
            <div className="flex items-center gap-2">
              <span className={`hidden sm:flex p-2 rounded-xl ${t.iconCls}`}>
                <t.Icon className="w-4 h-4" />
              </span>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-tight text-slate-400 truncate">{t.label}</p>
            </div>
            <p className={`font-display font-extrabold text-sm sm:text-xl tabular-nums mt-1 sm:mt-2 truncate ${t.cls}`} title={format(t.value)}>
              <span className="sm:hidden">{compact(t.value)}</span>
              <span className="hidden sm:inline">{format(t.value)}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <AnimatePresence mode="popLayout">
          {funds.map((fund) => (
            <FundCard
              key={fund.id}
              fund={fund}
              onDelete={onDeleteFund}
              onEdit={onEditFund}
              onOpenManagement={onOpenManagement}
              onTogglePin={onTogglePin}
              onOpenDetail={onOpenFund}
              canDelete={funds.length > 1}
              currentMonthSpent={fund.monthlyLimit ? fundSpentInMonth(transactions, fund.id, month) : 0}
            />
          ))}
        </AnimatePresence>

        <button
          id="create-fund-card-btn"
          onClick={onCreateFund}
          className="min-h-[180px] rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white/40 hover:bg-white/70 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-indigo-700 transition-all cursor-pointer group"
        >
          <span className="p-3 rounded-full bg-white shadow-sm group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 text-indigo-600" />
          </span>
          <span className="font-display font-semibold text-sm">Tạo quỹ tài chính mới</span>
        </button>
      </div>
    </div>
  );
}
