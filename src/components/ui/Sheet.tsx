import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X } from 'lucide-react';
import { useMediaQuery } from '../../hooks';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  children: React.ReactNode;
}

const SIZE_CLASS = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

// Ngăn xếp các sheet đang mở: chỉ sheet trên cùng nhận phím ESC; khóa cuộn trang khi có sheet mở
const openStack: number[] = [];
let nextSheetId = 1;

export default function Sheet({ open, onClose, title, subtitle, icon, footer, size = 'md', id, children }: SheetProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const dragControls = useDragControls();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const sheetId = nextSheetId++;
    openStack.push(sheetId);
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === sheetId) {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const idx = openStack.indexOf(sheetId);
      if (idx >= 0) openStack.splice(idx, 1);
      if (openStack.length === 0) document.body.style.overflow = '';
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" id={id}>
          <motion.div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={`relative w-full ${SIZE_CLASS[size]} bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88dvh]`}
            initial={isDesktop ? { opacity: 0, scale: 0.96, y: 12 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.96, y: 12 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag={isDesktop ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {/* Thanh kéo (mobile) + tiêu đề */}
            <div
              className="shrink-0 touch-none"
              onPointerDown={(e) => {
                if (!isDesktop) dragControls.start(e);
              }}
            >
              <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300" />
              {(title || icon) && (
                <div className="flex items-start gap-3 px-5 pt-3 sm:pt-5 pb-3 border-b border-slate-100">
                  {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
                  <div className="min-w-0 flex-1">
                    {title && <h2 className="font-display font-bold text-base text-slate-900 leading-snug">{title}</h2>}
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 -mr-1 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-slate-100 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:pb-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
