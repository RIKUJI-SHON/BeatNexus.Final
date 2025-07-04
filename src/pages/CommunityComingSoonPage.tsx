import React from 'react';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// コミュニティ機能準備中のお知らせページ
// TournamentPage と同じレイアウトで、アイコンと翻訳キーのみ変更しています。
const CommunityComingSoonPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          {/* 円形のグラデーション背景付きアイコン */}
          <div className="p-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6">
            <Users className="h-12 w-12 text-cyan-400" />
          </div>
          {/* タイトルとサブタイトル */}
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('community.title', 'Community')}
          </h1>
          <p className="text-xl text-gray-400">
            {t('comingSoon.title', 'Coming Soon')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommunityComingSoonPage; 