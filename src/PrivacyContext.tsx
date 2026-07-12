import React, { createContext, useContext, useEffect, useState } from 'react';
import { formatCurrency } from './utils';

const LOCAL_STORAGE_PRIVACY_KEY = 'nhat_ky_tai_chinh_hide_amounts';

// Chuỗi che khi bật chế độ ẩn số tiền (không lộ số chữ số thực tế)
const MASK = '••••••• ₫';

interface PrivacyContextValue {
  hidden: boolean;
  toggle: () => void;
  // Định dạng số tiền: trả về chuỗi che nếu đang bật chế độ ẩn
  format: (amount: number) => string;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  hidden: false,
  toggle: () => {},
  format: formatCurrency,
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  // Khôi phục trạng thái đã lưu
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_PRIVACY_KEY);
    if (stored === 'true') {
      setHidden(true);
    }
  }, []);

  const toggle = () => {
    setHidden((prev) => {
      const next = !prev;
      localStorage.setItem(LOCAL_STORAGE_PRIVACY_KEY, String(next));
      return next;
    });
  };

  const format = (amount: number) => (hidden ? MASK : formatCurrency(amount));

  return (
    <PrivacyContext.Provider value={{ hidden, toggle, format }}>
      {children}
    </PrivacyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrivacy() {
  return useContext(PrivacyContext);
}
