import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { ArrowLeftRight } from 'lucide-react';
import { usePrivacy } from '../../PrivacyContext';
import { fullDateLabel, parseISODateLocal } from '../../utils';
import { DaySummary, MonthSummary, buildMonthGrid, heatLevel, signedShort } from './calendarData';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Thang màu phân kỳ (đã đo): xanh dương = thu nhiều hơn chi, hồng = chi nhiều hơn thu, xám = cân bằng.
// Mức đậm 3–4 phân biệt được cả với người mù màu đỏ–lục; mức nhạt dựa thêm vào dấu +/− trên ô.
// Chữ trên mọi nền đạt tương phản >= 4.5:1.
export const HEAT: Record<number, { bg: string; ink: string }> = {
  [-4]: { bg: 'bg-rose-400', ink: 'text-rose-950' },
  [-3]: { bg: 'bg-rose-300', ink: 'text-rose-900' },
  [-2]: { bg: 'bg-rose-200', ink: 'text-rose-900' },
  [-1]: { bg: 'bg-rose-50', ink: 'text-rose-900' },
  0: { bg: 'bg-slate-100', ink: 'text-slate-600' },
  1: { bg: 'bg-blue-50', ink: 'text-blue-900' },
  2: { bg: 'bg-blue-200', ink: 'text-blue-900' },
  3: { bg: 'bg-blue-300', ink: 'text-blue-900' },
  4: { bg: 'bg-blue-400', ink: 'text-blue-950' },
};
const LEGEND_LEVELS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

interface MonthCalendarProps {
  month: string;
  summary: MonthSummary;
  today: string;
  /** Ngày cuối cùng xem được (thường là hôm nay); các ngày sau đó bị khóa */
  lastDate: string;
  selectedDate: string | null;
  direction: number;
  onSelect: (date: string) => void;
  onSwipe: (delta: 1 | -1) => void;
  canPrev: boolean;
  canNext: boolean;
}

