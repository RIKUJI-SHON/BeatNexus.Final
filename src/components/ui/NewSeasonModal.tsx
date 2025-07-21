import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { Button } from './Button';
import { useModalStore } from '../../store/useModalStore';
import { PartyPopper } from 'lucide-react';

export const NewSeasonModal: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isNewSeasonModalOpen, closeNewSeasonModal } = useModalStore();
  const [showSparks, setShowSparks] = useState(false);

  useEffect(() => {
    if (isNewSeasonModalOpen) {
      setShowSparks(true);
      const timer = setTimeout(() => setShowSparks(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isNewSeasonModalOpen]);

  const handleNavigateToBattle = () => {
    navigate('/post');
    closeNewSeasonModal();
  };

  const handleNavigateToVote = () => {
    navigate('/battles');
    closeNewSeasonModal();
  };

  return (
    <>
      {showSparks && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="spark-container">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="spark-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.5}s`,
                  backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 4)]
                }}
              />
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isNewSeasonModalOpen} onClose={closeNewSeasonModal} plain>
        <div className="flex justify-center">
          <div className="onboarding-card relative w-[340px] md:w-96 max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeNewSeasonModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700 z-10"
            >
              ✕
            </button>
            <div className="onboarding-content text-center px-4 py-6 text-sm">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto flex items-center justify-center text-yellow-400">
                  <PartyPopper size={80} />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">
                {t('newSeasonModal.title')}
              </h2>

              <p className="text-gray-300 mb-6">
                {t('newSeasonModal.description')}
              </p>

              <div className="space-y-4">
                <Button onClick={handleNavigateToBattle} variant="primary" className="w-full">
                  {t('newSeasonModal.goToBattle')}
                </Button>
                <Button onClick={handleNavigateToVote} variant="secondary" className="w-full">
                  {t('newSeasonModal.goToVote')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
