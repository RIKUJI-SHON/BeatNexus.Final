import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface SuperTipComment {
  id: string;
  vote: 'A' | 'B';
  comment: string;
  super_tip_amount: number;
  created_at: string;
  profiles?: {
    username?: string;
    avatar_url?: string;
  } | null;
}

interface SuperTipDisplayProps {
  battleId: string;
}

export const SuperTipDisplay: React.FC<SuperTipDisplayProps> = ({ battleId }) => {
  const [superTipComments, setSuperTipComments] = useState<SuperTipComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVote, setSelectedVote] = useState<'A' | 'B' | 'ALL'>('ALL');

  useEffect(() => {
    loadSuperTipComments();
  }, [battleId, loadSuperTipComments]);

  const loadSuperTipComments = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('battle_votes')
        .select(`
          id,
          vote,
          comment,
          super_tip_amount,
          created_at,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('battle_id', battleId)
        .not('super_tip_amount', 'is', null)
        .gt('super_tip_amount', 0)
        .order('super_tip_amount', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('SuperTip comments load error:', error);
        return;
      }

      setSuperTipComments(data || []);
    } catch (error) {
      console.error('Failed to load SuperTip comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [battleId]);

  const filteredComments = superTipComments.filter(comment => 
    selectedVote === 'ALL' || comment.vote === selectedVote
  );

  const totalSuperTips = superTipComments.reduce((sum, comment) => sum + comment.super_tip_amount, 0);
  const totalByVote = {
    A: superTipComments.filter(c => c.vote === 'A').reduce((sum, c) => sum + c.super_tip_amount, 0),
    B: superTipComments.filter(c => c.vote === 'B').reduce((sum, c) => sum + c.super_tip_amount, 0)
  };

  const getSuperTipBadge = (amount: number) => {
    if (amount >= 1000) return { emoji: '👑', class: 'bg-yellow-500 text-black', label: 'VIP' };
    if (amount >= 500) return { emoji: '⭐', class: 'bg-purple-600 text-white', label: 'スター' };
    if (amount >= 300) return { emoji: '💎', class: 'bg-blue-600 text-white', label: 'プレミアム' };
    return { emoji: '💝', class: 'bg-green-600 text-white', label: 'サポーター' };
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}時間前`;
    return `${Math.floor(diffMins / 1440)}日前`;
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (superTipComments.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700 p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">💝 SuperTip応援コメント</h3>
        <p className="text-gray-400">まだSuperTipコメントはありません</p>
        <p className="text-gray-500 text-sm mt-2">
          最初にプレイヤーを応援してSuperTipを送ろう！
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700 overflow-hidden">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-white">💝 SuperTip応援コメント</h3>
          <div className="text-sm text-gray-400">
            総額: <span className="text-white font-bold">¥{totalSuperTips.toLocaleString()}</span>
          </div>
        </div>

        {/* 投票別フィルター */}
        <div className="flex gap-2">
          <Button
            variant={selectedVote === 'ALL' ? 'primary' : 'secondary'}
            onClick={() => setSelectedVote('ALL')}
            className="text-xs px-3 py-1"
          >
            全て ({superTipComments.length})
          </Button>
          <Button
            variant={selectedVote === 'A' ? 'primary' : 'secondary'}
            onClick={() => setSelectedVote('A')}
            className="text-xs px-3 py-1"
          >
            A投票 (¥{totalByVote.A.toLocaleString()})
          </Button>
          <Button
            variant={selectedVote === 'B' ? 'primary' : 'secondary'}
            onClick={() => setSelectedVote('B')}
            className="text-xs px-3 py-1"
          >
            B投票 (¥{totalByVote.B.toLocaleString()})
          </Button>
        </div>
      </div>

      {/* SuperTipコメント一覧 */}
      <div className="max-h-96 overflow-y-auto">
        {filteredComments.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {selectedVote === 'ALL' ? 'コメントがありません' : `${selectedVote}投票のコメントがありません`}
          </div>
        ) : (
          <div className="space-y-0">
            {filteredComments.map((comment) => {
              const badge = getSuperTipBadge(comment.super_tip_amount);
              
              return (
                <div
                  key={comment.id}
                  className={`p-4 border-b border-gray-700 last:border-b-0 ${
                    comment.super_tip_amount >= 1000 ? 'bg-gradient-to-r from-yellow-900/20 to-transparent' :
                    comment.super_tip_amount >= 500 ? 'bg-gradient-to-r from-purple-900/20 to-transparent' :
                    comment.super_tip_amount >= 300 ? 'bg-gradient-to-r from-blue-900/20 to-transparent' :
                    'hover:bg-gray-750'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* アバター */}
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                      {comment.profiles?.avatar_url ? (
                        <img
                          src={comment.profiles.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-gray-300">
                          {comment.profiles?.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* ユーザー名 & バッジ & 金額 */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">
                          {comment.profiles?.username || '匿名ユーザー'}
                        </span>
                        
                        {/* SuperTipバッジ */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${badge.class}`}>
                          {badge.emoji} {badge.label}
                        </span>

                        {/* 投票先 */}
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                          comment.vote === 'A' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {comment.vote}
                        </span>

                        {/* 金額 */}
                        <span className="text-yellow-400 font-bold text-sm">
                          ¥{comment.super_tip_amount.toLocaleString()}
                        </span>
                      </div>

                      {/* コメント */}
                      <p className="text-gray-200 text-sm leading-relaxed mb-2">
                        {comment.comment}
                      </p>

                      {/* 時間 */}
                      <p className="text-gray-500 text-xs">
                        {formatTimeAgo(comment.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* フッター統計 */}
      {superTipComments.length > 0 && (
        <div className="p-3 bg-gray-900 border-t border-gray-700">
          <div className="text-xs text-gray-400 text-center">
            {superTipComments.length}件のSuperTip応援 • 
            総額¥{totalSuperTips.toLocaleString()} • 
            平均¥{Math.round(totalSuperTips / superTipComments.length).toLocaleString()}
          </div>
        </div>
      )}
    </Card>
  );
};
