import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import Sheet from './components/ui/Sheet';

interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const DialogContext = createContext<ConfirmFn>(async () => false);

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  };

  const danger = options?.tone === 'danger';

  return (
    <DialogContext.Provider value={confirm}>
      {children}
      <Sheet
        open={open}
        onClose={() => close(false)}
        size="sm"
        title={options?.title}
        icon={
          <span className={`flex p-2 rounded-xl ${danger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {danger ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </span>
        }
        footer={
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => close(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {options?.cancelText || 'Hủy'}
            </button>
            <button
              type="button"
              id="confirm-dialog-ok-btn"
              onClick={() => close(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow-xs transition-colors cursor-pointer ${
                danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {options?.confirmText || 'Đồng ý'}
            </button>
          </div>
        }
      >
        {options?.message && <div className="text-sm text-slate-600 leading-relaxed">{options.message}</div>}
      </Sheet>
    </DialogContext.Provider>
  );
}
