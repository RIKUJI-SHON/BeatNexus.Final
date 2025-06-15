import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-red-500 text-white p-3 rounded-lg shadow-lg flex items-center">
        <WifiOff className="w-5 h-5 mr-2 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {t('offline.title', 'オフライン')}
          </p>
          <p className="text-xs opacity-90">
            {t('offline.description', 'インターネット接続を確認してください')}
          </p>
        </div>
      </div>
    </div>
  );
};

export const OnlineIndicator: React.FC = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [showOnlineMessage, setShowOnlineMessage] = React.useState(false);

  React.useEffect(() => {
    if (isOnline) {
      setShowOnlineMessage(true);
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!isOnline || !showOnlineMessage) {
    return null;
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-green-500 text-white p-3 rounded-lg shadow-lg flex items-center">
        <Wifi className="w-5 h-5 mr-2 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {t('online.title', 'オンライン')}
          </p>
          <p className="text-xs opacity-90">
            {t('online.description', '接続が復旧しました')}
          </p>
        </div>
      </div>
    </div>
  );
}; 