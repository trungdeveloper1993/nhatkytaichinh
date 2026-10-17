import { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, List, Loader2, Flame, Gauge } from 'lucide-react';
import { Fund, Transaction } from '../types';
import { usePrivacy } from '../PrivacyContext';
import { useCountUp, useMediaQuery, usePersistentState } from '../hooks';
import { sortTransactionsDesc, toISODate, toMonthKey } from '../ledger';
import { formatMonthYear, fullDateLabel, parseISODateLocal } from '../utils';
import { NAV_BY_KEY } from '../nav';
import { PageHeader } from '../components/ui/primitives';
import Sheet from '../components/ui/Sheet';
import MonthCalendar from '../components/reports/MonthCalendar';
import DayList from '../components/reports/DayList';
import DayDetail from '../components/reports/DayDetail';
import { cumulativeNet, daysInMonth, shiftDay, shiftMonth, summarizeMonth } from '../components/reports/calendarData';

// Biểu đồ (recharts) nặng -> tải sau, lịch hiện ngay
const FinancialCharts = lazy(() => import('../components/FinancialCharts'));

interface ReportsPageProps {
  funds: Fund[];
  transactions: Transaction[];
  onEditTransaction: (tx: Transaction) => void;
  onAddForDate: (date: string) => void;
}

const VIEW_KEY = 'nhat_ky_tai_chinh_report_view';

