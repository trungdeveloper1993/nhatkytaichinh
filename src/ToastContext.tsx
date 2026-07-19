import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  notify: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}

const STYLES: Record<ToastType, { icon: React.ReactNode; ring: string; text: string }> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    ring: 'border-emerald-200 bg-emerald-50/95',
    text: 'text-emerald-900'
  },
  error: {
    icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
    ring: 'border-rose-200 bg-rose-50/95',
    text: 'text-rose-900'
  },
  info: {
    icon: <Info className="w-5 h-5 text-indigo-600" />,
    ring: 'border-indigo-200 bg-indigo-50/95',
    text: 'text-indigo-900'
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}

      {/* Toast viewport */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const s = STYLES[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`pointer-events-auto w-full flex items-start gap-2.5 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-xl ${s.ring}`}
              >
                <span className="shrink-0 mt-0.5">{s.icon}</span>
                <p className={`flex-1 text-sm font-semibold leading-snug ${s.text}`}>{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors cursor-pointer"
                  aria-label="Đóng thông báo"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
