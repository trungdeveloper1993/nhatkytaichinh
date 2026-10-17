// Mã PIN khóa ứng dụng: chỉ lưu bản băm PBKDF2-SHA256 + salt ngẫu nhiên, không bao giờ lưu số PIN thật.
// Lưu ý: đây là lớp khóa màn hình (chặn người khác mở app trên máy của bạn), dữ liệu nhật ký vẫn nằm
// trong bộ nhớ trình duyệt như cũ.
import { STORAGE_KEYS } from '../config';

export type PinLength = 4 | 6;

export interface LockConfig {
  v: 1;
  salt: string; // base64
  hash: string; // base64
  iterations: number;
  length: PinLength;
  autoLock: number; // số giây ở nền trước khi tự khóa; 0 = khóa ngay khi rời app
}

export const AUTO_LOCK_OPTIONS = [
  { value: 0, label: 'Ngay khi rời ứng dụng' },
  { value: 60, label: 'Sau 1 phút' },
  { value: 300, label: 'Sau 5 phút' },
];
export const DEFAULT_AUTO_LOCK = 60;

const ITERATIONS = 150_000;
export const MAX_FREE_ATTEMPTS = 5;

export function isPinSupported(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && !!window.crypto?.subtle;
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toBase64(new Uint8Array(bits));
}

export async function createLockConfig(pin: string, length: PinLength, autoLock: number): Promise<LockConfig> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, ITERATIONS);
  return { v: 1, salt: toBase64(salt), hash, iterations: ITERATIONS, length, autoLock };
}

export async function verifyPin(pin: string, config: LockConfig): Promise<boolean> {
  const hash = await derive(pin, fromBase64(config.salt), config.iterations);
  // So sánh không dừng sớm
  let diff = hash.length ^ config.hash.length;
  for (let i = 0; i < Math.min(hash.length, config.hash.length); i++) diff |= hash.charCodeAt(i) ^ config.hash.charCodeAt(i);
  return diff === 0;
}

export function readLockConfig(): LockConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.lock);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as LockConfig;
    return cfg && cfg.v === 1 && cfg.hash && cfg.salt ? cfg : null;
  } catch {
    return null;
  }
}

export function writeLockConfig(config: LockConfig | null) {
  if (config) localStorage.setItem(STORAGE_KEYS.lock, JSON.stringify(config));
  else localStorage.removeItem(STORAGE_KEYS.lock);
}

// ---- Giới hạn số lần nhập sai (lưu lại để tải lại trang không né được) ----
export interface AttemptState {
  failed: number;
  until: number; // thời điểm (ms) hết bị khóa tạm
}

export function readAttempts(): AttemptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.lockAttempts);
    const a = raw ? (JSON.parse(raw) as AttemptState) : null;
    return a && typeof a.failed === 'number' ? a : { failed: 0, until: 0 };
  } catch {
    return { failed: 0, until: 0 };
  }
}

// Sai 5 lần -> chờ 30 giây; mỗi lần sai tiếp theo thời gian chờ gấp đôi (tối đa 15 phút)
export function recordFailedAttempt(): AttemptState {
  const prev = readAttempts();
  const failed = prev.failed + 1;
  const over = failed - MAX_FREE_ATTEMPTS;
  const until = over >= 0 ? Date.now() + Math.min(30_000 * 2 ** over, 15 * 60_000) : 0;
  const next = { failed, until };
  try {
    localStorage.setItem(STORAGE_KEYS.lockAttempts, JSON.stringify(next));
  } catch {
    // bỏ qua
  }
  return next;
}

export function resetAttempts() {
  try {
    localStorage.removeItem(STORAGE_KEYS.lockAttempts);
  } catch {
    // bỏ qua
  }
}
