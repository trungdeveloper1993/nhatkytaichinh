import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { FUND_COLORS, Transaction } from '../../types';

// Tiêu đề trang cho mobile (desktop đã có tiêu đề ở thanh trên cùng)
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`flex items-end justify-between gap-3 mb-4 sm:mb-5 ${actions ? '' : 'lg:hidden'}`}>
      <div className="lg:hidden min-w-0">
        <h1 className="font-display font-black text-2xl text-slate-900 leading-tight">{title}</h1>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 lg:ml-auto">{actions}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  icon,
  action,
  children,
  className = '',
  bodyClassName,
  id,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`bg-white/75 backdrop-blur-xl border border-white rounded-2xl shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
          <h2 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2 min-w-0">
            {icon}
            <span className="truncate">{title}</span>
          </h2>
          {action}
        </div>
      )}
      <div className={bodyClassName ?? 'px-4 sm:px-5 pb-4'}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">{icon}</div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {message && <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function FundDot({ color, className = '' }: { color: string; className?: string }) {
  const scheme = FUND_COLORS.find((c) => c.value === color) || FUND_COLORS[0];
  return <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${scheme.activeBg} ${className}`} />;
}

const TX_STYLE: Record<Transaction['type'], { bg: string; text: string; sign: string; Icon: typeof ArrowDownLeft }> = {
  expense: { bg: 'bg-rose-50 text-rose-600', text: 'text-rose-600', sign: '-', Icon: ArrowDownLeft },
  income: { bg: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', sign: '+', Icon: ArrowUpRight },
  transfer: { bg: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-600', sign: '', Icon: ArrowLeftRight },
};

export function TxTypeIcon({ type }: { type: Transaction['type'] }) {
  const { bg, Icon } = TX_STYLE[type];
  return (
    <span className={`flex w-9 h-9 rounded-xl items-center justify-center shrink-0 ${bg}`}>
      <Icon className="w-4 h-4" />
    </span>
  );
}

export function txAmountClass(type: Transaction['type']) {
  return TX_STYLE[type].text;
}

export function txSign(type: Transaction['type']) {
  return TX_STYLE[type].sign;
}

// Thanh tiến độ nhỏ (hạn mức, trần quỹ)
export function ProgressBar({ ratio, tone }: { ratio: number; tone?: 'indigo' | 'amber' | 'rose' | 'emerald' }) {
  const auto = ratio >= 1 ? 'rose' : ratio >= 0.8 ? 'amber' : 'indigo';
  const t = tone || auto;
  const color = { indigo: 'bg-indigo-500', amber: 'bg-amber-500', rose: 'bg-rose-500', emerald: 'bg-emerald-500' }[t];
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }} />
    </div>
  );
}

// Lớp CSS dùng chung cho ô nhập / select để thống nhất giao diện
export const inputClass = (invalid?: boolean) =>
  `w-full px-3.5 py-2.5 rounded-xl border bg-white text-base sm:text-sm font-medium text-slate-800 outline-hidden transition-all focus:ring-4 ${
    invalid ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
  }`;

export const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5';

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1 font-semibold">{message}</p>;
}
