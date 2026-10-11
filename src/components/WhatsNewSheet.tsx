import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Sheet from './ui/Sheet';
import { APP_VERSION, STORAGE_KEYS } from '../config';

// Những điểm mới của phiên bản hiện tại (hiện một lần sau khi cập nhật)
const HIGHLIGHTS: { emoji: string; title: string; desc: string }[] = [
  { emoji: '🧭', title: 'Giao diện như ứng dụng', desc: 'Thanh điều hướng dưới (điện thoại), thanh bên (máy tính) và trang Tổng quan mới.' },
  { emoji: '➕', title: 'Ghi chép nhanh ở mọi nơi', desc: 'Bấm nút + để ghi. Nhập tiền có gợi ý +10K, +50K… và đọc số thành chữ.' },
  { emoji: '✏️', title: 'Sửa & hoàn tác giao dịch', desc: 'Chạm vào giao dịch để sửa. Lỡ tay xóa thì bấm “Hoàn tác”.' },
  { emoji: '🏦', title: 'Chi tiết từng quỹ', desc: 'Chạm vào quỹ để xem số dư, chi tiêu tháng, lịch sử và cách quản lý.' },
  { emoji: '🔔', title: 'Cảnh báo thông minh', desc: 'Báo khi vượt giới hạn, chạm trần quỹ, chi tiêu tăng mạnh hoặc lâu chưa sao lưu.' },
  { emoji: '📲', title: 'Cài lên màn hình chính', desc: 'Mở nhanh như app, dùng được cả khi mất mạng (Cài đặt → Cài lên màn hình chính).' },
];

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
      <ul className="space-y-3">
        {HIGHLIGHTS.map((h) => (
          <li key={h.title} className="flex items-start gap-3">
            <span className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg" aria-hidden>
              {h.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800">{h.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{h.desc}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
        Dữ liệu cũ của bạn được giữ nguyên. Xem lại bảng này bất cứ lúc nào trong Cài đặt → Giới thiệu.
      </p>
    </Sheet>
  );
}
