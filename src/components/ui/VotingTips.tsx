import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<string | null>(null); // null = 全て閉じた状態
  const [scores, setScores] = useState({
    technicality: null as number | null, // null = 未設定
    musicality: null as number | null,
    originality: null as number | null,
    showmanship: null as number | null,
  });

  const handleScoreChange = (criterion: keyof typeof scores, value: number) => {
    setScores(prev => ({
      ...prev,
      [criterion]: value
    }));
  };

  const toggleTab = (tabKey: string) => {
    setActiveTab(activeTab === tabKey ? null : tabKey);
  };

  // 合計点数を計算（メモ化でパフォーマンス最適化）
  const totalScores = useMemo(() => {
    const criteriaKeys = ['technicality', 'musicality', 'originality', 'showmanship'] as const;
    let playerATotal = 0;
    let playerBTotal = 0;
    let setCount = 0;

    criteriaKeys.forEach(key => {
      const score = scores[key];
      if (score !== null) {
        playerATotal += score;
        playerBTotal += (10 - score);
        setCount++;
      }
    });

    return {
      playerATotal,
      playerBTotal,
      setCount,
      maxPossible: setCount * 10
    };
  }, [scores]);

  const getScoreDisplay = (criterion: keyof typeof scores) => {
    const score = scores[criterion];
    if (score === null) {
      return { 
        text: t('battleView.notSet'), 
        className: 'text-gray-500',
        titleColor: 'text-white',
        scoreElement: null
      };
    }
    
    const playerAScore = score;
    const playerBScore = 10 - score;
    
    // 評価項目名の色を決定
    let titleColor = 'text-white';
    if (playerAScore > playerBScore) {
      titleColor = 'text-cyan-300';
    } else if (playerBScore > playerAScore) {
      titleColor = 'text-pink-300';
    }
    
    // 色付き点数要素を作成
    const scoreElement = (
      <span className="text-xs">
        <span className="text-cyan-300 font-medium">{playerAScore}</span>
        <span className="text-gray-400 mx-1">:</span>
        <span className="text-pink-300 font-medium">{playerBScore}</span>
      </span>
    );
    
    return {
      text: `${playerAScore}:${playerBScore}`,
      className: 'text-white',
      titleColor,
      scoreElement
    };
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
          {/* Total Scores Display */}
          <div className="text-sm font-medium text-white mb-2 text-center">{t('battleView.totalScores')}</div>
          <div className="flex justify-center items-end gap-2 text-3xl font-bold select-none">
            <span className="text-cyan-300 leading-none">
              {totalScores.playerATotal}
            </span>
            <span className="text-gray-400 text-2xl leading-none">:</span>
            <span className="text-pink-300 leading-none">
              {totalScores.playerBTotal}
            </span>
          </div>
          {totalScores.setCount < 4 && (
            <div className="text-xs text-gray-500 text-center mt-2 mb-3">
              {t('battleView.unsetItems', { count: 4 - totalScores.setCount })}
            </div>
          )}

          {/* Vertical Accordion Style Tabs */}
          <div className="space-y-2">
            {criteriaList.map((criterion) => {
              const scoreDisplay = getScoreDisplay(criterion.key as keyof typeof scores);
              const isExpanded = activeTab === criterion.key;
              const score = scores[criterion.key as keyof typeof scores];
              
              return (
                <div key={criterion.key} className="border border-gray-700 rounded-lg overflow-hidden">
                  {/* Tab Header */}
                  <button
                    onClick={() => toggleTab(criterion.key)}
                    className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 transition-colors text-left flex items-center justify-between"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-sm font-medium ${scoreDisplay.titleColor}`}>
                        {criterion.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {scoreDisplay.scoreElement || (
                          <span className={`text-xs ${scoreDisplay.className}`}>
                            {scoreDisplay.text}
                          </span>
                        )}
                        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                                         <div className="bg-gray-900 border-t border-gray-700 p-4 animate-fade-in">
                      {/* Criterion Description */}
                      <p className="text-gray-300 text-xs leading-relaxed mb-4">
                        {criterion.desc}
                      </p>

                      {/* Score Distribution */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-cyan-300 font-medium">
                            {playerAName}: {score !== null ? score : 5}点
                          </span>
                          <span className="text-pink-300 font-medium">
                            {playerBName}: {score !== null ? 10 - score : 5}点
                          </span>
                        </div>

                        {/* Linear Scale Slider */}
                        <div className="relative">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="1"
                            value={score !== null ? score : 5}
                            onChange={(e) => handleScoreChange(criterion.key as keyof typeof scores, parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(score !== null ? score : 5) * 10}%, #ec4899 ${(score !== null ? score : 5) * 10}%, #ec4899 100%)`
                            }}
                          />
                          
                          {/* Scale Markers */}
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            {[...Array(11)].map((_, i) => (
                              <span key={i} className="text-center">
                                {i}
                              </span>
                            ))}
                          </div>
                        </div>


                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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