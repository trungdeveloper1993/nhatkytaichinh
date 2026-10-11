import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { numberToVietnameseWords } from '../../utils';

interface MoneyInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  invalid?: boolean;
  size?: 'md' | 'lg';
  toneClass?: string; // màu chữ số tiền, vd 'text-red-600'
  quickAmounts?: number[]; // các nút cộng nhanh
  showWords?: boolean; // hiện dòng "Bằng chữ"
  autoFocus?: boolean;
  ariaLabel?: string;
}

const MAX_DIGITS = 15;

const formatDigits = (n: number) => (n > 0 ? n.toLocaleString('vi-VN') : '');

const chipLabel = (n: number) => (n >= 1e6 ? `+${n / 1e6}TR` : `+${n / 1e3}K`);

export const DEFAULT_QUICK_AMOUNTS = [10000, 50000, 100000, 500000, 1000000];

export default function MoneyInput({
  id,
  value,
  onChange,
  placeholder = '0',
  invalid,
  size = 'md',
  toneClass = 'text-slate-900',
  quickAmounts,
  showWords,
  autoFocus,
  ariaLabel,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    // Số chữ số đứng trước con trỏ, để đặt lại con trỏ đúng chỗ sau khi định dạng
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length;
    const digits = raw.replace(/\D/g, '').slice(0, MAX_DIGITS);
    const next = digits ? Number(digits) : 0;
    onChange(next);

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input || document.activeElement !== input) return;
      const formatted = formatDigits(next);
      let pos = 0;
      let count = 0;
      while (pos < formatted.length && count < digitsBeforeCaret) {
        if (/\d/.test(formatted[pos])) count++;
        pos++;
      }
      input.setSelectionRange(pos, pos);
    });
  };

  const sizeClass = size === 'lg' ? 'text-2xl py-3.5 pl-4 pr-20 rounded-2xl' : 'text-base py-2.5 pl-3.5 pr-16 rounded-xl';

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={formatDigits(value)}
          onChange={handleChange}
          className={`w-full border bg-white font-mono font-bold tabular-nums outline-hidden transition-all focus:ring-4 ${sizeClass} ${toneClass} ${
            invalid
              ? 'border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
          }`}
        />
        <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
          {value > 0 && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                onChange(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Xóa số tiền"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className={`font-bold text-slate-400 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>₫</span>
        </div>
      </div>

      {quickAmounts && quickAmounts.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => onChange(Math.min(value + amt, 999_999_999_999_999))}
              className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-100 transition-colors cursor-pointer"
            >
              {chipLabel(amt)}
            </button>
          ))}
        </div>
      )}

      {showWords && value > 0 && (
        <p className="mt-1.5 text-xs text-slate-500 italic leading-snug">Bằng chữ: {numberToVietnameseWords(value)}</p>
      )}
    </div>
  );
}
