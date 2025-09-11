import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBattleStore } from '../../store/battleStore';
import { useTranslation } from 'react-i18next';
import { VSIcon } from '../ui/VSIcon';

interface SwipeToNextBattleProps {
  currentBattleId: string;
  renderVs?: boolean; // VSをこのコンポーネント内に表示し、スワイプでスライド
}

// シンプルなスワイプ検知（左右）で未投票バトルへランダム遷移
export const SwipeToNextBattle: React.FC<SwipeToNextBattleProps> = ({ currentBattleId, renderVs = false }) => {
  const navigate = useNavigate();
  const { activeBattles, fetchActiveBattles } = useBattleStore();
  const { t } = useTranslation();

  const [hint, setHint] = useState<string>(() => t('battleView.swipeHint', 'Swipe to explore new battles'));
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);
  const animating = useRef<boolean>(false);
  const [dragX, setDragX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  // 軽いスワイプでも遷移: 小さめの閾値と短い追従距離
  const threshold = 18;
  const maxFollow = 28;
  const pushDistance = 18; // 確定時に軽く押し出す距離
  const backDelay = 120;   // 押し出し後に戻し始めるまでの遅延
  const navDelay = 260;    // 戻し始めからナビ開始までの合計遅延
  const timers = useRef<number[]>([]);

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

  // モバイル用：アニメ表示後に遷移（爽快感フィードバック）
  const goWithSwipeFeedback = useCallback((dir: 'left' | 'right') => {
    if (animating.current) return;
    const target = pickRandomUnvotedBattle();
    if (!target) {
      setHint(t('battleView.noUnvotedBattles', 'No unvoted battles'));
      // 候補がない時も必ず原点へスナップバック
      setDragX(0);
      return;
    }
    animating.current = true;
    try {
      const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
      if (typeof nav.vibrate === 'function') {
        // 軽い触覚フィードバック（対応端末のみ）
        nav.vibrate([10, 20, 10]);
      }
  } catch {
      // no-op: 触覚フィードバック非対応端末や権限エラーなどは無視
    }
    // 1) 方向へ軽く押し出し
    setDragX(dir === 'left' ? -pushDistance : pushDistance);
    // 2) 少し待ってから原点にスナップバック
    timers.current.push(window.setTimeout(() => {
      setDragX(0);
    }, backDelay));
    // 3) 戻りアニメの体感後に遷移
    timers.current.push(window.setTimeout(() => {
      animating.current = false;
      navigate(`/battle/${target.id}`);
    }, navDelay));
  }, [navigate, pickRandomUnvotedBattle, t]);

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    isDragging.current = true;
    setIsSwiping(true);
  };

  const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!isDragging.current || startX.current == null || startY.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    // 垂直移動が大きすぎる場合は無視
    if (Math.abs(dy) > 60) return;
    const clamped = Math.max(-maxFollow, Math.min(maxFollow, dx));
    setDragX(clamped);
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!isDragging.current || startX.current == null || startY.current == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    isDragging.current = false;
    startX.current = null;
    startY.current = null;
    setIsSwiping(false);

    // 水平スワイプを判定（閾値 60px、縦の移動が過大でないこと）
    if (Math.abs(dx) >= threshold && Math.abs(dy) <= 40) {
      // VSを指の方向に軽くスライド -> スナップバック -> 遷移
  const dir = dx < 0 ? 'left' : 'right';
      // 今いる位置から押し出す距離だけ動かす
      setDragX(dir === 'left' ? -pushDistance : pushDistance);
      goWithSwipeFeedback(dir);
    } else {
      // 必ず元の位置へスナップバック
      setDragX(0);
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

  const vsStyle = useMemo<React.CSSProperties>(() => ({
    transform: `translateX(${dragX}px)`,
    transition: isSwiping ? 'none' : 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'transform',
  }), [dragX, isSwiping]);

  return (
    <div className="w-full select-none">
      {/* Mobile: スワイプUI */}
      <div
        className={`w-full md:hidden relative`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        {renderVs && (
          <div className="flex items-center justify-center">
            <div style={vsStyle} aria-hidden>
              <VSIcon className="w-20 h-20" />
            </div>
          </div>
        )}
        <div className="text-xs text-gray-400 text-center">{hint}</div>
        <div className="mt-1 text-[10px] text-gray-500 text-center">{t('battleView.swipeLabel', '⇠⇢ swipe')}</div>
      </div>

      {/* Desktop: VSの下にNEXTボタン */}
      <div className="hidden md:flex flex-col items-center justify-center">
        {renderVs && (
          <div className="mb-2">
            <VSIcon className="w-24 h-24" />
          </div>
        )}
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
