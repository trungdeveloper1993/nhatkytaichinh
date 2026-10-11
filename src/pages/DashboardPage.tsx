import { useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Wallet,
  Landmark,
  MinusCircle,
  PlusCircle,
  ArrowLeftRight,
  PieChart,
  ChevronRight,
  BellRing,
  AlertTriangle,
  ShieldAlert,
  Lock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Inbox,
  Pin,
  Layers,
  History,
} from 'lucide-react';
import { Fund, Transaction } from '../types';
import { usePrivacy } from '../PrivacyContext';
import { TabKey } from '../nav';
import { TxKind } from '../components/TransactionForm';
import { fundSpentInMonth, monthTotals, previousMonthKey, sortTransactionsDesc, toMonthKey } from '../ledger';
import { friendlyDayLabel, fullDateLabel } from '../utils';
import { SectionCard, EmptyState, FundDot, ProgressBar, TxTypeIcon, txAmountClass, txSign } from '../components/ui/primitives';

interface DashboardPageProps {
  funds: Fund[];
  transactions: Transaction[];
  needsBackup: boolean;
  backupLabel: string;
  onNavigate: (tab: TabKey) => void;
  onQuickAdd: (type?: TxKind, fundId?: string) => void;
  onOpenFund: (fund: Fund) => void;
  onEditTransaction: (tx: Transaction) => void;
  onBackup: () => void;
}

type Alert = { id: string; level: 'danger' | 'warning' | 'info'; icon: typeof AlertTriangle; text: string; action?: { label: string; onClick: () => void } };

