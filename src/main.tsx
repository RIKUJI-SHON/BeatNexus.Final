import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n';
import './index.css';

// Service Worker 登録ガード（要件RQ-01, RQ-02）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
      .then((registration) => {
        console.info('[SW] Service Worker registered successfully:', registration.scope);
        
        // 更新があるかチェック
        registration.addEventListener('updatefound', () => {
          console.info('[SW] New Service Worker version found');
        });
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });
  });
  
  // Service Worker メッセージの受信
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.info('[SW] Message from Service Worker:', event.data);
  });
} else if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  // DEV: 既存 SW が残っている場合に備えて明示的に解除（要件RQ-02）
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
    if (registrations.length > 0) {
      console.info('[SW] Unregistered all existing Service Workers in DEV environment');
    }
  }).catch((error) => {
    console.warn('[SW] Failed to unregister existing Service Workers:', error);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);