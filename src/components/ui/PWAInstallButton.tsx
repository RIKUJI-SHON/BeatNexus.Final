import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const PWAInstallButton: React.FC = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWAがすでにインストールされているかチェック
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // iOS Safari の場合
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    checkIfInstalled();

    // beforeinstallprompt イベントをリッスン
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // デフォルトのインストールバナーを防ぐ
      e.preventDefault();
      setDeferredPrompt(e);
      
      // ユーザーがまだインストールしていない場合のみ表示
      if (!isInstalled) {
        setShowInstallBanner(true);
      }
    };

    // アプリがインストールされた時のイベント
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // インストールプロンプトを表示
    deferredPrompt.prompt();

    // ユーザーの選択を待つ
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    // 24時間後に再度表示するためのローカルストレージ設定
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // すでにインストール済みまたは表示条件を満たさない場合は何も表示しない
  if (isInstalled || !showInstallBanner || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-4 rounded-lg shadow-lg text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Download className="w-5 h-5 mr-2" />
              <h3 className="font-semibold text-sm">
                {t('pwa.install.title', 'アプリをインストール')}
              </h3>
            </div>
            <p className="text-xs opacity-90 mb-3">
              {t('pwa.install.description', 'BeatNexusをホーム画面に追加して、より快適にご利用いただけます。')}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleInstallClick}
                className="bg-white text-gray-900 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
              >
                {t('pwa.install.button', 'インストール')}
              </button>
              <button
                onClick={handleDismiss}
                className="text-white/80 px-3 py-1.5 rounded text-xs hover:text-white transition-colors"
              >
                {t('pwa.install.later', '後で')}
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}; 