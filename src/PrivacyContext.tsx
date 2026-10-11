import React, { createContext, useCallback, useContext, useState } from 'react';
import { formatCompactVND, formatCurrency } from './utils';

const LOCAL_STORAGE_PRIVACY_KEY = 'nhat_ky_tai_chinh_hide_amounts';

// Chuỗi che khi bật chế độ ẩn số tiền (không lộ số chữ số thực tế)
export const AMOUNT_MASK = '••••••• ₫';
const COMPACT_MASK = '••••';

// Định dạng số tiền có tính đến trạng thái ẩn (dùng chung cho toàn cục và từng quỹ)
export function formatAmount(amount: number, hidden: boolean): string {
  return hidden ? AMOUNT_MASK : formatCurrency(amount);
}

interface PrivacyContextValue {
  hidden: boolean;
  toggle: () => void;
  // Định dạng số tiền: trả về chuỗi che nếu đang bật chế độ ẩn
  format: (amount: number) => string;
  // Dạng gọn (1,84 tỷ / 16,7 tr) cho chỗ hẹp, cũng che khi ẩn
  compact: (amount: number) => string;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  hidden: false,
  toggle: () => {},
  format: formatCurrency,
  compact: formatCompactVND,
});

function readStoredHidden(): boolean {
  try {
    return localStorage.getItem(LOCAL_STORAGE_PRIVACY_KEY) === 'true';
  } catch {
    return false;
  }
}

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  // Đọc đồng bộ ngay khi khởi tạo để không nháy số tiền thật lúc mở app
  const [hidden, setHidden] = useState(readStoredHidden);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LOCAL_STORAGE_PRIVACY_KEY, String(next));
      } catch {
        // bỏ qua nếu trình duyệt chặn lưu trữ
      }
      return next;
    });
  }, []);

  const format = (amount: number) => formatAmount(amount, hidden);
  const compact = (amount: number) => (hidden ? COMPACT_MASK : formatCompactVND(amount));

  return (
    <PrivacyContext.Provider value={{ hidden, toggle, format, compact }}>
      {children}
    </PrivacyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrivacy() {
  return useContext(PrivacyContext);
}
