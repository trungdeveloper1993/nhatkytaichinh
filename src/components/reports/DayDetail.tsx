import { useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, CalendarX2, Plus, ArrowRight } from 'lucide-react';
import { Fund, Transaction } from '../../types';
import { usePrivacy } from '../../PrivacyContext';
import { useCountUp } from '../../hooks';
import { fullDateLabel, parseISODateLocal } from '../../utils';
import { TxTypeIcon, txAmountClass, txSign } from '../ui/primitives';
import { DaySummary } from './calendarData';

interface DayDetailProps {
  date: string;
  day?: DaySummary;
  cumulative: number;
  transactions: Transaction[]; // giao dịch của ngày, đã sắp xếp
  funds: Fund[];
  direction: number;
  canNext: boolean;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onAdd?: () => void; // không có = ngày trong tương lai
  /** Panel máy tính tự hiện tiêu đề; trong sheet điện thoại tiêu đề nằm ở sheet */
  showTitle?: boolean;
}

const shortDate = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;

export default function DayDetail(props: DayDetailProps) {
  const { date, direction, showTitle, isToday, canNext, onPrev, onNext } = props;
  const reduceMotion = !!useReducedMotion();
  const prevDate = shiftLabel(date, -1);
  const nextDate = shiftLabel(date, 1);

  return (
    <div id="day-detail">
      <div className="flex items-center justify-between gap-2 mb-3">
        {showTitle ? (
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Chi tiết ngày</p>
            <h3 className="font-display font-bold text-base text-slate-900 truncate flex items-center gap-2">
              {fullDateLabel(parseISODateLocal(date))}
              {isToday && <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-black">HÔM NAY</span>}
            </h3>
          </div>
        ) : (
          <button
            id="day-detail-prev-btn"
            type="button"
            onClick={onPrev}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> {prevDate}
          </button>
        )}
        {showTitle ? (
          <div className="flex items-center gap-1 shrink-0">
            <NavButton id="day-detail-prev-btn" label="Ngày trước" onClick={onPrev}>
              <ChevronLeft className="w-4 h-4" />
            </NavButton>
            <NavButton id="day-detail-next-btn" label="Ngày sau" onClick={onNext} disabled={!canNext}>
              <ChevronRight className="w-4 h-4" />
            </NavButton>
          </div>
        ) : (
          <button
            id="day-detail-next-btn"
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {nextDate} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={date}
          custom={direction}
          variants={{
            enter: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * 24 }),
            center: { opacity: 1, x: 0 },
            exit: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * -24 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
        >
          <DayBody {...props} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function shiftLabel(date: string, delta: number) {
  const d = parseISODateLocal(date);
  d.setDate(d.getDate() + delta);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function NavButton({ id, label, onClick, disabled, children }: { id: string; label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
    >
      {children}
    </button>
  );
}

function DayBody({ date, day, cumulative, transactions, funds, onEditTransaction, onAdd }: DayDetailProps) {
  const { format, hidden } = usePrivacy();
  const income = day?.income ?? 0;
  const expense = day?.expense ?? 0;
  const net = income - expense;
  const animatedNet = useCountUp(net, 600);
  const signed = (v: number) => (v === 0 ? format(0) : `${v > 0 ? '+' : '−'}${format(Math.abs(v))}`);
  const fundName = (id?: string) => funds.find((f) => f.id === id)?.name || 'Quỹ đã xóa';

  // Chi theo mục đích trong ngày (một màu, sắp xếp giảm dần)
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) if (tx.type === 'expense') map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const timeOf = (tx: Transaction) => {
    const created = new Date(tx.createdAt);
    if (Number.isNaN(created.getTime())) return null;
    const sameDay =
      created.getFullYear() === Number(date.slice(0, 4)) && created.getMonth() + 1 === Number(date.slice(5, 7)) && created.getDate() === Number(date.slice(8));
    return sameDay ? `${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}` : null;
  };

  const max = Math.max(income, expense, 1);
  const transfers = day?.transfers ?? 0;

  if (!day || day.count === 0) {
    return (
      <div className="text-center py-8 px-3 rounded-2xl border border-dashed border-slate-200 bg-white/60">
        <span className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
          <CalendarX2 className="w-6 h-6" />
        </span>
        <p className="text-sm font-bold text-slate-700">Không có giao dịch nào</p>
        <p className="text-xs text-slate-500 mt-1">Ngày {shortDate(date)} chưa có khoản thu chi nào được ghi.</p>
        {onAdd && <AddButton onAdd={onAdd} className="mt-4" />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Còn lại sau thu & chi */}
      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-500">Còn lại sau thu &amp; chi</p>
        <p
          id="day-detail-net"
          className={`font-display font-black text-2xl mt-0.5 ${net > 0 ? 'text-blue-700' : net < 0 ? 'text-rose-600' : 'text-slate-500'}`}
        >
          {hidden ? format(net) : signed(animatedNet)}
        </p>

        <div className="mt-3 space-y-2">
          <MeterRow id="day-detail-income" name="Thu" amount={income} ratio={income / max} sign="+" bar="bg-emerald-500" text="text-emerald-700" />
          <MeterRow id="day-detail-expense" name="Chi" amount={expense} ratio={expense / max} sign="−" bar="bg-rose-500" text="text-rose-600" />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">Lũy kế tháng đến ngày này</span>
          <span id="day-detail-cumulative" className={`font-bold whitespace-nowrap ${cumulative >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
            {signed(cumulative)}
          </span>
        </div>
        {transfers > 0 && (
          <p className="mt-2 text-[11px] text-slate-400">Có {transfers} lần chuyển quỹ — chỉ chuyển tiền giữa các quỹ nên không tính vào thu/chi.</p>
        )}
      </div>

      {/* Chi theo mục đích */}
      {categories.length > 0 && (
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Chi theo mục đích</h4>
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.name}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-700 truncate">{c.name}</span>
                  <span className="font-bold text-slate-800 whitespace-nowrap">
                    {format(c.value)} <span className="text-slate-400 font-semibold">· {Math.round((c.value / expense) * 100)}%</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-rose-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.value / categories[0].value) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách giao dịch */}
      <div>
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Giao dịch ({transactions.length})</h4>
        <div className="divide-y divide-slate-100">
          {transactions.map((tx, i) => {
            const time = timeOf(tx);
            return (
              <motion.button
                key={tx.id}
                id={`day-tx-${tx.id}`}
                type="button"
                onClick={() => onEditTransaction(tx)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer"
                title="Chạm để sửa giao dịch"
              >
                <TxTypeIcon type={tx.type} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800 truncate">{tx.category}</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 min-w-0">
                    {tx.type === 'transfer' ? (
                      <>
                        <span className="truncate">{fundName(tx.fundId)}</span>
                        <ArrowRight className="w-3 h-3 shrink-0 text-indigo-400" />
                        <span className="truncate">{fundName(tx.toFundId)}</span>
                      </>
                    ) : (
                      <span className="truncate">{fundName(tx.fundId)}</span>
                    )}
                    {time && <span className="shrink-0">· {time}</span>}
                  </span>
                  {tx.notes && <span className="block text-[11px] text-slate-400 italic truncate">“{tx.notes}”</span>}
                </span>
                <span className={`text-sm font-bold whitespace-nowrap ${txAmountClass(tx.type)}`}>
                  {txSign(tx.type)}
                  {format(tx.amount)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {onAdd && <AddButton onAdd={onAdd} />}
    </div>
  );
}

function MeterRow({ id, name, amount, ratio, sign, bar, text }: { id: string; name: string; amount: number; ratio: number; sign: string; bar: string; text: string }) {
  const { format } = usePrivacy();
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-7 text-xs font-bold text-slate-500">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-white border border-slate-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(amount > 0 ? 3 : 0, ratio * 100)}%` }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      </div>
      <span id={id} className={`text-xs font-bold whitespace-nowrap min-w-[92px] text-right ${text}`}>
        {amount > 0 ? `${sign}${format(amount)}` : format(0)}
      </span>
    </div>
  );
}

function AddButton({ onAdd, className = '' }: { onAdd: () => void; className?: string }) {
  return (
    <button
      id="day-detail-add-btn"
      type="button"
      onClick={onAdd}
      className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-indigo-300 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-50 text-sm font-bold transition-colors cursor-pointer ${className}`}
    >
      <Plus className="w-4 h-4" /> Ghi chép cho ngày này
    </button>
  );
}
