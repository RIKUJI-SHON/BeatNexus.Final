import React, { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Shield, Check, Eye, Loader2 } from 'lucide-react';
import { Reward } from '../../types/rewards';

interface FrameCardProps {
  frame: Reward;
  isEarned: boolean;
  isEquipped: boolean;
  earnedAt?: string;
  className?: string;
  showEquipButton?: boolean;
  showPreview?: boolean;
  onEquip?: (frameId: string) => Promise<void>;
  onUnequip?: () => Promise<void>;
  onPreview?: (frameId: string) => void;
}

const FrameCard: React.FC<FrameCardProps> = ({
  frame,
  isEarned,
  isEquipped,
  earnedAt,
  className = '',
  showEquipButton = true,
  showPreview = true,
  onEquip,
  onUnequip,
  onPreview
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const handleEquipToggle = async () => {
    if (!onEquip && !onUnequip) return;
    
    setIsLoading(true);
    try {
      if (isEquipped) {
        await onUnequip?.();
      } else {
        await onEquip?.(frame.id);
      }
    } catch (error) {
      console.error('Failed to toggle frame equipment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    onPreview?.(frame.id);
  };

  const handleCardClick = () => {
    if (isEarned) {
      setShowDetail(true);
    }
  };

  return (
    <>
      <div
        className={`
          group relative p-4 text-center transition-all duration-300 transform
          cursor-pointer hover:scale-105 hover:-translate-y-1
          bg-gradient-to-br rounded-lg border
          ${isEarned
            ? 'from-slate-800/80 to-slate-700/50 border-purple-500/50 hover:shadow-purple-500/20 hover:shadow-xl'
            : 'from-slate-800/30 to-slate-700/20 border-slate-600/20 opacity-60 hover:opacity-80'
          }
          ${isEquipped ? 'ring-2 ring-purple-400 ring-opacity-50' : ''}
          ${className}
        `}
        onClick={handleCardClick}
      >
        {/* 装備中インジケーター */}
        {isEquipped && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center z-10">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}

        {/* フレーム画像エリア */}
        <div className="relative mb-4">
          {isEarned ? (
            <div className="relative">
              <div className="h-20 w-20 mx-auto bg-gradient-to-br from-slate-600/80 to-slate-700/60 rounded-xl flex items-center justify-center border border-slate-500/50 transition-all duration-300 group-hover:scale-110">
                {frame.image_url ? (
                  <img
                    src={frame.image_url}
                    alt={frame.name}
                    className="h-16 w-16 object-contain rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <Shield className={`h-12 w-12 text-purple-400 ${frame.image_url ? 'hidden' : ''}`} />
              </div>
              
              {/* グロー効果 */}
              <div className="absolute inset-0 blur-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ) : (
            <div className="h-20 w-20 mx-auto bg-slate-700/40 rounded-xl flex items-center justify-center border border-slate-600/30 transition-all duration-300 group-hover:border-slate-500/50">
              <Shield className="h-12 w-12 text-slate-500 transition-colors duration-300 group-hover:text-slate-400" />
            </div>
          )}
        </div>

        {/* フレーム情報 */}
        <div className="space-y-3">
          <h3 className={`text-sm font-medium transition-colors duration-300 ${
            isEarned 
              ? 'text-slate-50 group-hover:text-purple-50' 
              : 'text-slate-500 group-hover:text-slate-400'
          }`}>
            {isEarned ? frame.name : '???'}
          </h3>
          
          <div className="flex items-center justify-center gap-2">
            <Badge 
              variant={isEarned ? 'default' : 'secondary'}
              className={`text-xs px-2 py-1 ${
                isEarned ? 'text-purple-400 border-purple-500/50' : 'text-slate-500'
              }`}
            >
              {isEarned ? 'フレーム' : '未獲得'}
            </Badge>
            {isEquipped && (
              <Badge variant="default" className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 border-purple-400/50">
                装備中
              </Badge>
            )}
          </div>

          {/* 獲得日時 */}
          {isEarned && earnedAt && (
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <span>{new Date(earnedAt).toLocaleDateString('ja-JP')}</span>
            </div>
          )}

          {/* アクションボタン */}
          {isEarned && (showEquipButton || showPreview) && (
            <div className="flex gap-2 justify-center mt-3">
              {showPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview();
                  }}
                  className="text-slate-400 hover:text-slate-300"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}
              
              {showEquipButton && (
                <Button
                  variant={isEquipped ? "secondary" : "primary"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEquipToggle();
                  }}
                  disabled={isLoading}
                  className={`text-xs ${
                    isEquipped 
                      ? 'border-purple-400/50 text-purple-300 hover:bg-purple-500/10' 
                      : 'bg-purple-600/80 hover:bg-purple-600 text-white border-purple-500/50'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isEquipped ? (
                    '解除'
                  ) : (
                    '装備'
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 未獲得オーバーレイ */}
        {!isEarned && (
          <div className="absolute inset-0 bg-slate-900/40 rounded-lg flex items-center justify-center">
            <div className="text-slate-400 text-xs font-medium px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-600/50">
              未獲得
            </div>
          </div>
        )}

        {/* ホバー効果オーバーレイ */}
        {isEarned && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>

      {/* 詳細モーダル */}
      {showDetail && isEarned && (
        <Modal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          title="フレーム詳細"
          size="md"
        >
          <div className="space-y-6">
            {/* フレーム画像（大） */}
            <div className="flex justify-center">
              <div className="relative p-6 bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-2xl border border-purple-500/50">
                <div className="h-24 w-24 bg-gradient-to-br from-slate-600/80 to-slate-700/60 rounded-xl flex items-center justify-center border border-slate-500/50">
                  {frame.image_url ? (
                    <img
                      src={frame.image_url}
                      alt={frame.name}
                      className="h-20 w-20 object-contain rounded-lg"
                    />
                  ) : (
                    <Shield className="h-16 w-16 text-purple-400" />
                  )}
                </div>
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 shadow-sm" />
              </div>
            </div>

            {/* フレーム情報 */}
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-bold text-slate-50">{frame.name}</h2>
              
              {frame.description && (
                <p className="text-slate-300 text-sm leading-relaxed">
                  {frame.description}
                </p>
              )}

              <div className="flex items-center justify-center gap-4">
                <Badge variant="default" className="text-purple-400 border border-purple-500/50">
                  <Shield className="h-3 w-3 mr-1" />
                  フレーム
                </Badge>
                {isEquipped && (
                  <Badge variant="default" className="bg-purple-500/20 text-purple-300 border-purple-400/50">
                    装備中
                  </Badge>
                )}
              </div>

              {earnedAt && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 pt-4 border-t border-slate-600/50">
                  <span>獲得日: {new Date(earnedAt).toLocaleDateString('ja-JP')}</span>
                </div>
              )}

              {/* モーダル内でのアクションボタン */}
              {showEquipButton && (
                <div className="pt-4">
                  <Button
                    variant={isEquipped ? "secondary" : "primary"}
                    onClick={handleEquipToggle}
                    disabled={isLoading}
                    className={`${
                      isEquipped 
                        ? 'border-purple-400/50 text-purple-300 hover:bg-purple-500/10' 
                        : 'bg-purple-600/80 hover:bg-purple-600 text-white border-purple-500/50'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? '処理中...' : isEquipped ? 'フレームを解除' : 'フレームを装備'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default FrameCard;
