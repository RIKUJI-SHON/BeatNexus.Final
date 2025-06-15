import React from 'react';
import { Download } from 'lucide-react';

export const PWADebugButton: React.FC = () => {
  const handleForceShowInstall = () => {
    // PWAの状態をデバッグ
    console.log('=== PWA Debug Info ===');
    console.log('1. Service Worker Support:', 'serviceWorker' in navigator);
    console.log('2. Secure Context:', window.isSecureContext);
    console.log('3. Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
    console.log('4. iOS Standalone:', (window.navigator as any).standalone);
    console.log('5. User Agent:', navigator.userAgent);
    console.log('6. Protocol:', window.location.protocol);
    console.log('7. Host:', window.location.host);
    
    // Service Worker registration status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('8. SW Registrations:', registrations.length);
        registrations.forEach((reg, i) => {
          console.log(`   SW ${i + 1}:`, {
            scope: reg.scope,
            active: !!reg.active,
            installing: !!reg.installing,
            waiting: !!reg.waiting
          });
        });
      });
    }
    
    // Manifest check
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    console.log('9. Manifest Link:', manifestLink?.href);
    
    // Check if beforeinstallprompt was fired
    console.log('10. Check localStorage for prompt dismissal:', localStorage.getItem('pwa-install-dismissed'));
    
    // Check icon files accessibility
    console.log('11. Testing icon file access...');
    const iconUrls = [
      '/bn_icon_192.png',
      '/bn_icon_512.png',
      '/images/VS.png'
    ];
    
    iconUrls.forEach(async (url) => {
      try {
        const response = await fetch(url);
        console.log(`    ${url}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`    ${url}: FETCH ERROR`, error);
      }
    });
    
    alert('PWAデバッグ情報をコンソールに出力しました。開発者ツールのConsoleタブを確認してください。');
  };

  // 開発環境またはlocalhost, vercel.appでのみ表示
  const isDebugMode = process.env.NODE_ENV === 'development' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname.includes('vercel.app');

  if (!isDebugMode) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={handleForceShowInstall}
        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <Download className="h-4 w-4" />
        PWA Debug
      </button>
    </div>
  );
}; 