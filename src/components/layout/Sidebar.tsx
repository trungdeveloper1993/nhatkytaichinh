import { CircleDollarSign, ShieldCheck, ShieldAlert, Download, Lock } from 'lucide-react';
import { NAV_ITEMS, TabKey } from '../../nav';
import { APP_VERSION } from '../../config';
import { useAppLock } from '../../lock/AppLock';

interface SidebarProps {
  active: TabKey;
  onNavigate: (tab: TabKey) => void;
  backupLabel: string;
  needsBackup: boolean;
  onBackup: () => void;
}

export default function Sidebar({ active, onNavigate, backupLabel, needsBackup, onBackup }: SidebarProps) {
  const lock = useAppLock();
  const mainItems = NAV_ITEMS.filter((i) => i.key !== 'settings');
  const settingsItem = NAV_ITEMS.find((i) => i.key === 'settings')!;

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const isActive = active === item.key;
    const Icon = item.icon;
    return (
      <button
        key={item.key}
        id={`nav-${item.key}`}
        onClick={() => onNavigate(item.key)}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
          isActive
            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200'
            : 'text-slate-600 font-semibold hover:bg-white hover:text-slate-900'
        }`}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.4 : 2} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-white/60 backdrop-blur-xl border-r border-white/70">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <span className="p-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 shrink-0">
          <CircleDollarSign className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <p className="font-display font-black text-lg text-slate-900 leading-tight">Nhật Ký Tài Chính</p>
          <p className="text-[11px] font-semibold text-slate-400 leading-snug">Hãy quản lý túi tiền của bạn nhé ❤️</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {mainItems.map(renderItem)}
        <div className="my-3 border-t border-slate-200/70" />
        {renderItem(settingsItem)}
      </nav>

      <div className="p-4">
        <div className={`rounded-2xl p-3.5 border ${needsBackup ? 'bg-amber-50 border-amber-200' : 'bg-white/80 border-white'}`}>
          <div className="flex items-center gap-2">
            {needsBackup ? (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <p className="text-xs font-bold text-slate-700">Sao lưu dữ liệu</p>
          </div>
          <p className={`text-[11px] mt-1 font-semibold ${needsBackup ? 'text-amber-700' : 'text-slate-500'}`}>{backupLabel}</p>
          <button
            onClick={onBackup}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Sao lưu ngay
          </button>
        </div>
        {lock.enabled && (
          <button
            id="sidebar-lock-btn"
            type="button"
            onClick={lock.lockNow}
            title="Khóa ứng dụng (phím L)"
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white/80 border border-white hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" /> Khóa ứng dụng
            <kbd className="ml-1 px-1.5 rounded border border-slate-200 bg-slate-50 font-mono text-[10px] text-slate-500">L</kbd>
          </button>
        )}
        <p className="mt-3 text-center text-[10px] font-semibold text-slate-400">Phiên bản {APP_VERSION}</p>
      </div>
    </aside>
  );
}
