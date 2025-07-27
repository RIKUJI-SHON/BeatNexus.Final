import React, { useState, useEffect } from 'react';
import { User, Trophy, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

interface UserStats {
  total_submissions: number;
  total_votes_received: number;
  wins: number;
  losses: number;
  current_season_points: number;
  rank: number;
  join_date: string;
}

interface UserProfile {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  season_points: number;
  season_vote_points: number;
}

interface ActiveSeason {
  id: string;
  name: string;
  status: string;
}

export const UserInfoCard: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeSeason, setActiveSeason] = useState<ActiveSeason | null>(null);
  const [userRank, setUserRank] = useState<number>(0);
  const [voterRank, setVoterRank] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // ユーザーの投票者ランキング順位を取得
  const fetchVoterRank = async () => {
    if (!user) return;

    try {
      const { data: voterData, error } = await supabase
        .from('season_voter_rankings_view')
        .select('rank')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching voter rank:', error);
        return;
      }

      setVoterRank(voterData?.rank || 0);
    } catch (error) {
      console.error('Error in fetchVoterRank:', error);
    }
  };

  // ユーザーのシーズンランキングを取得（ランキングページと同じデータソース）
  const fetchUserRank = async () => {
    if (!user) return;

    try {
      const { data: rankData, error } = await supabase
        .from('season_rankings_view')
        .select('position, season_points')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user rank:', error);
        return;
      }

      setUserRank(rankData?.position || 0);
      
      // シーズンポイントも同時に更新
      setUserStats(prev => prev ? {
        ...prev,
        current_season_points: rankData?.season_points || 0
      } : null);
    } catch (error) {
      console.error('Error in fetchUserRank:', error);
    }
  };

  // アクティブなシーズンを取得
  const fetchActiveSeason = async () => {
    try {
      const { data: season, error } = await supabase
        .from('seasons')
        .select('id, name, status')
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active season:', error);
        return;
      }

      setActiveSeason(season);
    } catch (error) {
      console.error('Error in fetchActiveSeason:', error);
    }
  };

  // ユーザープロフィールを取得
  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url, season_points, season_vote_points')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(profile);
      setAvatarError(false); // 新しいプロフィールデータ取得時にエラーをリセット
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  // ユーザー統計データを取得
  const fetchUserStats = async (): Promise<void> => {
    if (!user) return;

    setIsLoading(true);
    try {
      // 投稿数を取得
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', user.id);

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        return;
      }

      // 受け取った投票数を取得
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('id')
        .in('submission_id', 
          await supabase
            .from('submissions')
            .select('id')
            .eq('user_id', user.id)
            .then(res => res.data?.map(s => s.id) || [])
        );

      if (votesError) {
        console.error('Error fetching votes:', votesError);
      }

      // バトル結果を取得
      const { data: battles, error: battlesError } = await supabase
        .from('battles')
        .select('winner_id, loser_id, submissions!inner(user_id)')
        .or(`winner_id.eq.${user.id},loser_id.eq.${user.id}`)
        .eq('status', 'completed');

      if (battlesError) {
        console.error('Error fetching battles:', battlesError);
      }

      // 統計を計算
      const wins = battles?.filter(b => b.winner_id === user.id).length || 0;
      const losses = battles?.filter(b => b.loser_id === user.id).length || 0;

      setUserStats({
        total_submissions: submissions?.length || 0,
        total_votes_received: votes?.length || 0,
        wins,
        losses,
        current_season_points: 0, // fetchUserRankで設定される
        rank: 0, // ランキングは別途計算が必要
        join_date: user.created_at || new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in fetchUserStats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchActiveSeason();
      fetchVoterRank(); // 投票者ランキングを取得
      fetchUserProfile().then(() => {
        fetchUserStats().then(() => {
          fetchUserRank(); // ユーザー統計の後にランキングデータを取得
        });
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // アクティブシーズンが取得されたら不要（ランキングはアクティブシーズンに依存しない）

  // 未認証ユーザーには何も表示しない
  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-slate-950 border border-slate-700 shadow-2xl rounded-xl p-6 transition-all duration-300">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-1/2 mx-auto mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-700 rounded"></div>
            <div className="h-3 bg-slate-700 rounded w-2/3 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // プロフィール情報のみ使用（auth.user_metadataは使用しない）
  const displayName = userProfile?.username || user.email?.split('@')[0] || t('common.user', 'ユーザー');
  const joinDate = new Date(userStats?.join_date || user.created_at || '').toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short'
  });

  const hasActiveSeasonData = userStats && userStats.current_season_points > 0;
  const hasActiveSeason = activeSeason !== null;
  const hasVoterRank = voterRank > 0; // 投票者ランキングに登録されているかどうか

  return (
    <div className="bg-slate-950 border border-slate-700 shadow-2xl rounded-xl p-6 transition-all duration-300 hover:border-slate-600">
      {/* プロフィールヘッダー - 中央配置 */}
      <div className="text-center mb-6">
        {/* プロフィールアイコン */}
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden">
          {userProfile?.avatar_url && !avatarError ? (
            <img
              src={userProfile.avatar_url}
              alt={`${displayName}のアバター`}
              className="w-full h-full object-cover rounded-full"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <User className="h-8 w-8 text-slate-400" />
          )}
        </div>
        
        {/* ユーザー名 */}
        <h3 className="font-semibold text-slate-50 text-lg mb-1">
          {displayName}
        </h3>
        
        {/* 参加日 */}
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <Calendar className="h-3 w-3" />
          <span>{t('userInfoCard.memberSince', { date: joinDate })}</span>
        </div>
      </div>

      {/* シーズン情報 */}
      {hasActiveSeasonData || hasVoterRank ? (
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border border-slate-600 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-medium text-slate-300">
                {activeSeason?.name || t('userInfoCard.currentSeason')}
              </span>
            </div>
            
            {/* ランキング表示（プレイヤーランキングと投票者ランキングの両方を常に表示） */}
            <div className="mb-3">
              <div className="flex items-center justify-center gap-4">
                {/* プレイヤーランキング */}
                {userRank > 0 ? (
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-400">
                      #{userRank}
                    </div>
                    <div className="text-xs text-slate-400">{t('userInfoCard.rankings.player')}</div>
                  </div>
                ) : (
                  <div className="text-center opacity-50">
                    <div className="text-lg font-bold text-slate-500">
                      {t('userInfoCard.rankings.notRanked')}
                    </div>
                    <div className="text-xs text-slate-500">{t('userInfoCard.rankings.player')}</div>
                  </div>
                )}
                
                {/* 区切り線 */}
                <div className="w-px h-8 bg-slate-600"></div>
                
                {/* 投票者ランキング */}
                {voterRank > 0 ? (
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-400">
                      #{voterRank}
                    </div>
                    <div className="text-xs text-slate-400">{t('userInfoCard.rankings.voter')}</div>
                  </div>
                ) : (
                  <div className="text-center opacity-50">
                    <div className="text-lg font-bold text-slate-500">
                      {t('userInfoCard.rankings.notRanked')}
                    </div>
                    <div className="text-xs text-slate-500">{t('userInfoCard.rankings.voter')}</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* ポイント表示（左：シーズンポイント、右：投票ポイント） */}
            <div className="flex items-center justify-center gap-4">
              {/* シーズンポイント */}
              <div className="text-center">
                <div className="text-xl font-bold text-cyan-400">
                  {userStats?.current_season_points || 0}
                </div>
                <div className="text-xs text-slate-400">{t('userInfoCard.points.seasonPoints')}</div>
              </div>
              
              {/* 縦線区切り */}
              <div className="w-px h-12 bg-slate-600"></div>
              
              {/* 投票ポイント */}
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">
                  {userProfile ? (userProfile.season_vote_points * 100) : 0}
                </div>
                <div className="text-xs text-slate-400">{t('userInfoCard.points.votePoints')}</div>
              </div>
            </div>
          </div>
        </div>
      ) : hasActiveSeason ? (
        /* アクティブなシーズンはあるが、ユーザーがバトルにも投票にも参加していない場合 */
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-600 mb-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-6 w-6 text-slate-500" />
            </div>
            <h4 className="font-medium text-slate-400 mb-2">{t('userInfoCard.notParticipating')}</h4>
            <p className="text-sm text-slate-500">
              {t('userInfoCard.notParticipatingMessage')}
            </p>
          </div>
        </div>
      ) : (
        /* アクティブなシーズンがない場合 */
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-600 mb-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-6 w-6 text-slate-500" />
            </div>
            <h4 className="font-medium text-slate-400 mb-2">{t('userInfoCard.noActiveSeason')}</h4>
            <p className="text-sm text-slate-500">
              {t('userInfoCard.noActiveSeasonMessage')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
