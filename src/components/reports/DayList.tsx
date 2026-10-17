import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { usePrivacy } from '../../PrivacyContext';
import { friendlyDayLabel, parseISODateLocal } from '../../utils';
import { MonthSummary, heatLevel } from './calendarData';
import { HEAT } from './MonthCalendar';

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Dạng danh sách của lịch: mỗi ngày có giao dịch một dòng (dễ đọc số liệu, hợp trình đọc màn hình)
export default function DayList({ summary, selectedDate, onSelect }: { summary: MonthSummary; selectedDate: string | null; onSelect: (date: string) => void }) {
  const { format, compact } = usePrivacy();
  const days = [...summary.days.values()].sort((a, b) => b.date.localeCompare(a.date));
  const signed = (v: number) => (v === 0 ? format(0) : `${v > 0 ? '+' : '−'}${format(Math.abs(v))}`);

  if (days.length === 0) {
    return <p className="text-center py-10 text-sm font-semibold text-slate-500">Tháng này chưa có giao dịch nào.</p>;
  }

  return (
    <div id="report-day-list" className="divide-y divide-slate-100 -mx-1">
      {days.map((d, i) => {
        const heat = HEAT[heatLevel(d.net, summary.maxGain, summary.maxLoss)];
        const date = parseISODateLocal(d.date);
        return (
          <motion.button
            key={d.date}
            id={`cal-list-${d.date}`}
            type="button"
            onClick={() => onSelect(d.date)}
            aria-pressed={selectedDate === d.date}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.4) }}
            className={`w-full flex items-center gap-3 px-1 py-2.5 text-left rounded-xl transition-colors cursor-pointer ${selectedDate === d.date ? 'bg-indigo-50/70' : 'hover:bg-white/80'}`}
          >
            <span className={`w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center ${heat.bg} ${heat.ink}`}>
              <span className="text-sm font-black leading-none">{date.getDate()}</span>
              <span className="text-[9px] font-bold mt-0.5">{WEEKDAY_SHORT[date.getDay()]}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800 truncate">{friendlyDayLabel(d.date)}</span>
              <span className="block text-[11px] text-slate-500 truncate">
                {d.count} giao dịch
                {d.income > 0 && (
                  <>
                    {' · '}thu <span className="text-emerald-700 font-semibold">+{compact(d.income)}</span>
                  </>
                )}
                {d.expense > 0 && (
                  <>
                    {' · '}chi <span className="text-rose-600 font-semibold">−{compact(d.expense)}</span>
                  </>
                )}
                {d.transfers > 0 && <> · {d.transfers} chuyển quỹ</>}
              </span>
            </span>
            <span className={`text-sm font-bold whitespace-nowrap ${d.net > 0 ? 'text-blue-700' : d.net < 0 ? 'text-rose-600' : 'text-slate-500'}`}>{signed(d.net)}</span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </motion.button>
        );
      })}
    </div>
  );
}