export default function ReportsPage({ funds, transactions, onEditTransaction, onAddForDate }: ReportsPageProps) {
  const nav = NAV_BY_KEY.reports;
  const { format } = usePrivacy();
  const today = toISODate();
  const currentMonth = toMonthKey();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [month, setMonth] = useState(currentMonth);
  const [direction, setDirection] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [dayDirection, setDayDirection] = useState(0);
  const [view, setView] = usePersistentState<'calendar' | 'list'>(VIEW_KEY, 'calendar');

  // Ngày cuối cùng có thể xem (hôm nay, hoặc ngày giao dịch muộn nhất nếu có)
  const lastDate = useMemo(() => transactions.reduce((max, t) => (t.date > max ? t.date : max), today), [transactions, today]);

  // Các tháng chọn được: từ tháng có giao dịch sớm nhất tới tháng muộn nhất (gồm cả tháng không có giao dịch)
  const { minMonth, maxMonth, monthOptions } = useMemo(() => {
    let min = currentMonth;
    for (const t of transactions) if (t.date.slice(0, 7) < min) min = t.date.slice(0, 7);
    const max = lastDate.slice(0, 7);
    const options: string[] = [];
    for (let m = max; m >= min && options.length < 240; m = shiftMonth(m, -1)) options.push(m);
    return { minMonth: min, maxMonth: max, monthOptions: options };
  }, [transactions, currentMonth, lastDate]);

  const summary = useMemo(() => summarizeMonth(transactions, month), [transactions, month]);

  const changeMonth = (next: string) => {
    if (next === month) return;
    setDirection(next > month ? 1 : -1);
    setMonth(next);
    setSelected(null);
  };

  // Ngày hiện sẵn ở panel máy tính: hôm nay / ngày gần nhất có giao dịch / ngày 1
  const defaultDay = useMemo(() => {
    if (month === currentMonth) return today;
    const days = [...summary.days.keys()].sort();
    return days[days.length - 1] ?? `${month}-01`;
  }, [month, currentMonth, today, summary]);

  const activeDay = selected ?? (isDesktop ? defaultDay : null);
  // Giữ nội dung sheet khi đang trượt đóng
  const lastSheetDay = useRef<string | null>(null);
  if (selected) lastSheetDay.current = selected;
  const sheetDay = selected ?? lastSheetDay.current;

  const selectDay = (date: string) => {
    const from = selected ?? activeDay;
    setDayDirection(from ? (date > from ? 1 : -1) : 0);
    const m = date.slice(0, 7);
    if (m !== month) {
      setDirection(m > month ? 1 : -1);
      setMonth(m);
    }
    setSelected(date);
  };

  const detailDay = isDesktop ? activeDay : sheetDay;
  const dayTransactions = useMemo(
    () => (detailDay ? sortTransactionsDesc(transactions.filter((t) => t.date === detailDay)) : []),
    [transactions, detailDay],
  );
  const detailSummary = useMemo(
    () => (detailDay && detailDay.slice(0, 7) !== month ? summarizeMonth(transactions, detailDay.slice(0, 7)) : summary),
    [detailDay, month, summary, transactions],
  );

  // Trung bình chi mỗi ngày (tính trên số ngày đã qua của tháng)
  const elapsedDays = month < currentMonth ? daysInMonth(month) : month === currentMonth ? Number(today.slice(8)) : 0;
  const avgDaily = elapsedDays > 0 ? Math.round(summary.expense / elapsedDays) : 0;
  const biggest = summary.biggestSpendDay;

  const renderDetail = (date: string, showTitle: boolean) => (
    <DayDetail
      date={date}
      day={detailSummary.days.get(date)}
      cumulative={cumulativeNet(detailSummary, date)}
      transactions={dayTransactions}
      funds={funds}
      direction={dayDirection}
      isToday={date === today}
      canNext={shiftDay(date, 1) <= lastDate}
      onPrev={() => selectDay(shiftDay(date, -1))}
      onNext={() => selectDay(shiftDay(date, 1))}
      onEditTransaction={onEditTransaction}
      onAdd={date <= today ? () => onAddForDate(date) : undefined}
      showTitle={showTitle}
    />
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title={nav.label} description={nav.description} />

      {/* Thanh chọn tháng: áp dụng cho toàn bộ trang */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          id="report-prev-month-btn"
          type="button"
          onClick={() => changeMonth(shiftMonth(month, -1))}
          disabled={month <= minMonth}
          aria-label="Tháng trước"
          className="p-2 rounded-xl bg-white/80 border border-white text-slate-600 hover:text-indigo-600 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <label className="relative min-w-0">
          <span className="sr-only">Chọn tháng xem báo cáo</span>
          <select
            id="report-month-select"
            value={month}
            onChange={(e) => changeMonth(e.target.value)}
            className="appearance-none bg-transparent font-display font-black text-lg sm:text-xl text-slate-900 pl-1 pr-6 py-1 rounded-lg cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {formatMonthYear(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </label>
        <button
          id="report-next-month-btn"
          type="button"
          onClick={() => changeMonth(shiftMonth(month, 1))}
          disabled={month >= maxMonth}
          aria-label="Tháng sau"
          className="p-2 rounded-xl bg-white/80 border border-white text-slate-600 hover:text-indigo-600 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        {month !== currentMonth && (
          <button
            id="report-this-month-btn"
            type="button"
            onClick={() => changeMonth(currentMonth)}
            className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            Tháng này
          </button>
        )}
      </div>

      {/* Tổng tháng */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KpiTile id="report-kpi-income" label="Tổng thu" value={summary.income} tone="text-emerald-600" sign="+" />
        <KpiTile id="report-kpi-expense" label="Tổng chi" value={summary.expense} tone="text-rose-600" sign="−" />
        <KpiTile
          id="report-kpi-net"
          label="Còn lại"
          hint="thu − chi"
          value={summary.net}
          tone={summary.net >= 0 ? 'text-blue-700' : 'text-rose-600'}
          sign={summary.net > 0 ? '+' : summary.net < 0 ? '−' : ''}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5 lg:items-start">
        <section className="bg-white/75 backdrop-blur-xl border border-white rounded-2xl shadow-sm p-2.5 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3 pl-1">
            <h2 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" /> Lịch thu chi
            </h2>
            <div className="flex p-1 rounded-xl bg-slate-100/80" role="group" aria-label="Kiểu hiển thị">
              {(
                [
                  { key: 'calendar', label: 'Lịch', Icon: CalendarDays },
                  { key: 'list', label: 'Danh sách', Icon: List },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  id={`report-view-${key}-btn`}
                  type="button"
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  aria-label={label}
                  title={label}
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    view === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {view === 'calendar' ? (
            <MonthCalendar
              month={month}
              summary={summary}
              today={today}
              lastDate={lastDate}
              selectedDate={activeDay}
              direction={direction}
              onSelect={selectDay}
              onSwipe={(delta) => changeMonth(shiftMonth(month, delta))}
              canPrev={month > minMonth}
              canNext={month < maxMonth}
            />
          ) : (
            <DayList summary={summary} selectedDate={activeDay} onSelect={selectDay} />
          )}

          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 min-w-0 rounded-xl bg-slate-50 px-2.5 py-2">
              <Gauge className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TB chi mỗi ngày</p>
                <p id="report-avg-daily" className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  {format(avgDaily)}
                </p>
              </div>
            </div>
            {biggest ? (
              <button
                id="report-biggest-day-btn"
                type="button"
                onClick={() => selectDay(biggest.date)}
                className="flex items-center gap-2 min-w-0 rounded-xl bg-rose-50/70 hover:bg-rose-50 px-2.5 py-2 text-left transition-colors cursor-pointer"
              >
                <Flame className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Chi nhiều nhất</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {biggest.date.slice(8)}/{biggest.date.slice(5, 7)} · −{format(biggest.expense)}
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
                <Flame className="w-4 h-4 text-slate-300 shrink-0" />
                <p className="text-xs font-semibold text-slate-400">Chưa có khoản chi</p>
              </div>
            )}
          </div>
        </section>

        {/* Máy tính: chi tiết ngày luôn hiện bên phải */}
        {isDesktop && activeDay && (
          <aside id="day-detail-panel" className="sticky top-[92px] bg-white/75 backdrop-blur-xl border border-white rounded-2xl shadow-sm p-4 max-h-[calc(100dvh-110px)] overflow-y-auto">
            {renderDetail(activeDay, true)}
          </aside>
        )}
      </div>

      {/* Điện thoại: chạm vào ngày để mở chi tiết */}
      {!isDesktop && (
        <Sheet
          open={!!selected}
          onClose={() => setSelected(null)}
          id="day-detail-sheet"
          title={sheetDay ? fullDateLabel(parseISODateLocal(sheetDay)) : ''}
          subtitle={sheetDay === today ? 'Hôm nay' : 'Chi tiết thu chi trong ngày'}
          icon={
            <span className="flex p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <CalendarDays className="w-5 h-5" />
            </span>
          }
        >
          {sheetDay && renderDetail(sheetDay, false)}
        </Sheet>
      )}

      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Đang tải biểu đồ...
          </div>
        }
      >
        <FinancialCharts transactions={transactions} funds={funds} month={month} />
      </Suspense>
    </div>
  );
}

function KpiTile({ id, label, hint, value, tone, sign }: { id: string; label: string; hint?: string; value: number; tone: string; sign: string }) {
  const { format, compact } = usePrivacy();
  const animated = Math.abs(useCountUp(value));
  return (
    <div className="bg-white/75 backdrop-blur-xl border border-white rounded-2xl shadow-sm px-2.5 py-2.5 sm:px-4 sm:py-3 min-w-0">
      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
        {label}
        {hint && <span className="hidden sm:inline normal-case tracking-normal font-semibold text-slate-400"> · {hint}</span>}
      </p>
      <p id={id} data-value={value} className={`font-display font-bold text-[13px] min-[380px]:text-sm sm:text-xl mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis ${tone}`}>
        <span className="sm:hidden">
          {sign}
          {compact(animated)}
        </span>
        <span className="hidden sm:inline">
          {sign}
          {format(animated)}
        </span>
      </p>
    </div>
  );
}
