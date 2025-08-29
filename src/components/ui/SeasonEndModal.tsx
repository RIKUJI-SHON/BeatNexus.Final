import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import { useSeasonEndStore } from '../../store/seasonEndStore';
import { Trophy, ThumbsUp } from 'lucide-react';

export const SeasonEndModal: React.FC = () => {
  const { t } = useTranslation();
  const { isModalOpen, result, closeSeasonEndModal } = useSeasonEndStore();

  if (!isModalOpen || !result) return null;

  const playerJoined = Number.isFinite(result.playerRank as number) && (result.playerRank as number) > 0;
  const voterJoined = Number.isFinite(result.voterRank as number) && (result.voterRank as number) > 0;

  return (
    <Modal isOpen={isModalOpen} onClose={closeSeasonEndModal} plain>
      <div className="flex justify-center">
        <div className="onboarding-card relative w-[340px] md:w-96 max-h-[90vh] overflow-y-auto">
          <button
            onClick={closeSeasonEndModal}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700 z-10"
          >
            ✕
          </button>

          <div className="onboarding-content px-4 py-6 text-sm">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {t('seasonEndModal.title', 'シーズンが終了しました')}
              </h2>
              {result.seasonName && (
                <p className="text-gray-300 mt-1">{result.seasonName}</p>
              )}
            </div>

            <div className="space-y-3">
              {/* Player ranking card */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-white">
                    {t('seasonEndModal.playerRanking', 'プレイヤーランキング')}
                  </h3>
                </div>
                {playerJoined ? (
                  <div className="text-gray-200">
                    <div className="text-2xl font-bold">#{result.playerRank}</div>
                    {Number.isFinite(result.playerPoints as number) && (
                      <div className="text-gray-300 mt-1">
                        {t('seasonEndModal.points', { defaultValue: '{{points}} pt', points: result.playerPoints })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">
                    {t('seasonEndModal.playerNoParticipation', '今シーズンはバトルに参加していません。')}
                  </p>
                )}
              </div>

              {/* Voter ranking card */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ThumbsUp className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white">
                    {t('seasonEndModal.voterRanking', '投票ランキング')}
                  </h3>
                </div>
                {voterJoined ? (
                  <div className="text-gray-200">
                    <div className="text-2xl font-bold">#{result.voterRank}</div>
                    {Number.isFinite(result.voterPoints as number) && (
                      <div className="text-gray-300 mt-1">
                        {t('seasonEndModal.votes', { defaultValue: '{{points}} pt', points: result.voterPoints })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">
                    {t('seasonEndModal.voterNoParticipation', '今シーズンは投票に参加していません。')}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Button onClick={closeSeasonEndModal} variant="primary" className="w-full">
                {t('common.ok', 'OK')}
              </Button>
              <div className="text-center">
                <a href="/ranking" className="text-sm text-blue-400 hover:underline">
                  {t('seasonEndModal.viewFullRanking', 'ランキングを詳しく見る')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SeasonEndModal;
