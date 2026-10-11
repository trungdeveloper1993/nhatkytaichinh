import { motion } from 'motion/react';
import { NAV_ITEMS, TabKey } from '../../nav';

interface BottomNavProps {
  active: TabKey;
  onNavigate: (tab: TabKey) => void;
}

// Thanh điều hướng dưới cho điện thoại (giống app native)
export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  const items = NAV_ITEMS.filter((i) => i.key !== 'settings');

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/70 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Điều hướng chính"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = active === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              id={`bottom-nav-${item.key}`}
              onClick={() => onNavigate(item.key)}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 h-1 w-10 rounded-b-full bg-indigo-600"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Icon
                className={`w-[22px] h-[22px] transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-500'}`}>
                {item.short}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
