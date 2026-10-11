import { LayoutDashboard, Layers, History, PieChart, BarChart3, Settings, type LucideIcon } from 'lucide-react';

export type TabKey = 'dashboard' | 'funds' | 'transactions' | 'allocation' | 'reports' | 'settings';

export interface NavItem {
  key: TabKey;
  label: string; // tên đầy đủ (sidebar, tiêu đề trang)
  short: string; // tên ngắn (thanh điều hướng dưới)
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', short: 'Tổng quan', description: 'Bức tranh tài chính của bạn hôm nay', icon: LayoutDashboard },
  { key: 'funds', label: 'Quỹ & Tài sản', short: 'Quỹ', description: 'Cơ cấu tiền mặt và tài khoản ngân hàng', icon: Layers },
  { key: 'transactions', label: 'Sổ giao dịch', short: 'Giao dịch', description: 'Ghi chép và tra cứu dòng tiền vào ra', icon: History },
  { key: 'allocation', label: 'Phân bổ thu nhập', short: 'Phân bổ', description: 'Gợi ý chia thu nhập vào các quỹ', icon: PieChart },
  { key: 'reports', label: 'Báo cáo phân tích', short: 'Báo cáo', description: 'Thu chi theo tháng và nhận định', icon: BarChart3 },
  { key: 'settings', label: 'Cài đặt', short: 'Cài đặt', description: 'Sao lưu dữ liệu và tùy chỉnh ứng dụng', icon: Settings },
];

export const NAV_BY_KEY = Object.fromEntries(NAV_ITEMS.map((i) => [i.key, i])) as Record<TabKey, NavItem>;

const VALID_TABS = NAV_ITEMS.map((i) => i.key);

// Đọc tab từ URL hash (#/funds) để nút Back của trình duyệt/điện thoại hoạt động
export function tabFromHash(hash: string = window.location.hash): TabKey {
  const key = hash.replace(/^#\/?/, '') as TabKey;
  return VALID_TABS.includes(key) ? key : 'dashboard';
}
