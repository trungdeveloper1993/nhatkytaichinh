import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CircleDollarSign, Lock, LockOpen, FileUp, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { STORAGE_KEYS } from '../config';
import { parseCsv } from '../csv';
import PinPad from './PinPad';
import {
  LockConfig,
  PinLength,
  MAX_FREE_ATTEMPTS,
  createLockConfig,
  isPinSupported,
  readAttempts,
  readLockConfig,
  recordFailedAttempt,
  resetAttempts,
  verifyPin,
  writeLockConfig,
} from './pin';

interface AppLockValue {
  supported: boolean;
  enabled: boolean;
  locked: boolean;
  length: PinLength;
  autoLock: number;
  lockNow: () => void;
  verify: (pin: string) => Promise<boolean>;
  enable: (pin: string, length: PinLength, autoLock: number) => Promise<void>;
  changePin: (pin: string, length: PinLength) => Promise<void>;
  disable: () => void;
  setAutoLock: (seconds: number) => void;
}

const AppLockContext = createContext<AppLockValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAppLock(): AppLockValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock phải nằm trong AppLockProvider');
  return ctx;
}

const LOCK_ROOT_ID = 'app-lock-root';
const SHIELD_CLASS = 'app-shield';

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<LockConfig | null>(readLockConfig);
  // Đã bật PIN thì mở app ở trạng thái khóa và CHƯA dựng giao diện (không lộ dữ liệu trong trang)
  const [locked, setLocked] = useState(() => readLockConfig() !== null);
  const [ready, setReady] = useState(() => readLockConfig() === null);
  const configRef = useRef(config);
  configRef.current = config;

  const lockNow = useCallback(() => {
    if (configRef.current) setLocked(true);
  }, []);

  // Tự khóa khi rời app (chuyển ứng dụng, tắt màn hình, đổi tab)
  useEffect(() => {
    if (!config) return;
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        // Che nội dung để ảnh chụp trong trình chuyển ứng dụng không lộ số liệu
        document.documentElement.classList.add(SHIELD_CLASS);
        if (config.autoLock === 0) setLocked(true);
      } else {
        if (hiddenAt && Date.now() - hiddenAt >= config.autoLock * 1000) setLocked(true);
        hiddenAt = 0;
        document.documentElement.classList.remove(SHIELD_CLASS);
      }
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLocked(true); // quay lại từ bộ nhớ đệm trang (nút Back)
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      document.documentElement.classList.remove(SHIELD_CLASS);
    };
  }, [config]);

  // Khi khóa: mọi thứ phía sau không bấm / tab tới được
  useEffect(() => {
    if (!locked) return;
    const others = Array.from(document.body.children).filter((el) => el.id !== LOCK_ROOT_ID);
    others.forEach((el) => el.setAttribute('inert', ''));
    return () => others.forEach((el) => el.removeAttribute('inert'));
  }, [locked]);

  const value = useMemo<AppLockValue>(
    () => ({
      supported: isPinSupported(),
      enabled: config !== null,
      locked,
      length: config?.length ?? 4,
      autoLock: config?.autoLock ?? 60,
      lockNow,
      verify: async (pin) => (configRef.current ? verifyPin(pin, configRef.current) : false),
      enable: async (pin, length, autoLock) => {
        const next = await createLockConfig(pin, length, autoLock);
        writeLockConfig(next);
        resetAttempts();
        setConfig(next);
      },
      changePin: async (pin, length) => {
        const next = await createLockConfig(pin, length, configRef.current?.autoLock ?? 60);
        writeLockConfig(next);
        setConfig(next);
      },
      disable: () => {
        writeLockConfig(null);
        resetAttempts();
        setConfig(null);
        setLocked(false);
      },
      setAutoLock: (seconds) => {
        if (!configRef.current) return;
        const next = { ...configRef.current, autoLock: seconds };
        writeLockConfig(next);
        setConfig(next);
      },
    }),
    [config, locked, lockNow],
  );

  return (
    <AppLockContext.Provider value={value}>
      {ready && children}
      <AnimatePresence>
        {locked && config && (
          <LockScreen
            key="lock"
            config={config}
            onUnlock={() => {
              setLocked(false);
              setReady(true);
            }}
          />
        )}
      </AnimatePresence>
    </AppLockContext.Provider>
  );
}