export default function MonthCalendar({ month, summary, today, lastDate, selectedDate, direction, onSelect, onSwipe, canPrev, canNext }: MonthCalendarProps) {
  const reduceMotion = !!useReducedMotion();
  const cells = buildMonthGrid(month);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    const goNext = info.offset.x < -60 || info.velocity.x < -500;
    const goPrev = info.offset.x > 60 || info.velocity.x > 500;
    if (goNext && canNext) onSwipe(1);
    else if (goPrev && canPrev) onSwipe(-1);
  };

  return (
    <div id="report-calendar">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d} className={`text-center text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${d === 'CN' ? 'text-slate-600' : 'text-slate-400'}`}>
            {d}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={month}
          custom={direction}
          variants={{
            enter: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * 48 }),
            center: { opacity: 1, x: 0 },
            exit: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * -48 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          dragSnapToOrigin
          onDragEnd={handleDragEnd}
          className="grid grid-cols-7 gap-1 sm:gap-1.5"
          aria-label="Lịch thu chi theo ngày"
        >
          {cells.map((date, i) =>
            date ? (
              <DayCell
                key={date}
                date={date}
                index={i}
                column={i % 7}
                day={summary.days.get(date)}
                level={heatLevel(summary.days.get(date)?.net ?? 0, summary.maxGain, summary.maxLoss)}
                isToday={date === today}
                isFuture={date > lastDate}
                selected={date === selectedDate}
                reduceMotion={reduceMotion}
                onSelect={onSelect}
              />
            ) : (
              <span key={`blank-${i}`} aria-hidden />
            ),
          )}
        </motion.div>
      </AnimatePresence>

      {/* Chú giải màu */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span>Chi &gt; thu</span>
          <span className="flex gap-0.5" aria-hidden>
            {LEGEND_LEVELS.map((l) => (
              <span key={l} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[4px] ${HEAT[l].bg} ${l === 0 ? 'ring-1 ring-inset ring-slate-200' : ''}`} />
            ))}
          </span>
          <span>Thu &gt; chi</span>
        </div>
        <p className="text-[11px] text-slate-400">Số trên ô = thu − chi trong ngày (không tính chuyển quỹ)</p>
      </div>
    </div>
  );
}

interface DayCellProps {
  date: string;
  index: number;
  column: number;
  day?: DaySummary;
  level: number;
  isToday: boolean;
  isFuture: boolean;
  selected: boolean;
  reduceMotion: boolean;
  onSelect: (date: string) => void;
}

function DayCell({ date, index, column, day, level, isToday, isFuture, selected, reduceMotion, onSelect }: DayCellProps) {
  const { hidden, format } = usePrivacy();
  const has = !!day && day.count > 0;
  const heat = has ? HEAT[level] : null;
  const dayNum = Number(date.slice(8));
  const label = fullDateLabel(parseISODateLocal(date));
  const netText = (v: number) => (v === 0 ? format(0) : `${v > 0 ? '+' : '−'}${format(Math.abs(v))}`);
  const ariaLabel = !has
    ? `${label}: không có giao dịch`
    : hidden
      ? `${label}: ${day.count} giao dịch`
      : `${label}: thu ${format(day.income)}, chi ${format(day.expense)}, còn lại ${netText(day.net)}`;

  return (
    <motion.button
      type="button"
      id={`cal-day-${date}`}
      data-net={has ? day.net : undefined}
      disabled={isFuture}
      onClick={() => onSelect(date)}
      aria-pressed={selected}
      aria-label={ariaLabel}
      initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, delay: reduceMotion ? 0 : Math.min(index * 0.012, 0.45) }}
      whileTap={isFuture ? undefined : { scale: 0.92 }}
      className={`group relative hover:z-20 focus-visible:z-20 h-14 sm:h-[72px] lg:h-[84px] min-w-0 rounded-lg sm:rounded-xl p-1 sm:p-2 flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors duration-300 ${
        heat ? heat.bg : isFuture ? 'bg-white/30' : 'bg-white/70 hover:bg-white'
      } ${isFuture ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {selected && (
        <motion.span
          layoutId="calendar-selected-ring"
          className="absolute -inset-[3px] rounded-[11px] sm:rounded-[15px] border-2 border-slate-900 pointer-events-none"
          transition={{ type: 'spring', stiffness: 520, damping: 38 }}
        />
      )}

      <span className="flex items-start justify-between gap-0.5">
        <span
          className={`text-[11px] sm:text-sm font-bold leading-none ${
            isToday
              ? 'flex items-center justify-center w-[18px] h-[18px] sm:w-6 sm:h-6 -m-0.5 sm:-m-1 rounded-full bg-indigo-600 text-white'
              : isFuture
                ? 'text-slate-300'
                : heat
                  ? 'text-slate-800'
                  : 'text-slate-500'
          }`}
        >
          {dayNum}
        </span>
        {has && heat && (
          <>
            <span className={`sm:hidden flex gap-[2px] pt-[2px] ${heat.ink}`} aria-hidden>
              {Array.from({ length: Math.min(day.count, 3) }).map((_, k) => (
                <span key={k} className="w-1 h-1 rounded-full bg-current opacity-70" />
              ))}
            </span>
            <span className={`hidden sm:flex items-center gap-0.5 text-[10px] font-semibold ${heat.ink}`}>
              {day.transfers > 0 && <ArrowLeftRight className="w-3 h-3" aria-hidden />}
              {day.count} GD
            </span>
          </>
        )}
      </span>

      {has && heat && (
        <span className={`mt-auto font-bold leading-tight whitespace-nowrap text-[9.5px] sm:text-xs lg:text-[13px] ${heat.ink}`}>
          {hidden ? (
            '•••'
          ) : (
            <>
              <span className="sm:hidden">{signedShort(day.net, true)}</span>
              <span className="hidden sm:inline">{signedShort(day.net)}</span>
            </>
          )}
        </span>
      )}

      {/* Xem nhanh khi rê chuột (máy tính) */}
      {has && !hidden && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-30 bottom-full mb-2 hidden lg:group-hover:block lg:group-focus-visible:block w-max min-w-[168px] rounded-xl bg-slate-900/95 text-white px-3 py-2.5 shadow-xl ${
            column <= 1 ? 'left-0' : column >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2'
          }`}
        >
          <span className="block text-[11px] font-semibold text-slate-300 mb-1.5">{label}</span>
          <TooltipRow keyClass="bg-emerald-400" value={day.income > 0 ? `+${format(day.income)}` : format(0)} name="Thu" />
          <TooltipRow keyClass="bg-rose-400" value={day.expense > 0 ? `−${format(day.expense)}` : format(0)} name="Chi" />
          <span className="flex items-baseline justify-between gap-4 mt-1.5 pt-1.5 border-t border-white/15">
            <span className="text-[11px] text-slate-300">Còn lại</span>
            <span className="text-sm font-black">{netText(day.net)}</span>
          </span>
          {day.transfers > 0 && <span className="block mt-1 text-[10px] text-slate-400">{day.transfers} lần chuyển quỹ (không tính)</span>}
        </span>
      )}
    </motion.button>
  );
}

function TooltipRow({ keyClass, value, name }: { keyClass: string; value: string; name: string }) {
  return (
    <span className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
        <span className={`w-2.5 h-0.5 rounded-full ${keyClass}`} />
        {name}
      </span>
      <span className="text-xs font-bold">{value}</span>
    </span>
  );
}
