import { useEffect, useState } from 'react';
import { KeyRound, ShieldAlert, Download } from 'lucide-react';
import Sheet from '../components/ui/Sheet';
import PinPad from './PinPad';
import { useAppLock } from './AppLock';
import { DEFAULT_AUTO_LOCK, MAX_FREE_ATTEMPTS, PinLength, readAttempts, recordFailedAttempt, resetAttempts } from './pin';

export type PinSheetMode = 'create' | 'change' | 'disable';
type Step = 'current' | 'new' | 'confirm';

interface PinSetupSheetProps {
  mode: PinSheetMode | null;
  onClose: () => void;
  onDone: (message: string) => void;
  needsBackup: boolean;
  onBackup: () => void;
}

const TITLES: Record<PinSheetMode, string> = {
  create: 'Tạo mã PIN',
  change: 'Đổi mã PIN',
  disable: 'Tắt khóa bằng mã PIN',
};

// Tạo / đổi / tắt mã PIN theo từng bước, dùng chung bàn phím số với màn hình khóa
export default function PinSetupSheet({ mode, onClose, onDone, needsBackup, onBackup }: PinSetupSheetProps) {
  const lock = useAppLock();
  const [step, setStep] = useState<Step>('new');
  const [length, setLength] = useState<PinLength>(6);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastMode, setLastMode] = useState<PinSheetMode>('create');

  // Mỗi lần mở sheet thì bắt đầu lại từ bước đầu
  useEffect(() => {
    if (!mode) return;
    setLastMode(mode);
    setStep(mode === 'create' ? 'new' : 'current');
    setLength(mode === 'create' ? 6 : lock.length);
    setPin('');
    setFirstPin('');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const shown = mode ?? lastMode;
  const padLength = step === 'current' ? lock.length : length;

  const fail = (message: string) => {
    setError(message);
    setShake((s) => s + 1);
    setPin('');
    navigator.vibrate?.(150);
  };

  const handleComplete = async (value: string) => {
    if (busy) return;
    if (step === 'current') {
      const attempts = readAttempts();
      if (attempts.until > Date.now()) {
        fail(`Nhập sai quá nhiều lần. Thử lại sau ${Math.ceil((attempts.until - Date.now()) / 1000)} giây.`);
        return;
      }
      setBusy(true);
      const ok = await lock.verify(value);
      setBusy(false);
      if (!ok) {
        const next = recordFailedAttempt();
        fail(next.until > Date.now() ? 'Nhập sai quá nhiều lần, hãy thử lại sau.' : `Mã PIN hiện tại không đúng (còn ${Math.max(0, MAX_FREE_ATTEMPTS - next.failed)} lần thử).`);
        return;
      }
      resetAttempts();
      if (shown === 'disable') {
        lock.disable();
        onDone('Đã tắt khóa bằng mã PIN');
        return;
      }
      setStep('new');
      setPin('');
      setError(null);
      return;
    }
    if (step === 'new') {
      setFirstPin(value);
      setStep('confirm');
      setPin('');
      setError(null);
      return;
    }
    // Bước xác nhận
    if (value !== firstPin) {
      setStep('new');
      setFirstPin('');
      fail('Hai lần nhập không khớp. Hãy nhập lại mã PIN mới.');
      return;
    }
    setBusy(true);
    try {
      if (shown === 'create') await lock.enable(value, length, DEFAULT_AUTO_LOCK);
      else await lock.changePin(value, length);
      onDone(shown === 'create' ? 'Đã bật khóa bằng mã PIN 🔒' : 'Đã đổi mã PIN');
    } catch {
      fail('Không lưu được mã PIN. Hãy thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const prompt =
    step === 'current' ? 'Nhập mã PIN hiện tại' : step === 'new' ? 'Nhập mã PIN mới' : 'Nhập lại mã PIN để xác nhận';

  return (
    <Sheet
      open={mode !== null}
      onClose={onClose}
      id="pin-setup-sheet"
      size="sm"
      title={TITLES[shown]}
      subtitle={prompt}
      icon={
        <span className="flex p-2 rounded-xl bg-indigo-50 text-indigo-600">
          <KeyRound className="w-5 h-5" />
        </span>
      }
    >
      {step === 'new' && (
        <div className="flex justify-center mb-5">
          <div className="flex p-1 rounded-xl bg-slate-100" role="group" aria-label="Độ dài mã PIN">
            {([4, 6] as const).map((n) => (
              <button
                key={n}
                id={`pin-length-${n}-btn`}
                type="button"
                onClick={() => {
                  setLength(n);
                  setPin('');
                }}
                aria-pressed={length === n}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  length === n ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {n} số
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="py-2">
        <PinPad
          idPrefix="setup"
          length={padLength}
          value={pin}
          onChange={(v) => {
            setPin(v);
            if (v) setError(null);
          }}
          onComplete={handleComplete}
          disabled={busy}
          shakeKey={shake}
          active={mode !== null && !lock.locked}
        />
      </div>

      <p id="pin-setup-error" className="mt-3 min-h-[20px] text-center text-sm font-bold text-rose-600" aria-live="assertive">
        {error}
      </p>

      {shown === 'create' && step === 'new' && (
        <div className="mt-3 space-y-2.5">
          {needsBackup && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-semibold">Nên sao lưu trước khi bật khóa.</p>
                <p>Nếu quên mã PIN, bạn chỉ mở lại được bằng file CSV sao lưu.</p>
                <button
                  type="button"
                  onClick={onBackup}
                  className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 font-bold text-amber-800 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Sao lưu ngay
                </button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-slate-400 leading-relaxed text-center">
            Mã PIN chỉ lưu dạng mã hóa một chiều trên máy này, không ai đọc lại được số bạn đặt.
          </p>
        </div>
      )}
    </Sheet>
  );
}
