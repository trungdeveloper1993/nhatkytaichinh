// Thông tin ứng dụng & khóa lưu trữ dùng chung
export const APP_NAME = 'Nhật Ký Tài Chính';
export const APP_VERSION = '2.1.0';

export const STORAGE_KEYS = {
  funds: 'nhat_ky_tai_chinh_funds',
  transactions: 'nhat_ky_tai_chinh_transactions',
  lastBackup: 'nhat_ky_tai_chinh_last_backup',
  seenVersion: 'nhat_ky_tai_chinh_seen_version',
  lock: 'nhat_ky_tai_chinh_lock',
  lockAttempts: 'nhat_ky_tai_chinh_lock_attempts',
} as const;

// Nhắc sao lưu khi quá số ngày này chưa xuất file CSV
export const BACKUP_REMINDER_DAYS = 7;