export default function DashboardPage({
  funds,
  transactions,
  needsBackup,
  backupLabel,
  onNavigate,
  onQuickAdd,
  onOpenFund,
  onEditTransaction,
  onBackup,
}: DashboardPageProps) {
  const { hidden, toggle, format, compact } = usePrivacy();
  const month = toMonthKey();

  const assets = useMemo(() => {
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

  const thisMonth = useMemo(() => monthTotals(transactions, month), [transactions, month]);
  const lastMonth = useMemo(() => monthTotals(transactions, previousMonthKey(month)), [transactions, month]);
  const expenseChange =
    lastMonth.expense > 0 ? ((thisMonth.expense - lastMonth.expense) / lastMonth.expense) * 100 : null;

  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const hasData = transactions.length > 0 || funds.some((f) => f.balance > 0);
    if (needsBackup && hasData) {
      list.push({
        id: 'backup',
        level: 'warning',
        icon: ShieldAlert,
        text: `${backupLabel}. Dữ liệu chỉ nằm trên trình duyệt này — hãy sao lưu file CSV để không bị mất.`,
        action: { label: 'Sao lưu', onClick: onBackup },
      });
    }
    funds.forEach((f) => {
      if (f.monthlyLimit && f.monthlyLimit > 0) {
        const spent = fundSpentInMonth(transactions, f.id, month);
        const ratio = spent / f.monthlyLimit;
        if (ratio >= 1) {
          list.push({ id: `over-${f.id}`, level: 'danger', icon: AlertTriangle, text: `${f.name} đã vượt hạn mức chi tháng (${format(spent)} / ${format(f.monthlyLimit)}).` });
        } else if (ratio >= 0.8) {
          list.push({ id: `near-${f.id}`, level: 'warning', icon: AlertTriangle, text: `${f.name} sắp chạm hạn mức chi tháng (${Math.round(ratio * 100)}%).` });
        }
      }
      if (f.maxBalance && f.maxBalance > 0 && f.balance >= f.maxBalance) {
        list.push({ id: `cap-${f.id}`, level: 'info', icon: Lock, text: `${f.name} đã đạt trần quỹ (${format(f.maxBalance)}) — không nhận thêm tiền phân bổ.` });
      }
    });
    if (expenseChange !== null && expenseChange >= 20) {
      list.push({
        id: 'spend-up',
        level: 'danger',
        icon: TrendingUp,
        text: `Chi tiêu tháng này đã tăng ${expenseChange.toFixed(0)}% so với tháng trước. Hãy chú ý kiểm soát!`,
        action: { label: 'Xem báo cáo', onClick: () => onNavigate('reports') },
      });
    }
    if (thisMonth.income > 0 && thisMonth.expense > thisMonth.income) {
      list.push({ id: 'deficit', level: 'danger', icon: TrendingDown, text: `Tháng này đang chi nhiều hơn thu ${format(thisMonth.expense - thisMonth.income)}.` });
    }
    return list;
  }, [funds, transactions, month, needsBackup, backupLabel, expenseChange, thisMonth, format, onBackup, onNavigate]);

  const recent = useMemo(() => sortTransactionsDesc(transactions).slice(0, 6), [transactions]);
  const fundName = (id?: string) => funds.find((f) => f.id === id)?.name || 'Quỹ đã xóa';

  const alertStyle = {
    danger: 'bg-rose-50 border-rose-200 text-rose-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-indigo-50 border-indigo-100 text-indigo-900',
  };
  const alertIcon = { danger: 'text-rose-600', warning: 'text-amber-600', info: 'text-indigo-600' };

  const quickActions = [
    { label: 'Chi tiêu', Icon: MinusCircle, cls: 'bg-rose-50 text-rose-600', onClick: () => onQuickAdd('expense') },
    { label: 'Bổ sung', Icon: PlusCircle, cls: 'bg-emerald-50 text-emerald-600', onClick: () => onQuickAdd('income') },
    { label: 'Chuyển quỹ', Icon: ArrowLeftRight, cls: 'bg-indigo-50 text-indigo-600', onClick: () => onQuickAdd('transfer') },
    { label: 'Phân bổ', Icon: PieChart, cls: 'bg-amber-50 text-amber-600', onClick: () => onNavigate('allocation') },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Lời chào */}
      <div>
        <p className="text-xs font-semibold text-slate-500">{fullDateLabel()}</p>
        <h2 className="font-display font-black text-2xl text-slate-900 leading-tight">Chào bạn 👋</h2>
      </div>

      {/* Tổng tài sản */}
      <section
        id="dashboard-hero"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-5 sm:p-6 shadow-lg shadow-indigo-200"
      >
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-fuchsia-300/20 blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-100">Tổng tài sản</p>
            <button
              onClick={toggle}
              className="p-2 -m-1 rounded-xl text-indigo-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={hidden ? 'Hiện số tiền' : 'Ẩn số tiền'}
            >
              {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p id="dashboard-total-assets" className="font-display font-black text-3xl sm:text-4xl tracking-tight tabular-nums mt-1 break-all">
            {format(assets.total)}
          </p>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2.5 min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-100">
                <Wallet className="w-3.5 h-3.5" /> Tiền mặt & Ví
              </p>
              <p className="font-bold tabular-nums mt-0.5 truncate" title={format(assets.cash)}>
                {compact(assets.cash)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2.5 min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-100">
                <Landmark className="w-3.5 h-3.5" /> Ngân hàng
              </p>
              <p className="font-bold tabular-nums mt-0.5 truncate" title={format(assets.bank)}>
                {compact(assets.bank)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Thu chi tháng này */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="rounded-2xl bg-white/80 backdrop-blur border border-white p-3 sm:p-4 shadow-sm min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight text-slate-400 truncate">Thu tháng này</p>
          <p className="font-display font-bold text-sm sm:text-lg text-emerald-600 tabular-nums mt-1 truncate" title={format(thisMonth.income)}>
            +{compact(thisMonth.income)}
          </p>
        </div>
        <div className="rounded-2xl bg-white/80 backdrop-blur border border-white p-3 sm:p-4 shadow-sm min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight text-slate-400 truncate">Chi tháng này</p>
          <p className="font-display font-bold text-sm sm:text-lg text-rose-600 tabular-nums mt-1 truncate" title={format(thisMonth.expense)}>
            -{compact(thisMonth.expense)}
          </p>
          {expenseChange !== null && (
            <p
              className={`text-[10px] font-bold mt-0.5 truncate ${expenseChange > 0 ? 'text-rose-500' : 'text-emerald-600'}`}
              title={`${expenseChange > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(expenseChange).toFixed(0)}% so với tháng trước`}
            >
              {expenseChange > 0 ? '▲' : '▼'} {Math.abs(expenseChange).toFixed(0)}%<span className="hidden sm:inline"> so với tháng trước</span>
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-white/80 backdrop-blur border border-white p-3 sm:p-4 shadow-sm min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight text-slate-400 truncate">Thặng dư</p>
          <p
            className={`font-display font-bold text-sm sm:text-lg tabular-nums mt-1 truncate ${thisMonth.net >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}
            title={format(thisMonth.net)}
          >
            {thisMonth.net > 0 ? '+' : ''}
            {compact(thisMonth.net)}
          </p>
        </div>
      </div>

      {/* Thao tác nhanh */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white/80 backdrop-blur border border-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <span className={`flex w-10 h-10 sm:w-11 sm:h-11 rounded-2xl items-center justify-center ${a.cls}`}>
              <a.Icon className="w-5 h-5" />
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Cần chú ý */}
      <SectionCard
        id="dashboard-alerts"
        title="Cần chú ý"
        icon={<BellRing className="w-4 h-4 text-amber-500" />}
        action={alerts.length > 0 ? <span className="text-[11px] font-bold text-slate-400">{alerts.length} mục</span> : undefined}
      >
        {alerts.length === 0 ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Mọi thứ đều ổn — không có cảnh báo nào.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${alertStyle[a.level]}`}>
                <a.icon className={`w-4 h-4 shrink-0 mt-0.5 ${alertIcon[a.level]} ${a.level === 'danger' ? 'animate-pulse' : ''}`} />
                <p className={`flex-1 text-xs leading-relaxed ${a.level === 'danger' ? 'font-bold' : 'font-semibold'}`}>{a.text}</p>
                {a.action && (
                  <button
                    onClick={a.action.onClick}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black bg-white/80 hover:bg-white border border-black/5 transition-colors cursor-pointer"
                  >
                    {a.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Quỹ của bạn */}
        <SectionCard
          title="Quỹ của bạn"
          icon={<Layers className="w-4 h-4 text-indigo-500" />}
          action={
            <button onClick={() => onNavigate('funds')} className="flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
              Tất cả ({funds.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
          bodyClassName="pb-2"
        >
          {funds.length === 0 ? (
            <EmptyState icon={<Layers className="w-6 h-6" />} title="Chưa có quỹ nào" message="Tạo quỹ đầu tiên để bắt đầu quản lý tiền." />
          ) : (
            <div className="divide-y divide-slate-100">
              {funds.slice(0, 6).map((f) => {
                const spent = f.monthlyLimit ? fundSpentInMonth(transactions, f.id, month) : 0;
                return (
                  <button
                    key={f.id}
                    onClick={() => onOpenFund(f)}
                    className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <FundDot color={f.color} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <span className="truncate">{f.name}</span>
                        {f.pinned && <Pin className="w-3 h-3 shrink-0 text-indigo-500 fill-indigo-500" />}
                      </span>
                      {f.monthlyLimit ? (
                        <span className="block mt-1 pr-6">
                          <ProgressBar ratio={spent / f.monthlyLimit} />
                        </span>
                      ) : (
                        <span className="block text-[11px] text-slate-400 truncate">{f.type === 'bank' ? 'Ngân hàng' : 'Tiền mặt'}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-bold font-mono tabular-nums text-slate-900">{format(f.balance)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Giao dịch gần đây */}
        <SectionCard
          title="Giao dịch gần đây"
          icon={<History className="w-4 h-4 text-indigo-500" />}
          action={
            <button
              onClick={() => onNavigate('transactions')}
              className="flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Sổ giao dịch <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
          bodyClassName="pb-2"
        >
          {recent.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-6 h-6" />}
              title="Chưa có giao dịch nào"
              message="Ghi lại khoản thu chi đầu tiên để theo dõi dòng tiền."
              action={
                <button
                  onClick={() => onQuickAdd('expense')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 cursor-pointer"
                >
                  Ghi chép ngay
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <TxTypeIcon type={tx.type} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{tx.category}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {friendlyDayLabel(tx.date)} · {tx.type === 'transfer' ? `${fundName(tx.fundId)} → ${fundName(tx.toFundId)}` : fundName(tx.fundId)}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-bold font-mono tabular-nums ${txAmountClass(tx.type)}`}>
                    {txSign(tx.type)}
                    {format(tx.amount)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
