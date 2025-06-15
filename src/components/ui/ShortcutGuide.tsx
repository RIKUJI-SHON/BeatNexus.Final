import React, { useState, useEffect } from 'react';
import { Smartphone, X, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ShortcutGuide: React.FC = () => {
  const { t } = useTranslation();
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWAがインストールされているかチェック
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

    // インストール済みで、ガイドを表示したことがない場合のみ表示
    const hasShownGuide = localStorage.getItem('shortcut-guide-shown');
    if (isInstalled && !hasShownGuide) {
      const timer = setTimeout(() => {
        setShowGuide(true);
      }, 3000); // 3秒後に表示
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  const handleDismiss = () => {
    setShowGuide(false);
    localStorage.setItem('shortcut-guide-shown', 'true');
  };

  // インストールされていない、または既に表示済みの場合は何も表示しない
  if (!isInstalled || !showGuide) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-lg shadow-lg text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Smartphone className="w-5 h-5 mr-2" />
              <h3 className="font-semibold text-sm">
                {t('shortcuts.guide.title', 'ショートカット機能')}
              </h3>
            </div>
            <p className="text-xs opacity-90 mb-3">
              {t('shortcuts.guide.description', 'アプリアイコンを長押しして、よく使う機能に素早くアクセスできます！')}
            </p>
            
            {/* ショートカット一覧 */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 bg-red-500 rounded-sm mr-2"></div>
                <span>{t('shortcuts.battles', 'バトル一覧')}</span>
              </div>
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 bg-green-500 rounded-sm mr-2"></div>
                <span>{t('shortcuts.post', '動画投稿')}</span>
              </div>
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 bg-yellow-500 rounded-sm mr-2"></div>
                <span>{t('shortcuts.ranking', 'ランキング')}</span>
              </div>
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 bg-purple-500 rounded-sm mr-2"></div>
                <span>{t('shortcuts.myBattles', 'マイバトル')}</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleDismiss}
                className="bg-white text-gray-900 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
              >
                {t('shortcuts.guide.gotIt', '了解！')}
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