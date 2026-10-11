import { CircleDollarSign, Eye, EyeOff, Download, Upload, Settings, Plus } from 'lucide-react';
import { NAV_BY_KEY, TabKey } from '../../nav';
import { usePrivacy } from '../../PrivacyContext';

interface TopBarProps {
  tab: TabKey;
  totalAssets: number;
  onExport: () => void;
  onImport: () => void;
  onQuickAdd: () => void;
  onOpenSettings: () => void;
}

export default function TopBar({ tab, totalAssets, onExport, onImport, onQuickAdd, onOpenSettings }: TopBarProps) {
  const { hidden, toggle, format } = usePrivacy();
  const nav = NAV_BY_KEY[tab];

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/70 pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 lg:h-[72px] flex items-center gap-2.5 sm:gap-3">
        {/* Thương hiệu (mobile) */}
        <div className="lg:hidden flex items-center gap-2.5 min-w-0 flex-1">
          <span className="p-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shrink-0 shadow-sm shadow-indigo-200">
            <CircleDollarSign className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display font-black text-[15px] text-slate-900 leading-tight truncate">Nhật Ký Tài Chính</p>
            <p className="text-[10px] font-semibold text-slate-400 truncate">Hãy quản lý túi tiền của bạn nhé ❤️</p>
          </div>
        </div>

        {/* Tiêu đề trang (desktop) */}
        <div className="hidden lg:block min-w-0 flex-1">
          <h1 className="font-display font-black text-xl text-slate-900 leading-tight">{nav.label}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{nav.description}</p>
        </div>

        {/* Tổng số dư (màn hình vừa trở lên) */}
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/80 border border-white shadow-xs shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Tổng số dư</p>
            <p className="font-display font-black text-base text-slate-900 tabular-nums mt-1 leading-none">{format(totalAssets)}</p>
          </div>
        </div>

        {/* Ẩn / hiện số tiền */}
        <button
          id="toggle-privacy-btn"
          onClick={toggle}
          className="p-2.5 sm:px-3 rounded-xl bg-white/80 border border-white hover:border-indigo-200 text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer shadow-xs"
          title={hidden ? 'Hiện số tiền' : 'Ẩn số tiền'}
          aria-label={hidden ? 'Hiện số tiền' : 'Ẩn số tiền'}
        >
          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="hidden sm:inline">{hidden ? 'Hiện số' : 'Ẩn số'}</span>
        </button>

        {/* Lưu / Tải dữ liệu CSV (cột dọc nhỏ) */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            id="export-csv-btn"
            onClick={onExport}
            className="px-2 py-1 rounded-lg bg-white/80 border border-white hover:border-emerald-200 text-slate-600 hover:text-emerald-600 transition-colors flex items-center gap-1 text-[10px] sm:text-[11px] font-bold cursor-pointer"
            title="Lưu toàn bộ dữ liệu ra file CSV để sao lưu"
          >
            <Download className="w-3 h-3" />
            <span>Lưu CSV</span>
          </button>
          <button
            id="import-csv-btn"
            onClick={onImport}
            className="px-2 py-1 rounded-lg bg-white/80 border border-white hover:border-indigo-200 text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1 text-[10px] sm:text-[11px] font-bold cursor-pointer"
            title="Tải dữ liệu từ file CSV đã sao lưu"
          >
            <Upload className="w-3 h-3" />
            <span>Tải CSV</span>
          </button>
        </div>

        {/* Ghi chép nhanh (desktop) */}
        <button
          onClick={onQuickAdd}
          className="hidden lg:flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-colors shrink-0 cursor-pointer"
          title="Ghi chép nhanh (phím N)"
        >
          <Plus className="w-4 h-4" /> Ghi chép
        </button>

        {/* Cài đặt (mobile) */}
        <button
          id="mobile-settings-btn"
          onClick={onOpenSettings}
          className={`lg:hidden p-2.5 rounded-xl border transition-colors shrink-0 cursor-pointer shadow-xs ${
            tab === 'settings' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/80 border-white text-slate-600'
          }`}
          aria-label="Cài đặt"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
