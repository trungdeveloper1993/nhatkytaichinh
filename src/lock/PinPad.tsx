import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  idPrefix: string;
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  /** Tăng số này để rung các chấm (nhập sai) */
  shakeKey?: number;
  /** Nhận phím số từ bàn phím máy tính */
  active?: boolean;
  success?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

// Ô nhập mã PIN: chấm tròn + bàn phím số lớn (giống app ngân hàng)
export default function PinPad({ idPrefix, length, value, onChange, onComplete, disabled, shakeKey = 0, active = true, success }: PinPadProps) {
  const reduceMotion = useReducedMotion();
  const valueRef = useRef(value);
  valueRef.current = value;

  const press = (key: string) => {
    if (disabled) return;
    const current = valueRef.current;
    if (key === 'back') {
      onChange(current.slice(0, -1));
      return;
    }
    if (current.length >= length) return;
    const next = current + key;
    valueRef.current = next;
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const pressRef = useRef(press);
  pressRef.current = press;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pressRef.current(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        pressRef.current('back');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={shakeKey}
        id={`${idPrefix}-dots`}
        className="flex items-center justify-center gap-3.5 h-6"
        initial={{ x: 0 }}
        animate={shakeKey && !reduceMotion ? { x: [0, -12, 12, -9, 9, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.42 }}
        aria-live="polite"
        aria-label={`Đã nhập ${value.length} trên ${length} số`}
      >
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return (
            <motion.span
              key={i}
              animate={{ scale: filled ? 1 : 0.8 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                success ? 'bg-emerald-500 border-emerald-500' : filled ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-transparent'
              }`}
            />
          );
        })}
      </motion.div>

      <div className="mt-7 grid grid-cols-3 gap-x-5 gap-y-3.5">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <motion.button
              key={key}
              id={`${idPrefix}-key-${key}`}
              type="button"
              onClick={() => press(key)}
              disabled={disabled}
              whileTap={disabled ? undefined : { scale: 0.88 }}
              aria-label={key === 'back' ? 'Xóa số vừa nhập' : `Số ${key}`}
              className={`w-[68px] h-[68px] rounded-full flex items-center justify-center select-none transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default ${
                key === 'back'
                  ? 'text-slate-500 hover:bg-white/60'
                  : 'bg-white/80 border border-white shadow-sm text-slate-900 text-2xl font-display font-semibold hover:bg-white'
              }`}
            >
              {key === 'back' ? <Delete className="w-6 h-6" /> : key}
            </motion.button>
          ),
        )}
      </div>
    </div>
  );
}
