// Đăng ký service worker: chạy offline + cập nhật phiên bản như một phần mềm.
// Không phụ thuộc React để main.tsx gọi được trước khi render.

type Listener = () => void;

let waitingWorker: ServiceWorker | null = null;
let registration: Promise<ServiceWorkerRegistration | null> | null = null;
const listeners = new Set<Listener>();

function markWaiting(worker: ServiceWorker) {
  waitingWorker = worker;
  listeners.forEach((listener) => listener());
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || registration) return;

  // Chỉ tự tải lại khi trang đang chạy bản cũ (lần cài đầu tiên thì không)
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  registration = new Promise((resolve) => {
    const register = async () => {
      try {
        const base = import.meta.env.BASE_URL;
        const reg = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });

        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          const check = () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) markWaiting(worker);
          };
          worker.addEventListener('statechange', check);
          check();
        };
        if (reg.waiting && navigator.serviceWorker.controller) markWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => watch(reg.installing));

        // App cài trên điện thoại thường để mở rất lâu -> kiểm tra bản mới mỗi lần quay lại
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
        resolve(reg);
      } catch {
        resolve(null);
      }
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  });
}

export function isUpdateReady() {
  return waitingWorker !== null;
}

export function onUpdateReady(listener: Listener): () => void {
  listeners.add(listener);
  if (waitingWorker) listener();
  return () => {
    listeners.delete(listener);
  };
}

// Kích hoạt bản mới; trang sẽ tự tải lại khi bản mới nắm quyền (controllerchange)
export function applyUpdate() {
  if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  else window.location.reload();
}

export type UpdateCheckResult = 'ready' | 'downloading' | 'latest' | 'unavailable';

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (waitingWorker) return 'ready';
  const reg = registration ? await registration : null;
  if (!reg) return 'unavailable';
  try {
    await reg.update();
  } catch {
    return 'unavailable';
  }
  if (reg.waiting && navigator.serviceWorker.controller) return 'ready';
  if (reg.installing) return 'downloading';
  return 'latest';
}

// Xin trình duyệt giữ dữ liệu vĩnh viễn (không tự xóa khi máy thiếu bộ nhớ).
// Chỉ tự xin ở nơi không hiện hộp thoại hỏi (Chrome/Edge, app đã cài); Firefox sẽ hỏi nên để người dùng tự bấm trong Cài đặt.
export async function autoPersistStorage(isStandalone: boolean) {
  try {
    if (!navigator.storage?.persist || (await navigator.storage.persisted())) return;
    if ('userAgentData' in navigator || isStandalone) await navigator.storage.persist();
  } catch {
    // Bỏ qua: trình duyệt không hỗ trợ
  }
}
