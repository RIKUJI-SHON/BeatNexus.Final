import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = window.navigator as NavigatorWithStandalone & { maxTouchPoints?: number };
    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = (window.navigator.platform || '').toLowerCase();
    const detectedIOS = /iphone|ipad|ipod/.test(userAgent) || (platform === 'macintel' && (navigatorWithStandalone.maxTouchPoints ?? 0) > 1);
    setIsIOS(detectedIOS);

    // PWAが既にインストールされているかチェック
    const checkIfInstalled = () => {
      // display-modeがstandaloneの場合、PWAとして起動している
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      // iOSの場合はnavigator.standaloneをチェック
      if (navigatorWithStandalone.standalone === true) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkIfInstalled()) {
      return;
    }

    // beforeinstallpromptイベントをキャプチャ
    const handleBeforeInstallPrompt = (e: Event) => {
      // デフォルトの動作を防止
      e.preventDefault();
      // イベントを保存して後で使用
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // インストール完了を検知
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // インストールプロンプトを表示
    await deferredPrompt.prompt();

    // ユーザーの選択を取得
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // プロンプトは一度しか使用できないため、クリア
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    handleInstallClick,
  };
};
