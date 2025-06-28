import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, CheckSquare, Square } from 'lucide-react';
import { Modal } from './Modal';

interface VotingTipsProps {
  playerAName?: string;
  playerBName?: string;
}

export const VotingTips: React.FC<VotingTipsProps> = ({ 
  playerAName = 'Player A', 
  playerBName = 'Player B' 
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [criteria, setCriteria] = useState({
    technicality: null as 'A' | 'B' | null,
    musicality: null as 'A' | 'B' | null,
    originality: null as 'A' | 'B' | null,
    showmanship: null as 'A' | 'B' | null,
  });

  const toggleCriteria = (criterion: keyof typeof criteria, player: 'A' | 'B') => {
    setCriteria(prev => ({
      ...prev,
      [criterion]: prev[criterion] === player ? null : player
    }));
  };

  const criteriaList = [
    { key: 'technicality', name: t('battleView.criteria.technicality'), desc: t('battleView.criteria.technicalityDesc') },
    { key: 'musicality', name: t('battleView.criteria.musicality'), desc: t('battleView.criteria.musicalityDesc') },
    { key: 'originality', name: t('battleView.criteria.originality'), desc: t('battleView.criteria.originalityDesc') },
    { key: 'showmanship', name: t('battleView.criteria.showmanship'), desc: t('battleView.criteria.showmanshipDesc') },
  ];

  return (
    <>
      {/* Trigger Button */}
      <button 
        className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded-md transition-colors"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-md shadow-purple-500/50"></div>
        <span className="text-purple-400 text-xs font-bold">{t('battleView.votingGuide')}</span>
        <HelpCircle className="h-3 w-3 text-purple-400" />
      </button>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('battleView.evaluationCriteria')}
        size="md"
        topLayer={true}
        backgroundOpacity="light"
      >
        <div className="space-y-3">
          {/* Player Headers */}
          <div className="flex justify-between items-center mb-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
              <span className="text-cyan-300 font-medium">{playerAName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-pink-300 font-medium">{playerBName}</span>
              <div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div>
            </div>
          </div>

          {/* Criteria List */}
          <div className="space-y-3">
            {criteriaList.map((criterion, index) => (
              <div key={criterion.key} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                {/* Criterion Header with Checkboxes */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium text-sm">{criterion.name}</h4>
                  <div className="flex items-center gap-3">
                    {/* Player A Checkbox */}
                    <button
                      onClick={() => toggleCriteria(criterion.key as keyof typeof criteria, 'A')}
                      className="flex items-center gap-1.5 hover:bg-cyan-500/20 p-1.5 rounded transition-colors"
                    >
                      {criteria[criterion.key as keyof typeof criteria] === 'A' ? (
                        <CheckSquare className="h-4 w-4 text-cyan-400" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-500 hover:text-cyan-400" />
                      )}
                      <span className="text-xs text-cyan-300 font-medium">A</span>
                    </button>

                    {/* Player B Checkbox */}
                    <button
                      onClick={() => toggleCriteria(criterion.key as keyof typeof criteria, 'B')}
                      className="flex items-center gap-1.5 hover:bg-pink-500/20 p-1.5 rounded transition-colors"
                    >
                      {criteria[criterion.key as keyof typeof criteria] === 'B' ? (
                        <CheckSquare className="h-4 w-4 text-pink-400" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-500 hover:text-pink-400" />
                      )}
                      <span className="text-xs text-pink-300 font-medium">B</span>
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-xs leading-relaxed">{criterion.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom Note */}
          <div className="mt-4 pt-3 border-t border-gray-700 text-center">
            <p className="text-gray-500 text-xs">
              {t('battleView.tipsNote')}
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}; 