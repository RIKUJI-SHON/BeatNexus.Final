import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBattleStore } from '../../store/battleStore';
import { useTranslation } from 'react-i18next';

interface SwipeToNextBattleProps {
  currentBattleId: string;
}

// シンプルなスワイプ検知（左右）で未投票バトルへランダム遷移
export const SwipeToNextBattle: React.FC<SwipeToNextBattleProps> = ({ currentBattleId }) => {
  const navigate = useNavigate();
  const { activeBattles, fetchActiveBattles } = useBattleStore();
  const { t } = useTranslation();

  const [hint, setHint] = useState<string>(() => t('battleView.swipeHint', 'Swipe to explore new battles'));
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    if (!activeBattles || activeBattles.length === 0) {
      // アクティブバトル未取得時にフェッチ（静かに）
      fetchActiveBattles().catch(() => {});
    }
  }, [activeBattles, fetchActiveBattles]);

  const pickRandomUnvotedBattle = useCallback(() => {
    const candidates = (activeBattles || []).filter(b => !b.current_user_voted && b.id !== currentBattleId);
    if (candidates.length === 0) return null;
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }, [activeBattles, currentBattleId]);

  const goToRandomBattle = useCallback(() => {
    const target = pickRandomUnvotedBattle();
    if (!target) {
    setHint(t('battleView.noUnvotedBattles', 'No unvoted battles'));
      return;
    }
    // 既存の遷移慣習に合わせて /battle/:id で遷移
    navigate(`/battle/${target.id}`);
  }, [navigate, pickRandomUnvotedBattle, t]);

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    isDragging.current = true;
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!isDragging.current || startX.current == null || startY.current == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    isDragging.current = false;
    startX.current = null;
    startY.current = null;

    // 水平スワイプを判定（閾値 60px、縦の移動が過大でないこと）
    if (Math.abs(dx) >= 60 && Math.abs(dy) <= 40) {
      goToRandomBattle();
    }
  };

  // デスクトップ用の簡易ドラッグ対応（任意）
  const mStart = useRef<{ x: number; y: number } | null>(null);
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    mStart.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!mStart.current) return;
    const dx = e.clientX - mStart.current.x;
    const dy = e.clientY - mStart.current.y;
    mStart.current = null;
    if (Math.abs(dx) >= 80 && Math.abs(dy) <= 50) {
      goToRandomBattle();
    }
  };

  // 言語切替時にヒント初期化
  useEffect(() => {
    setHint(t('battleView.swipeHint', 'Swipe to explore new battles'));
  }, [t]);

  return (
    <div className="w-full select-none">
      {/* Mobile: スワイプUI */}
      <div
        className="w-full md:hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        <div className="text-xs text-gray-400 text-center">{hint}</div>
        <div className="mt-1 text-[10px] text-gray-500 text-center">{t('battleView.swipeLabel', '⇠⇢ swipe')}</div>
      </div>

      {/* Desktop: 指定デザインのボタンUI */}
      <div className="hidden md:flex items-center justify-center">
    <div className="btn-conteiner">
          <button
            type="button"
            onClick={goToRandomBattle}
      className="btn-content btn-content--sm"
            aria-label={t('battleView.navigateNext', 'Next battle')}
            title={t('battleView.navigateNextTitle', 'Jump to a random unvoted battle')}
            disabled={(activeBattles || []).filter(b => !b.current_user_voted && b.id !== currentBattleId).length === 0}
          >
            {"NEXT"}
            <span className="icon-arrow" aria-hidden>
              <svg width="18" height="20" viewBox="0 0 66 43" xmlns="http://www.w3.org/2000/svg">
                <g id="arrow" fill="none" fillRule="evenodd">
                  <path id="arrow-icon-one" d="M40.154 3.894l2.104-2.163L65.64 24.813l-23.382 23.13-2.104-2.162 21.278-20.968z" fill="#FFF"></path>
                  <path id="arrow-icon-two" d="M18.154 3.894l2.104-2.163L43.64 24.813l-23.382 23.13-2.104-2.162L39.429 24.813z" fill="#FFF"></path>
                  <path id="arrow-icon-three" d="M-3.846 3.894L-1.742 1.731 21.64 24.813-1.742 47.943-3.846 45.781 17.432 24.813z" fill="#FFF"></path>
                </g>
              </svg>
            </span>
          </button>
        </div>
      </div>
      <div className="hidden md:block mt-1 text-center text-[11px] text-gray-500">
        {"クリックして次のバトルへ"}
      </div>
    </div>
  );
};
