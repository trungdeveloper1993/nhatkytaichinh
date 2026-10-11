import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PrivacyProvider } from './PrivacyContext.tsx';
import { ToastProvider } from './ToastContext.tsx';
import { DialogProvider } from './DialogContext.tsx';
import { isStandaloneApp } from './hooks.ts';
import { autoPersistStorage, registerServiceWorker } from './pwa/register.ts';
import './index.css';

// Bắt sớm sự kiện "cài đặt ứng dụng" (Android/Chrome) trước khi React kịp lắng nghe
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredInstallPrompt = e as typeof window.__deferredInstallPrompt;
  window.dispatchEvent(new Event('installpromptready'));
});

// Chạy offline + nhận bản cập nhật; xin giữ dữ liệu không bị trình duyệt tự xóa
registerServiceWorker();
autoPersistStorage(isStandaloneApp());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivacyProvider>
      <ToastProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </ToastProvider>
    </PrivacyProvider>
  </StrictMode>,
);
