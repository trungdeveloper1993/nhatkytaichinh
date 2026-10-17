import { useMemo, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  Upload,
  EyeOff,
  Smartphone,
  Database,
  Keyboard,
  Info,
  CheckCircle2,
  Share,
  PlusSquare,
  MoreVertical,
  RefreshCw,
  Sparkles,
  Lock,
  KeyRound,
} from 'lucide-react';
import { Fund, Transaction } from '../types';
import { usePrivacy } from '../PrivacyContext';
import { useAppUpdate, useInstallPrompt, useStoragePersistence } from '../hooks';
import { useToast } from '../ToastContext';
import { SectionCard, PageHeader } from '../components/ui/primitives';
import { APP_NAME, APP_VERSION } from '../config';
import { NAV_BY_KEY } from '../nav';
import { useAppLock } from '../lock/AppLock';
import PinSetupSheet, { PinSheetMode } from '../lock/PinSetupSheet';
import { AUTO_LOCK_OPTIONS } from '../lock/pin';

interface SettingsPageProps {
  funds: Fund[];
  transactions: Transaction[];
  backupLabel: string;
  needsBackup: boolean;
  onExport: () => void;
  onImport: () => void;
  onShowWhatsNew: () => void;
}

function Switch({ checked, onChange, id, disabled, label }: { checked: boolean; onChange: () => void; id?: string; disabled?: boolean; label?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}

export default function SettingsPage({
  funds,
  transactions,
  backupLabel,
  needsBackup,
  onExport,
  onImport,
  onShowWhatsNew,
}: SettingsPageProps) {
  const { hidden, toggle } = usePrivacy();
  const { canInstall, installed, install } = useInstallPrompt();
  const { updateReady, applyUpdate, checkForUpdate } = useAppUpdate();
  const storage = useStoragePersistence();
  const { notify } = useToast();
  const [checking, setChecking] = useState(false);
  const lock = useAppLock();
  const [pinSheet, setPinSheet] = useState<PinSheetMode | null>(null);
  const nav = NAV_BY_KEY.settings;

  const storageKB = useMemo(() => {
    const bytes = new Blob([JSON.stringify(funds), JSON.stringify(transactions)]).size;
    return (bytes / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  }, [funds, transactions]);

  const firstTxDate = useMemo(() => {
    if (transactions.length === 0) return null;
    const d = transactions.reduce((min, t) => (t.date < min ? t.date : min), transactions[0].date);
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }, [transactions]);

  const handleInstall = async () => {
    const ok = await install();
    if (ok) notify('Đã cài Nhật Ký Tài Chính lên thiết bị 🎉', 'success');
  };

  const handleCheckUpdate = async () => {
    setChecking(true);
    const result = await checkForUpdate();
    setChecking(false);
    if (result === 'latest') notify(`Bạn đang dùng phiên bản mới nhất (v${APP_VERSION})`, 'success');
    else if (result === 'downloading') notify('Đang tải bản cập nhật, sẽ báo bạn khi sẵn sàng…', 'info');
    else if (result === 'unavailable') notify('Chưa kiểm tra được. Hãy kết nối mạng rồi thử lại.', 'error');
  };

  const handleProtectStorage = async () => {
    const granted = await storage.request();
    if (granted) notify('Đã bật bảo vệ: trình duyệt sẽ không tự xóa nhật ký của bạn', 'success');
    else notify('Trình duyệt chưa cho phép. Hãy cài app lên màn hình chính rồi thử lại — và nhớ sao lưu CSV định kỳ.', 'info', { duration: 7000 });
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-3xl">
      <PageHeader title={nav.label} description={nav.description} />

      {/* Sao lưu */}
      <SectionCard
        id="settings-backup"
        title="Sao lưu & khôi phục"
        icon={needsBackup ? <ShieldAlert className="w-4 h-4 text-amber-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
      >
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 mb-3 ${
            needsBackup ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
          }`}
        >
          {needsBackup ? <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
          <p className="text-xs font-semibold leading-relaxed">
            {backupLabel}.{' '}
            {needsBackup ? 'Nên sao lưu định kỳ mỗi tuần để không mất nhật ký khi đổi máy hoặc xóa dữ liệu trình duyệt.' : 'Dữ liệu của bạn đã được sao lưu gần đây.'}
          </p>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-3">
          Nhật ký được lưu ngay trên trình duyệt này. File CSV chứa toàn bộ quỹ và giao dịch — giữ file ở nơi an toàn (Tệp, Google Drive, email…) để
          khôi phục khi cần. Trên iPhone, bấm "Xuất file" rồi chọn <strong>Lưu vào Tệp</strong>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            id="settings-export-btn"
            onClick={onExport}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Xuất file CSV
          </button>
          <button
            id="settings-import-btn"
            onClick={onImport}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Nhập từ file CSV
          </button>
        </div>
      </SectionCard>

      {/* Quyền riêng tư */}
      <SectionCard title="Quyền riêng tư" icon={<EyeOff className="w-4 h-4 text-indigo-500" />}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Ẩn số tiền</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Che toàn bộ số dư bằng •••• (ghi nhớ cả khi mở lại app). Con mắt trên từng quỹ mở riêng quỹ đó; số tài khoản chỉ hiện đầy đủ khi tắt chế độ này.
            </p>
          </div>
          <Switch id="settings-privacy-switch" checked={hidden} onChange={toggle} label="Ẩn số tiền" />
        </div>
      </SectionCard>

      {/* Khóa ứng dụng */}
      <SectionCard id="settings-lock" title="Khóa ứng dụng" icon={<Lock className="w-4 h-4 text-indigo-500" />}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Khóa bằng mã PIN</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Khi bật, mỗi lần mở web phải nhập mã PIN (4 hoặc 6 số) mới xem được nhật ký.
            </p>
          </div>
          <Switch
            id="settings-lock-switch"
            label="Khóa bằng mã PIN"
            checked={lock.enabled}
            disabled={!lock.supported}
            onChange={() => setPinSheet(lock.enabled ? 'disable' : 'create')}
          />
        </div>

        {lock.enabled && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="settings-autolock-select" className="text-sm font-semibold text-slate-800">
                Tự khóa khi rời ứng dụng
              </label>
              <select
                id="settings-autolock-select"
                value={lock.autoLock}
                onChange={(e) => {
                  lock.setAutoLock(Number(e.target.value));
                  notify('Đã lưu thời gian tự khóa', 'success');
                }}
                className="shrink-0 px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
              >
                {AUTO_LOCK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="settings-change-pin-btn"
                type="button"
                onClick={() => setPinSheet('change')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" /> Đổi mã PIN
              </button>
              <button
                id="settings-lock-now-btn"
                type="button"
                onClick={lock.lockNow}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" /> Khóa ngay
              </button>
            </div>
          </div>
        )}

        <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          {lock.supported
            ? 'Mã PIN chỉ lưu dạng mã hóa một chiều trên máy này. Nếu quên, bạn chỉ mở lại được bằng file CSV sao lưu — hãy sao lưu thường xuyên. Khóa giúp người khác không xem được nhật ký khi cầm máy của bạn.'
            : 'Trình duyệt này chưa hỗ trợ khóa bằng mã PIN (cần mở ứng dụng bằng đường dẫn https).'}
        </p>
      </SectionCard>

      <PinSetupSheet
        mode={pinSheet}
        onClose={() => setPinSheet(null)}
        onDone={(message) => {
          setPinSheet(null);
          notify(message, 'success');
        }}
        needsBackup={needsBackup}
        onBackup={onExport}
      />

      {/* Cài app */}
      <SectionCard title="Cài lên màn hình chính" icon={<Smartphone className="w-4 h-4 text-indigo-500" />}>
        {installed ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Bạn đang dùng bản đã cài như một ứng dụng.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              Cài Nhật Ký Tài Chính như một app: mở nhanh từ màn hình chính, toàn màn hình, dùng được cả khi không có mạng.
            </p>
            {canInstall && (
              <button
                id="settings-install-btn"
                onClick={handleInstall}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold transition-colors cursor-pointer"
              >
                <PlusSquare className="w-4 h-4" /> Cài đặt ứng dụng
              </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs font-bold text-slate-800 mb-1.5">📱 iPhone / iPad (Safari)</p>
                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>
                    Bấm nút Chia sẻ <Share className="inline w-3.5 h-3.5 -mt-0.5" />
                  </li>
                  <li>Chọn “Thêm vào MH chính”</li>
                  <li>Bấm “Thêm”</li>
                </ol>
                <p className="mt-2 text-[11px] text-amber-700 font-semibold leading-relaxed">
                  ⚠️ App trên màn hình chính có bộ nhớ riêng với Safari: hãy “Lưu CSV” ở Safari rồi “Tải CSV” trong app để chuyển nhật ký sang.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs font-bold text-slate-800 mb-1.5">🤖 Android (Chrome)</p>
                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>
                    Bấm menu <MoreVertical className="inline w-3.5 h-3.5 -mt-0.5" />
                  </li>
                  <li>Chọn “Cài đặt ứng dụng” / “Thêm vào MH chính”</li>
                  <li>Xác nhận “Cài đặt”</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Dữ liệu */}
      <SectionCard title="Dữ liệu của bạn" icon={<Database className="w-4 h-4 text-indigo-500" />}>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Quỹ', value: funds.length.toLocaleString('vi-VN') },
            { label: 'Giao dịch', value: transactions.length.toLocaleString('vi-VN') },
            { label: 'Dung lượng', value: `${storageKB} KB` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="font-display font-black text-lg text-slate-900 tabular-nums">{s.value}</p>
              <p className="text-[11px] font-bold uppercase tracking-tight text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
        {firstTxDate && <p className="text-xs text-slate-500 mt-2.5">Bắt đầu ghi chép từ ngày {firstTxDate}.</p>}

        {storage.supported && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-500" /> Bảo vệ khỏi bị tự xóa
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Xin trình duyệt không tự dọn nhật ký khi máy thiếu bộ nhớ. Vẫn nên sao lưu CSV định kỳ.
              </p>
            </div>
            {storage.persisted ? (
              <span id="settings-storage-status" className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã bật
              </span>
            ) : (
              <button
                id="settings-storage-btn"
                onClick={handleProtectStorage}
                className="shrink-0 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Bật bảo vệ
              </button>
            )}
          </div>
        )}
      </SectionCard>

      {/* Phím tắt */}
      <SectionCard title="Phím tắt (máy tính)" icon={<Keyboard className="w-4 h-4 text-indigo-500" />} className="hidden lg:block">
        <div className="space-y-2 text-sm">
          {[
            { key: 'N', desc: 'Ghi chép nhanh' },
            { key: 'L', desc: 'Khóa ứng dụng (khi đã bật mã PIN)' },
            { key: 'Esc', desc: 'Đóng cửa sổ đang mở' },
          ].map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-slate-600">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-bold text-slate-700">{s.key}</kbd>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Giới thiệu */}
      <SectionCard title="Giới thiệu" icon={<Info className="w-4 h-4 text-indigo-500" />}>
        <p className="text-sm font-bold text-slate-800">
          {APP_NAME} <span className="font-mono text-xs font-semibold text-slate-400">v{APP_VERSION}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Ghi chép thu chi, quản lý quỹ, gợi ý phân bổ thu nhập và báo cáo — mọi dữ liệu nằm trên thiết bị của bạn, không gửi đi đâu cả.
        </p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {updateReady ? (
            <button
              id="settings-apply-update-btn"
              onClick={applyUpdate}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Cập nhật lên bản mới
            </button>
          ) : (
            <button
              id="settings-check-update-btn"
              onClick={handleCheckUpdate}
              disabled={checking}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} /> {checking ? 'Đang kiểm tra…' : 'Kiểm tra cập nhật'}
            </button>
          )}
          <button
            id="settings-whats-new-btn"
            onClick={onShowWhatsNew}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" /> Có gì mới
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
