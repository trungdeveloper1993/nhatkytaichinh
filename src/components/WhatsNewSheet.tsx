import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Sheet from './ui/Sheet';
import { APP_VERSION, STORAGE_KEYS } from '../config';

type Highlight = { emoji: string; title: string; desc: string };

// Nhật ký phiên bản: bản mới nhất ở đầu (hiện một lần sau khi cập nhật)
const RELEASES: { version: string; items: Highlight[] }[] = [
  {
    version: APP_VERSION,
    items: [
      { emoji: '📅', title: 'Báo cáo dạng lịch', desc: 'Mỗi ngày hiện số tiền còn lại sau thu và chi, màu càng đậm chênh lệch càng lớn. Chạm vào ngày để xem chi tiết.' },
      { emoji: '🔒', title: 'Khóa bằng mã PIN', desc: 'Cài đặt → Khóa ứng dụng: bật mã PIN 4 hoặc 6 số, mở web phải nhập đúng mới xem được nhật ký.' },
    ],
  },
  {
    version: '2.0.0',
    items: [
      { emoji: '🧭', title: 'Giao diện như ứng dụng', desc: 'Thanh điều hướng dưới (điện thoại), thanh bên (máy tính) và trang Tổng quan mới.' },
      { emoji: '➕', title: 'Ghi chép nhanh ở mọi nơi', desc: 'Bấm nút + để ghi. Nhập tiền có gợi ý +10K, +50K… và đọc số thành chữ.' },
      { emoji: '✏️', title: 'Sửa & hoàn tác giao dịch', desc: 'Chạm vào giao dịch để sửa. Lỡ tay xóa thì bấm “Hoàn tác”.' },
      { emoji: '🏦', title: 'Chi tiết từng quỹ', desc: 'Chạm vào quỹ để xem số dư, chi tiêu tháng, lịch sử và cách quản lý.' },
      { emoji: '🔔', title: 'Cảnh báo thông minh', desc: 'Báo khi vượt giới hạn, chạm trần quỹ, chi tiêu tăng mạnh hoặc lâu chưa sao lưu.' },
      { emoji: '📲', title: 'Cài lên màn hình chính', desc: 'Mở nhanh như app, dùng được cả khi mất mạng (Cài đặt → Cài lên màn hình chính).' },
    ],
  },
];

function HighlightList({ items, compact }: { items: Highlight[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'space-y-2' : 'space-y-3'}>
      {items.map((h) => (
        <li key={h.title} className="flex items-start gap-3">
          <span
            className={`shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center ${compact ? 'w-8 h-8 text-base' : 'w-10 h-10 text-lg'}`}
            aria-hidden
          >
            {h.emoji}
          </span>
          <div className="min-w-0">
            <p className={`font-bold text-slate-800 ${compact ? 'text-xs' : 'text-sm'}`}>{h.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{h.desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Mở tự động một lần cho người đã dùng bản cũ; người mới cài thì không làm phiền.
// suppress: lần mở này có việc khác ưu tiên (vd. mở từ phím tắt "Ghi chi tiêu") -> để lần sau.
export function useWhatsNew(suppress: boolean) {
  // Đọc trước khi kho dữ liệu kịp ghi lần đầu (render chạy trước effect)
  const [initial] = useState(() => {
    try {
      return {
        seen: localStorage.getItem(STORAGE_KEYS.seenVersion),
        hasOldData: localStorage.getItem(STORAGE_KEYS.funds) !== null,
      };
    } catch {
      return { seen: APP_VERSION, hasOldData: false };
    }
  });
  const isNewVersion = initial.seen !== APP_VERSION;
  const [open, setOpen] = useState(isNewVersion && !suppress && (initial.seen !== null || initial.hasOldData));

  useEffect(() => {
    if (!isNewVersion || suppress) return;
    try {
      localStorage.setItem(STORAGE_KEYS.seenVersion, APP_VERSION);
    } catch {
      // bỏ qua
    }
  }, [isNewVersion, suppress]);

  return { open, show: () => setOpen(true), close: () => setOpen(false) };
}

export default function WhatsNewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      id="whats-new-sheet"
      size="md"
      icon={<Sparkles className="w-5 h-5 text-indigo-600" />}
      title={`Có gì mới ở phiên bản ${APP_VERSION}`}
      subtitle="Nhật Ký Tài Chính vừa được nâng cấp"
      footer={
        <button
          id="whats-new-close-btn"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-colors cursor-pointer"
        >
          Bắt đầu dùng
        </button>
      }
    >
      <HighlightList items={RELEASES[0].items} />
      {RELEASES.length > 1 && (
        <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
          <summary className="text-xs font-bold text-slate-500 cursor-pointer select-none">Các phiên bản trước</summary>
          <div className="mt-3 space-y-4">
            {RELEASES.slice(1).map((r) => (
              <div key={r.version}>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Phiên bản {r.version}</p>
                <HighlightList items={r.items} compact />
              </div>
            ))}
          </div>
        </details>
      )}
      <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
        Dữ liệu cũ của bạn được giữ nguyên. Xem lại bảng này bất cứ lúc nào trong Cài đặt → Giới thiệu.
      </p>
    </Sheet>
  );
}
