import React from 'react';
import { Modal } from './Modal';
import type { ScoreBreakdownEntry } from '../../types/scoreBreakdown';
import { useTranslation } from 'react-i18next';

interface ScoreBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ScoreBreakdownEntry[];
  loading?: boolean;
  title?: string;
}

export const ScoreBreakdownModal: React.FC<ScoreBreakdownModalProps> = ({ isOpen, onClose, entries, loading, title }) => {
  const { t } = useTranslation();

  const renderTotals = (sheet: ScoreBreakdownEntry['score_sheet']) => {
    const totalA = sheet.skills.A + sheet.musicality.A + sheet.originality.A;
    const totalB = sheet.skills.B + sheet.musicality.B + sheet.originality.B;
    return { totalA, totalB };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4 sm:p-6">
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title || t('battleView.scoreBreakdownTitle', 'スコア内訳')}</h2>
        </div>
        {loading ? (
          <div className="text-gray-300">{t('battleView.scoreBreakdown.loading', '読み込み中...')}</div>
        ) : entries.length === 0 ? (
          <div className="text-gray-400">{t('battleView.scoreBreakdown.noEntries', 'スコアシート付きの投票はまだありません。')}</div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {entries.map((e, idx) => {
              const { totalA, totalB } = renderTotals(e.score_sheet);
              return (
                <div key={`${e.user_id}-${idx}`} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                    <div className="flex items-center gap-2">
                      <span>
                        {t('battleView.scoreBreakdown.vote', '投票')}:&nbsp;
                        <span className={e.vote === 'A' ? 'text-cyan-300' : 'text-pink-300'}>{e.vote}</span>
                      </span>
                    </div>
                    <span>{new Date(e.created_at).toLocaleString(t('common.locale', 'ja-JP'))}</span>
                  </div>
                  {e.comment && (
                    <div className="text-gray-200 text-sm mb-3">{e.comment}</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { key: 'skills', a: e.score_sheet.skills.A, b: e.score_sheet.skills.B },
                      { key: 'musicality', a: e.score_sheet.musicality.A, b: e.score_sheet.musicality.B },
                      { key: 'originality', a: e.score_sheet.originality.A, b: e.score_sheet.originality.B },
                    ] as const).map((row) => (
                      <div key={row.key} className="rounded-md bg-gray-900/60 border border-gray-700 p-3">
                        <div className="text-gray-300 text-sm mb-2">{t(`battleView.scoreBreakdown.labels.${row.key}`, row.key)}</div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-xs text-gray-400">{t('common.playerAShort', 'A')}</div>
                            <div className="text-cyan-300 text-lg font-bold">{row.a}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 text-right">{t('common.playerBShort', 'B')}</div>
                            <div className="text-pink-300 text-lg font-bold text-right">{row.b}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-400">{t('battleView.scoreBreakdown.total', '合計')}</div>
                    <div className="flex items-center gap-6">
                      <div className="text-cyan-300 text-xl font-extrabold">{t('common.playerAShort', 'A')}: {totalA}</div>
                      <div className="text-pink-300 text-xl font-extrabold">{t('common.playerBShort', 'B')}: {totalB}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ScoreBreakdownModal;
