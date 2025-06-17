import React from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TournamentPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          <div className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6">
            <Trophy className="h-12 w-12 text-yellow-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('tournament.comingSoonPage.title')}
            </h1>
          <p className="text-xl text-gray-400">
            {t('tournament.comingSoonPage.subtitle')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TournamentPage; 