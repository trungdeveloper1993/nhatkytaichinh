import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PrivacyProvider } from './PrivacyContext.tsx';
import { ToastProvider } from './ToastContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivacyProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </PrivacyProvider>
  </StrictMode>,
);
