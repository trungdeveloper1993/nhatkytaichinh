import { useCallback, useEffect, useState } from 'react';
import { applyUpdate, checkForUpdate, isUpdateReady, onUpdateReady } from './pwa/register';

// Theo dõi một media query (vd. '(min-width: 640px)')
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

// Sự kiện cài đặt PWA (Android / Chrome desktop). main.tsx bắt sớm vào window.__deferredInstallPrompt
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __deferredInstallPrompt?: InstallPromptEvent | null;
  }
}

export function isStandaloneApp(): boolean {
  return (
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(() => window.__deferredInstallPrompt || null);
  const [installed, setInstalled] = useState(isStandaloneApp);

  useEffect(() => {
    const onReady = () => setPromptEvent(window.__deferredInstallPrompt || null);
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('installpromptready', onReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('installpromptready', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    window.__deferredInstallPrompt = null;
    setPromptEvent(null);
    return choice.outcome === 'accepted';
  }, [promptEvent]);

  return { canInstall: !!promptEvent && !installed, installed, install };
}

// State được lưu vào localStorage (bỏ qua lỗi khi trình duyệt chặn lưu trữ)
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // bỏ qua
      }
    },
    [key]
  );

  return [value, set];
}

// Trạng thái "có bản cập nhật mới" của app (service worker)
export function useAppUpdate() {
  const [updateReady, setUpdateReady] = useState(isUpdateReady);
  useEffect(() => onUpdateReady(() => setUpdateReady(true)), []);
  return { updateReady, applyUpdate, checkForUpdate };
}

// Bộ nhớ bền vững: trình duyệt hứa không tự xóa dữ liệu của app
export function useStoragePersistence() {
  const supported = typeof navigator !== 'undefined' && !!navigator.storage?.persist;
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supported) return;
    navigator.storage
      .persisted()
      .then(setPersisted)
      .catch(() => setPersisted(false));
  }, [supported]);

  const request = useCallback(async () => {
    if (!supported) return false;
    try {
      const granted = await navigator.storage.persist();
      setPersisted(granted);
      return granted;
    } catch {
      return false;
    }
  }, [supported]);

  return { supported, persisted, request };
}
