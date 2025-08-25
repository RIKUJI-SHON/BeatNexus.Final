import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

interface SuperTipVoteModalProps {
  isOpen: boolean;
  battleId: string;
  player?: 'A' | 'B';
  playerName?: string;
  playerUserId?: string; // 支援対象プレイヤーのユーザーID
  playerAId?: string; // プレイヤーAのユーザーID
  playerBId?: string; // プレイヤーBのユーザーID
  onClose: () => void;
  onSuccess: (result: {
    vote: 'A' | 'B';
    comment: string;
    amount: number;
    voteId?: string;
    transactionId?: string;
  }) => void;
}

const SUPER_TIP_PRESETS = [
  { amount: 100, label: '¥100', description: 'ちょっとした応援' },
  { amount: 300, label: '¥300', description: 'バッジ表示' },
  { amount: 500, label: '¥500', description: '強調表示' },
  { amount: 1000, label: '¥1,000', description: 'ピン留め' },
];

export const SuperTipVoteModal: React.FC<SuperTipVoteModalProps> = ({
  isOpen,
  battleId,
  player,
  playerName,
  playerUserId,
  playerAId,
  playerBId,
  onClose
}) => {
  // 🚦 機能フラグチェック
  const { isSuperTipEnabled } = useFeatureFlags();
  
  const [selectedVote, setSelectedVote] = useState<'A' | 'B' | null>(player || null);
  const [comment, setComment] = useState('');
  const [superTipAmount, setSuperTipAmount] = useState(300);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [battleData, setBattleData] = useState<{
    player1_user_id: string;
    player2_user_id: string;
  } | null>(null);

  // バトル情報を取得
  React.useEffect(() => {
    if (isOpen && battleId && isSuperTipEnabled) {
      const fetchBattleData = async () => {
        try {
          const { data, error } = await supabase
            .from('active_battles')
            .select('player1_user_id, player2_user_id')
            .eq('id', battleId)
            .single();

          if (error) {
            console.error('Battle data fetch error:', error);
            setError('バトル情報の取得に失敗しました');
            return;
          }

          setBattleData(data);
        } catch (error) {
          console.error('Battle data fetch error:', error);
          setError('バトル情報の取得に失敗しました');
        }
      };

      fetchBattleData();
    }
  }, [isOpen, battleId, isSuperTipEnabled]);

  // SuperTip機能が無効な場合は何も表示しない
  if (!isSuperTipEnabled) {
    return null;
  }

  const handleVoteSelect = (vote: 'A' | 'B') => {
    setSelectedVote(vote);
  };

  const handleAmountSelect = (amount: number) => {
    setSuperTipAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setSuperTipAmount(numValue);
      setCustomAmount(value);
    } else {
      setCustomAmount(value);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVote || !comment.trim()) {
      setError('投票とコメントを入力してください');
      return;
    }

    // 実際に使用する金額を決定（カスタム金額があればそれを、なければプリセット金額を使用）
    const actualAmount = customAmount ? parseInt(customAmount) : superTipAmount;
    
    if (isNaN(actualAmount) || actualAmount < 100 || actualAmount > 10000) {
      setError('金額は100円から10,000円の間で入力してください');
      return;
    }

    // 支援対象プレイヤーのユーザーIDを決定
    let targetPlayerUserId: string;
    if (playerUserId) {
      // 事前に指定されている場合
      targetPlayerUserId = playerUserId;
    } else if (battleData) {
      // バトルデータから取得
      if (selectedVote === 'A') {
        targetPlayerUserId = battleData.player1_user_id;
      } else {
        targetPlayerUserId = battleData.player2_user_id;
      }
    } else if (selectedVote === 'A' && playerAId) {
      targetPlayerUserId = playerAId;
    } else if (selectedVote === 'B' && playerBId) {
      targetPlayerUserId = playerBId;
    } else {
      setError('プレイヤー情報が不足しています');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      console.log('🎯 Submitting SuperTip vote...', {
        battleId,
        vote: selectedVote,
        amount: actualAmount,
        playerUserId: targetPlayerUserId
      });

      // SuperTip投票APIを呼び出し
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-super-tip-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            battleId,
            vote: selectedVote,
            comment: comment.trim(),
            superTipAmount: actualAmount,
            playerUserId: targetPlayerUserId
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Checkout Session作成に失敗しました');
      }

      console.log('✅ Stripe Checkout Session created:', result.session_id);

      // Stripe Checkoutページに遷移
      if (result.checkout_url) {
        console.log('� Redirecting to Stripe Checkout:', result.checkout_url);
        window.location.href = result.checkout_url;
      } else {
        throw new Error('Checkout URLが取得できませんでした');
      }

    } catch (error) {
      console.error('❌ SuperTip error:', error);
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-800 border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              🎵 SuperTip で投票
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          <p className="text-gray-400 text-sm mb-6">
            {playerName ? `${playerName}` : `Player ${selectedVote}`}を応援してSuperTipを送ろう！
            投票結果には影響しません。
          </p>

          {/* 投票選択（プレイヤーが事前選択されていない場合のみ表示） */}
          {!player && (
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">
                投票先を選択
              </label>
              <div className="flex gap-3">
                <Button
                  variant={selectedVote === 'A' ? 'primary' : 'secondary'}
                  onClick={() => handleVoteSelect('A')}
                  className="flex-1"
                >
                  プレイヤーA
                </Button>
                <Button
                  variant={selectedVote === 'B' ? 'primary' : 'secondary'}
                  onClick={() => handleVoteSelect('B')}
                  className="flex-1"
                >
                  プレイヤーB
                </Button>
              </div>
            </div>
          )}

          {/* コメント入力 */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">
              コメント（必須）
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="プレイヤーへの応援メッセージを入力..."
              className="bg-gray-700 border-gray-600 text-white"
              maxLength={500}
            />
            <p className="text-gray-400 text-xs mt-1">
              {comment.length}/500文字
            </p>
          </div>

          {/* SuperTip金額選択 */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-3">
              SuperTip金額を選択
            </label>
            
            {/* プリセット金額 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {SUPER_TIP_PRESETS.map((preset) => (
                <button
                  key={preset.amount}
                  onClick={() => handleAmountSelect(preset.amount)}
                  className={`p-3 rounded-lg border transition-all text-center ${
                    superTipAmount === preset.amount && !customAmount
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 border-yellow-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-bold text-lg">{preset.label}</div>
                  <div className="text-xs opacity-80">{preset.description}</div>
                </button>
              ))}
            </div>

            {/* カスタム金額入力 */}
            <div className="space-y-2">
              <label className="block text-sm text-gray-300">
                カスタム金額（100円〜10,000円）
              </label>
              <div className="flex items-center gap-2">
                <span className="text-white">¥</span>
                <Input
                  type="number"
                  value={customAmount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                  placeholder="金額を入力..."
                  min="100"
                  max="10000"
                  className="bg-gray-700 border-gray-600 text-white flex-1"
                />
              </div>
              {customAmount && (
                <p className="text-xs text-gray-400">
                  カスタム金額: ¥{customAmount}
                </p>
              )}
            </div>
          </div>

          {/* 手数料情報 */}
          <div className="mb-6 p-3 bg-gray-700 rounded">
            <div className="text-sm text-gray-300">
              <div className="flex justify-between">
                <span>SuperTip金額:</span>
                <span>¥{customAmount ? parseInt(customAmount) || 0 : superTipAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>プラットフォーム手数料 (10%):</span>
                <span>¥{Math.floor((customAmount ? parseInt(customAmount) || 0 : superTipAmount) * 0.1)}</span>
              </div>
              <div className="flex justify-between font-bold text-white border-t border-gray-600 pt-2 mt-2">
                <span>プレイヤー受取額:</span>
                <span>¥{(customAmount ? parseInt(customAmount) || 0 : superTipAmount) - Math.floor((customAmount ? parseInt(customAmount) || 0 : superTipAmount) * 0.1)}</span>
              </div>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !selectedVote || !comment.trim()}
              className="flex-1"
            >
              {isProcessing ? '処理中...' : `¥${customAmount ? parseInt(customAmount) || 0 : superTipAmount} で投票`}
            </Button>
          </div>

          <p className="text-gray-400 text-xs mt-4 text-center">
            決済はStripe Checkoutページで安全に処理されます。
          </p>
        </div>
      </Card>
    </div>
  );
};