function LockScreen({ config, onUnlock }: { config: LockConfig; onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(readAttempts);
  const [now, setNow] = useState(() => Date.now());
  const [mode, setMode] = useState<'pin' | 'forgot'>('pin');
  const supported = isPinSupported();

  const waitSeconds = Math.max(0, Math.ceil((attempts.until - now) / 1000));
  const lockedOut = waitSeconds > 0;

  useEffect(() => {
    if (!lockedOut) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [lockedOut]);

  const submit = async (value: string) => {
    if (checking || lockedOut) return;
    setChecking(true);
    const ok = await verifyPin(value, config).catch(() => false);
    setChecking(false);
    if (ok) {
      resetAttempts();
      setError(null);
      setSuccess(true);
      window.setTimeout(onUnlock, 280);
      return;
    }
    const next = recordFailedAttempt();
    setAttempts(next);
    setNow(Date.now());
    setPin('');
    setShake((s) => s + 1);
    navigator.vibrate?.(180);
    const left = MAX_FREE_ATTEMPTS - next.failed;
    setError(next.until > Date.now() ? 'Nhập sai quá nhiều lần.' : left <= 2 ? `Sai mã PIN. Còn ${left} lần thử trước khi bị khóa tạm.` : 'Sai mã PIN, vui lòng thử lại.');
  };

  return createPortal(
    <motion.div
      id={LOCK_ROOT_ID}
      role="dialog"
      aria-modal="true"
      aria-label="Mở khóa Nhật Ký Tài Chính"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[1000] glass-bg overflow-y-auto"
    >
      <div className="min-h-full flex flex-col items-center justify-center px-6 pt-[max(env(safe-area-inset-top),32px)] pb-[max(env(safe-area-inset-bottom),24px)]">
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className="p-3 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-300/60"
        >
          <CircleDollarSign className="w-9 h-9" />
        </motion.span>
        <p className="mt-3 font-display font-black text-xl text-slate-900">Nhật Ký Tài Chính</p>

        {mode === 'pin' ? (
          <>
            <p className="mt-1.5 text-sm font-semibold text-slate-500 flex items-center gap-1.5">
              {success ? <LockOpen className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4" />}
              {success ? 'Đã mở khóa' : 'Nhập mã PIN để mở khóa'}
            </p>

            <div className="mt-8">
              {supported ? (
                <PinPad
                  idPrefix="lock"
                  length={config.length}
                  value={pin}
                  onChange={(v) => {
                    setPin(v);
                    if (v) setError(null);
                  }}
                  onComplete={submit}
                  disabled={checking || lockedOut || success}
                  shakeKey={shake}
                  success={success}
                />
              ) : (
                <p className="max-w-xs text-center text-sm font-semibold text-rose-600">
                  Không thể mở khóa trên kết nối không bảo mật. Hãy mở ứng dụng bằng đường dẫn https.
                </p>
              )}
            </div>

            <div className="mt-5 min-h-[40px] text-center" aria-live="assertive">
              {checking && <Loader2 className="mx-auto w-5 h-5 animate-spin text-indigo-500" />}
              {!checking && lockedOut && (
                <p id="lock-wait-msg" className="text-sm font-bold text-rose-600">
                  Nhập sai quá nhiều lần. Thử lại sau {waitSeconds} giây.
                </p>
              )}
              {!checking && !lockedOut && error && (
                <p id="lock-error-msg" className="text-sm font-bold text-rose-600">
                  {error}
                </p>
              )}
            </div>

            <button
              id="lock-forgot-btn"
              type="button"
              onClick={() => setMode('forgot')}
              className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Quên mã PIN?
            </button>
          </>
        ) : (
          <ForgotPanel onBack={() => setMode('pin')} />
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

// Quên PIN: chỉ có thể mở lại bằng file CSV sao lưu (thay dữ liệu trên máy này + tắt mã PIN)
function ForgotPanel({ onBack }: { onBack: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ name: string; funds: number; transactions: number; data: ReturnType<typeof parseCsv> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseCsv(String(reader.result || ''));
        setParsed({ name: file.name, funds: data.funds.length, transactions: data.transactions.length, data });
        setError(null);
      } catch (err) {
        setParsed(null);
        setError(`Không đọc được file: ${err instanceof Error ? err.message : 'lỗi không xác định'}`);
      }
    };
    reader.readAsText(file);
  };

  const restore = () => {
    if (!parsed) return;
    try {
      localStorage.setItem(STORAGE_KEYS.funds, JSON.stringify(parsed.data.funds));
      localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(parsed.data.transactions));
      writeLockConfig(null);
      resetAttempts();
    } catch {
      setError('Không lưu được dữ liệu vào trình duyệt.');
      return;
    }
    window.location.reload();
  };

  return (
    <div id="lock-forgot-panel" className="mt-6 w-full max-w-sm rounded-3xl bg-white/85 backdrop-blur-xl border border-white shadow-lg p-5">
      <p className="font-display font-bold text-slate-900 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-amber-500" /> Quên mã PIN?
      </p>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        Mã PIN chỉ được lưu dạng mã hóa trên máy này nên không thể lấy lại. Bạn có thể mở lại ứng dụng bằng <strong>file CSV đã sao lưu</strong>:
        dữ liệu hiện tại trên máy sẽ được thay bằng dữ liệu trong file và mã PIN sẽ được tắt.
      </p>

      {parsed ? (
        <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
          <p className="text-sm font-semibold text-amber-900">
            “{parsed.name}”: {parsed.funds} quỹ, {parsed.transactions} giao dịch.
          </p>
          <p className="text-xs text-amber-800 mt-1">Dữ liệu hiện tại trên máy này sẽ bị thay thế hoàn toàn.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setParsed(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer">
              Chọn file khác
            </button>
            <button
              id="lock-restore-confirm-btn"
              type="button"
              onClick={restore}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold cursor-pointer"
            >
              Khôi phục
            </button>
          </div>
        </div>
      ) : (
        <button
          id="lock-restore-file-btn"
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 cursor-pointer"
        >
          <FileUp className="w-4 h-4" /> Chọn file CSV sao lưu
        </button>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      <input ref={inputRef} id="lock-restore-input" type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />

      <button type="button" onClick={onBack} className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Quay lại nhập mã PIN
      </button>
    </div>
  );
}
