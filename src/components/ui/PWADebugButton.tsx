import React from 'react';
import { Download } from 'lucide-react';

export const PWADebugButton: React.FC = () => {
  const handleForceShowInstall = async () => {
    // PWAの状態をデバッグ
    console.log('=== Native PWA Debug Info ===');
    console.log('1. Service Worker Support:', 'serviceWorker' in navigator);
    console.log('2. Secure Context:', window.isSecureContext);
    console.log('3. Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
    console.log('4. iOS Standalone:', (window.navigator as any).standalone);
    console.log('5. User Agent:', navigator.userAgent);
    console.log('6. Protocol:', window.location.protocol);
    console.log('7. Host:', window.location.host);
    
    // Service Worker registration status
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('8. SW Registrations:', registrations.length);
        registrations.forEach((reg, i) => {
          console.log(`   SW ${i + 1}:`, {
            scope: reg.scope,
            active: !!reg.active,
            installing: !!reg.installing,
            waiting: !!reg.waiting,
            scriptURL: reg.active?.scriptURL
          });
        });
      } catch (error) {
        console.log('8. SW Error:', error);
      }
    }
    
    // Manifest check
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    console.log('9. Manifest Link:', manifestLink?.href);
    
    // Test manifest accessibility
    try {
      const manifestResponse = await fetch('/manifest.webmanifest');
      console.log('10. Manifest fetch status:', manifestResponse.status, manifestResponse.statusText);
      if (manifestResponse.ok) {
        const manifestData = await manifestResponse.json();
        console.log('11. Manifest content:', manifestData);
      }
    } catch (error) {
      console.log('10. Manifest fetch error:', error);
    }
    
    // Check icon files accessibility
    console.log('12. Testing essential files...');
    const testUrls = [
      '/vite.svg',
      '/sw.js'
    ];
    
    for (const url of testUrls) {
      try {
        const response = await fetch(url);
        console.log(`    ${url}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`    ${url}: FETCH ERROR`, error);
      }
    }
    
    // Check for beforeinstallprompt event
    console.log('13. Checking for install prompt...');
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('beforeinstallprompt event fired!', e);
    });
    
    alert('ネイティブPWAデバッグ情報をコンソールに出力しました。\n\nインストールプロンプトが表示されない場合:\n1. HTTPS環境であることを確認\n2. Service Workerが正常に登録されていることを確認\n3. manifestファイルが正常に読み込まれていることを確認\n4. ブラウザでサイトを数回訪問してください');
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