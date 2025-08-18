import { create } from 'zustand';
import { Battle, ArchivedBattle, WaitingSubmission, BattleFormat, BattleComment, BattleStatus } from '../types';

// 内部利用のRaw型定義（DBクエリ結果簡易形）
interface RawBattle { id: string; player1_submission_id: string; player2_submission_id: string; battle_format: BattleFormat; status: string; votes_a: number | null; votes_b: number | null; end_voting_at: string; created_at: string; updated_at?: string; }
interface RawSubmission { id: string; user_id: string; video_url: string; }
interface RawProfile { id: string; username: string; avatar_url: string | null; }
import { supabase } from '../lib/supabase';
import { toast } from './toastStore';
// NOTE: useNotificationStore はこのファイルでは未使用のため削除（ビルド警告防止）
import i18n from '../i18n';

interface BattleState {
  battles: Battle[];
  activeBattles: Battle[];
  archivedBattles: ArchivedBattle[];
  waitingSubmissions: WaitingSubmission[];
  battleComments: Record<string, BattleComment[]>;
  archivedBattlesCount: number;
  communityMembersCount: number;
  totalVotesCount: number;
  totalSubmissionsCount: number;
  loading: boolean;
  archiveLoading: boolean;
  waitingLoading: boolean;
  commentsLoading: Record<string, boolean>;
  error: string | null;
  fetchBattles: () => Promise<void>;
  fetchActiveBattles: () => Promise<void>;
  fetchArchivedBattles: () => Promise<void>;
  fetchWaitingSubmissions: () => Promise<void>;
  submitToWaitingPool: (videoUrl: string, battleFormat: BattleFormat) => Promise<void>;
  withdrawFromWaitingPool: (submissionId: string) => Promise<void>;
  fetchArchivedBattlesCount: () => Promise<void>;
  fetchCommunityMembersCount: () => Promise<void>;
  fetchTotalVotesCount: () => Promise<void>;
  fetchTotalSubmissionsCount: () => Promise<void>;
  // subscribeToRealTimeUpdates: () => () => void; // 廃止済み
  voteBattle: (battleId: string, vote: 'A' | 'B') => Promise<void>;
  voteBattleWithComment: (battleId: string, vote: 'A' | 'B', comment: string) => Promise<void>;
  cancelVote: (battleId: string) => Promise<void>;
  getUserVote: (battleId: string) => Promise<{ hasVoted: boolean; vote: 'A' | 'B' | null }>;
  fetchBattleComments: (battleId: string) => Promise<void>;
  fetchUserSubmissions: () => Promise<void>;
}

export const useBattleStore = create<BattleState>((set, get) => ({
  battles: [],
  activeBattles: [],
  archivedBattles: [],
  waitingSubmissions: [],
  battleComments: {},
  archivedBattlesCount: 0,
  communityMembersCount: 0,
  totalVotesCount: 0,
  totalSubmissionsCount: 0,
  loading: false,
  archiveLoading: false,
  waitingLoading: false,
  commentsLoading: {},
  error: null,

  fetchBattles: async () => {
    set({ loading: true, error: null });
    try {
      console.log('=== DEBUGGING BATTLE FETCH ===');
      console.log('Fetching battles from active_battles table...');
      
      // まず基本的なテーブル確認
      const { data: tableCheck, error: tableError } = await supabase
        .from('active_battles')
        .select('id, status, battle_format')
        .limit(5);
      
      console.log('Table check result:', tableCheck);
      if (tableError) {
        console.error('Table check error:', tableError);
        throw new Error(`テーブルアクセスエラー: ${tableError.message}`);
      }
      
      // プロフィールテーブル確認
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .limit(3);
      
      console.log('Profile table check:', profileCheck);
      if (profileError) {
        console.error('Profile check error:', profileError);
        throw new Error(`プロフィールテーブルエラー: ${profileError.message}`);
      }
      
      // サブミッションテーブル確認
      const { data: submissionCheck, error: submissionError } = await supabase
        .from('submissions')
        .select('id, user_id, video_url')
        .limit(3);
      
      console.log('Submission table check:', submissionCheck);
      if (submissionError) {
        console.error('Submission check error:', submissionError);
        throw new Error(`サブミッションテーブルエラー: ${submissionError.message}`);
      }
      
      console.log('=== ALL TABLES ACCESSIBLE ===');
      
      // Step 1: シンプルなactive_battlesクエリ
      const { data: battlesData, error: battlesError } = await supabase
        .from('active_battles')
        .select(`
          id,
          player1_submission_id,
          player2_submission_id,
          battle_format,
          status,
          votes_a,
          votes_b,
          end_voting_at,
          created_at,
          updated_at
        `)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (battlesError) {
        console.error('Battles query error:', battlesError);
        throw battlesError;
      }

      console.log('Raw battles data:', battlesData);

      if (!battlesData || battlesData.length === 0) {
        console.log('No active battles found');
        set({ battles: [], activeBattles: [] });
        return;
      }

      // 現在のユーザー取得（未ログインなら投票済判定は全てfalse）
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;
      let votedBattleIds = new Set<string>();
      if (currentUserId) {
        const battleIds = battlesData.map(b => b.id);
        if (battleIds.length > 0) {
          const { data: votesData, error: votesError } = await supabase
            .from('battle_votes')
            .select('battle_id')
            .in('battle_id', battleIds)
            .eq('user_id', currentUserId);
          if (votesError) {
            console.warn('⚠️ battle_votes fetch error (ignored for UI):', votesError);
          } else if (votesData) {
            votedBattleIds = new Set(votesData.map(v => v.battle_id));
          }
        }
      }

      // Step 2: 関連するsubmissionのIDを取得
      const submissionIds = battlesData.flatMap(battle => [
        battle.player1_submission_id, 
        battle.player2_submission_id
      ]);

      // Step 3: submissionsデータを取得
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('id, user_id, video_url')
        .in('id', submissionIds);

      if (submissionsError) {
        console.error('Submissions query error:', submissionsError);
        throw submissionsError;
      }

      // Step 4: ユーザーIDを取得
      const userIds = submissionsData?.map(sub => sub.user_id) || [];

      // Step 5: profilesデータを取得
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
        throw profilesError;
      }

      console.log('Submissions data:', submissionsData);
      console.log('Profiles data:', profilesData);

      // Step 6: データを変換（JavaScript側で結合）
  // 型宣言はファイル冒頭ではなく最初の使用前にまとめたが他関数でも使うため外側に移動済み（下部参照）

      const statusMap = (raw: string): BattleStatus => {
        switch (raw) {
          case 'ACTIVE':
          case 'active':
            return 'ACTIVE';
          case 'COMPLETED':
          case 'completed':
            return 'COMPLETED';
          case 'PROCESSING_RESULTS':
          case 'processing_results':
            return 'PROCESSING_RESULTS';
          default:
            // 想定外はACTIVE扱い（ログ出力）
            console.warn('Unexpected battle status value:', raw);
            return 'ACTIVE';
        }
      };

      const transformedBattles: Battle[] = (battlesData as RawBattle[]).map((battle) => {
        const player1Submission = submissionsData?.find((sub: RawSubmission) => sub.id === battle.player1_submission_id);
        const player2Submission = submissionsData?.find((sub: RawSubmission) => sub.id === battle.player2_submission_id);
        const player1 = profilesData?.find((profile: RawProfile) => profile.id === player1Submission?.user_id);
        const player2 = profilesData?.find((profile: RawProfile) => profile.id === player2Submission?.user_id);

        const base: Battle = {
          id: battle.id,
          player1_submission_id: battle.player1_submission_id,
            player2_submission_id: battle.player2_submission_id,
          player1_user_id: player1Submission?.user_id || '',
          player2_user_id: player2Submission?.user_id || '',
          contestant_a_id: player1Submission?.user_id || null,
          contestant_b_id: player2Submission?.user_id || null,
          battle_format: battle.battle_format,
          status: statusMap(battle.status),
          votes_a: battle.votes_a ?? 0,
          votes_b: battle.votes_b ?? 0,
          end_voting_at: battle.end_voting_at,
          created_at: battle.created_at,
          updated_at: battle.updated_at || battle.created_at,
          video_url_a: player1Submission?.video_url,
          video_url_b: player2Submission?.video_url,
          current_user_voted: votedBattleIds.has(battle.id)
        };

        if (player1) {
          base.contestant_a = { username: player1.username, avatar_url: player1.avatar_url };
        }
        if (player2) {
          base.contestant_b = { username: player2.username, avatar_url: player2.avatar_url };
        }
        return base;
      });

      console.log('Transformed battles:', transformedBattles);

      set({ 
        battles: transformedBattles,
        activeBattles: transformedBattles
      });
    } catch (error) {
      console.error('Error fetching battles:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch battles' });
    } finally {
      set({ loading: false });
    }
  },

  fetchActiveBattles: async () => {
    set({ loading: true, error: null });
    try {
      // Step 1: Fetch active battles
      const { data: battlesData, error: battlesError } = await supabase
        .from('active_battles')
        .select(`
          id,
          player1_submission_id,
          player2_submission_id,
          battle_format,
          status,
          votes_a,
          votes_b,
          end_voting_at,
          created_at,
          updated_at
        `)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (battlesError) {
        console.error('Error fetching active_battles entries:', battlesError);
        throw battlesError;
      }

      if (!battlesData || battlesData.length === 0) {
        set({ activeBattles: [], loading: false });
        return;
      }

      // 現在ユーザーの投票済みバトルID収集
      const { data: authData2 } = await supabase.auth.getUser();
      const currentUserId2 = authData2.user?.id;
      let votedBattleIds2 = new Set<string>();
      if (currentUserId2) {
        const battleIds2 = battlesData.map(b => b.id);
        if (battleIds2.length > 0) {
          const { data: votesData2, error: votesError2 } = await supabase
            .from('battle_votes')
            .select('battle_id')
            .in('battle_id', battleIds2)
            .eq('user_id', currentUserId2);
          if (votesError2) {
            console.warn('⚠️ battle_votes fetch error (activeBattles) ignored:', votesError2);
          } else if (votesData2) {
            votedBattleIds2 = new Set(votesData2.map(v => v.battle_id));
          }
        }
      }

      // Step 2: Get submission IDs
      const submissionIds = battlesData.flatMap(battle => [
        battle.player1_submission_id,
        battle.player2_submission_id
      ].filter(id => id != null) as string[]); // Ensure IDs are not null and are strings

      if (submissionIds.length === 0) {
        // Handle cases where battles might exist but have no valid submission IDs (should not happen in normal operation)
    const transformedBattlesWithoutSubmissions: Battle[] = (battlesData as RawBattle[]).map(battle => ({
          id: battle.id,
          player1_submission_id: battle.player1_submission_id,
          player2_submission_id: battle.player2_submission_id,
          player1_user_id: '',
          player2_user_id: '',
          contestant_a_id: null,
          contestant_b_id: null,
          battle_format: battle.battle_format,
          status: 'ACTIVE',
          votes_a: battle.votes_a ?? 0,
          votes_b: battle.votes_b ?? 0,
          end_voting_at: battle.end_voting_at,
          created_at: battle.created_at,
          updated_at: battle.updated_at || battle.created_at,
          current_user_voted: false
        }));
          set({ activeBattles: transformedBattlesWithoutSubmissions, loading: false });
        return;
      }

      // Step 3: Fetch submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('id, user_id, video_url')
        .in('id', submissionIds);

      if (submissionsError) {
        console.error('Error fetching submissions for active battles:', submissionsError);
        throw submissionsError;
      }

      // Step 4: Get user IDs from submissions
      const userIds = submissionsData?.map(sub => sub.user_id).filter(id => id != null) as string[] || [];

  let profilesData: RawProfile[] = [];
      if (userIds.length > 0) {
        // Step 5: Fetch profiles
        const { data: fetchedProfilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles for active battles:', profilesError);
          throw profilesError;
        }
        profilesData = fetchedProfilesData || [];
      }

      // Step 6: Transform data
  const transformedBattles: Battle[] = (battlesData as RawBattle[]).map(battle => {
        const player1Submission = submissionsData?.find(sub => sub.id === battle.player1_submission_id);
        const player2Submission = submissionsData?.find(sub => sub.id === battle.player2_submission_id);
        const player1 = profilesData?.find(profile => profile.id === player1Submission?.user_id);
        const player2 = profilesData?.find(profile => profile.id === player2Submission?.user_id);
        const obj: Battle = {
          id: battle.id,
          player1_submission_id: battle.player1_submission_id,
          player2_submission_id: battle.player2_submission_id,
          player1_user_id: player1Submission?.user_id || '',
          player2_user_id: player2Submission?.user_id || '',
          contestant_a_id: player1Submission?.user_id || null,
          contestant_b_id: player2Submission?.user_id || null,
          battle_format: battle.battle_format,
          status: 'ACTIVE',
          votes_a: battle.votes_a ?? 0,
          votes_b: battle.votes_b ?? 0,
          end_voting_at: battle.end_voting_at,
          created_at: battle.created_at,
          updated_at: battle.updated_at || battle.created_at,
          video_url_a: player1Submission?.video_url,
          video_url_b: player2Submission?.video_url,
          current_user_voted: votedBattleIds2.has(battle.id)
        };
        if (player1) obj.contestant_a = { username: player1.username, avatar_url: player1.avatar_url };
        if (player2) obj.contestant_b = { username: player2.username, avatar_url: player2.avatar_url };
        return obj;
      });

      set({ activeBattles: transformedBattles });
    } catch (error) {
      console.error('Error in fetchActiveBattles:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch active battles' });
    } finally {
      set({ loading: false });
    }
  },

  voteBattle: async (battleId: string, vote: 'A' | 'B') => {
    console.log('🗳️ Starting vote process:', { battleId, vote, timestamp: new Date().toISOString() });
    
    try {
      // Get current user for logging
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id, user?.email);
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        toast.error(i18n.t('toasts.error'), i18n.t('battleStore.toasts.checkLoginStatus'));
        return;
      }

      console.log('📡 Calling vote_battle RPC with params:', {
        p_battle_id: battleId,
        p_vote: vote,
        user_id: user?.id
      });

      const { data, error } = await supabase.rpc('vote_battle', {
        p_battle_id: battleId,
        p_vote: vote as 'A' | 'B'  // 明示的な型キャスト
      });

      console.log('📥 RPC Response:', { 
        data, 
        error, 
        dataType: typeof data,
        isNull: data === null,
        isObject: data && typeof data === 'object',
        timestamp: new Date().toISOString() 
      });

      if (error) {
        console.error('❌ RPC Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        console.error('🔍 Full error object:', JSON.stringify(error, null, 2));
        toast.error(i18n.t('toasts.error'), `${i18n.t('battleStore.toasts.databaseError')}: ${error.message}`);
        throw error;
      }

      // Enhanced response handling
  if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'success')) {
        console.log('📊 JSON Function response:', {
          success: data.success,
          error: data.error,
          message: data.message,
          responseType: typeof data
        });

        if (data.success === false) {
          console.log('⚠️ Vote blocked by function:', data.error, data.message);
          
          // Handle specific error types with appropriate messages
          switch (data.error) {
            case 'self_voting_not_allowed':
              toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.cannotVoteOwn'));
              break;
            case 'already_voted':
              toast.info(i18n.t('toasts.info'), i18n.t('battleStore.toasts.alreadyVoted'));
              break;
            case 'voting_closed':
              toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.votingEnded'));
              break;
            case 'voting_expired':
              toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.votingExpired'));
              break;
            case 'authentication_required':
              toast.error(i18n.t('toasts.error'), i18n.t('battleStore.toasts.loginRequired'));
              break;
            case 'battle_not_found':
              toast.error(i18n.t('toasts.error'), i18n.t('battleStore.toasts.battleNotFound'));
              break;
            default:
              toast.error(i18n.t('toasts.error'), data.message || i18n.t('battleStore.toasts.voteError'));
          }
          return; // Don't refresh if there was an error
        } else if (data.success === true) {
          // Success case with proper JSON response
          console.log('✅ Vote successful with JSON response:', data);
          toast.success(i18n.t('toasts.success'), i18n.t('battleStore.toasts.voteSuccess', { player: vote }));
        } else {
          // Unexpected JSON structure
          console.log('🤷 Unexpected JSON structure:', data);
          toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.unexpectedResponse'));
        }
      } else if (data === null) {
        // Null response - likely RLS block or function missing
        console.log('⚠️ Null response - function may not exist or RLS blocked');
        toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.functionNotConfigured'));
        return;
      } else if (data === undefined || data === '') {
        // Empty response - function exists but returns nothing
        console.log('📭 Empty response - assuming success for legacy compatibility');
        toast.success(i18n.t('toasts.success'), i18n.t('battleStore.toasts.voteSuccess', { player: vote }));
      } else {
        // Some other response type (string, number, etc.)
        console.log('📄 Non-object response:', { data, type: typeof data });
        toast.success(i18n.t('toasts.success'), i18n.t('battleStore.toasts.voteSuccess', { player: vote }));
      }

      console.log('🔄 Refreshing battles data...');
      // Refresh battles after voting attempt
      await get().fetchBattles();
      console.log('✅ Battles data refreshed');
      
    } catch (error) {
      console.error('💥 Vote battle catch error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error(i18n.t('toasts.error'), error instanceof Error ? error.message : i18n.t('battleStore.toasts.voteError'));
      throw error;
    }
  },

  cancelVote: async (battleId: string) => {
    console.log('🗑️ Starting vote cancellation:', { battleId, timestamp: new Date().toISOString() });
    
    try {
      // Get current user for logging
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('👤 Current user for cancellation:', user?.id, user?.email);
      
      if (authError) {
        console.error('❌ Auth error during cancellation:', authError);
        toast.error(i18n.t('toasts.error'), i18n.t('battleStore.toasts.checkLoginStatus'));
        throw new Error('Authentication failed');
      }

      console.log('📡 Calling cancel_vote RPC with params:', {
        p_battle_id: battleId,
        user_id: user?.id
      });

      const { data, error } = await supabase.rpc('cancel_vote', {
        p_battle_id: battleId
      });

      console.log('📥 Cancel Vote RPC Response:', { 
        data, 
        error, 
        dataType: typeof data,
        timestamp: new Date().toISOString() 
      });

      if (error) {
        console.error('❌ Cancel Vote RPC Error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast.error(i18n.t('toasts.error'), `${i18n.t('battleStore.toasts.databaseError')}: ${error.message}`);
        throw error;
      }

      // Process response - be more strict about success validation
  if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'success')) {
        if (data.success === true) {
          console.log('✅ Vote cancellation successful:', data);
          toast.success(i18n.t('toasts.success'), i18n.t('battleStore.toasts.cancelVoteSuccess', { player: data.cancelled_vote }));
          
          // Only refresh if truly successful
          console.log('🔄 Refreshing battles data after successful cancellation...');
          await get().fetchBattles();
          console.log('✅ Battles data refreshed after cancellation');
          return; // Success - don't throw
        } else {
          console.log('⚠️ Vote cancellation failed:', data.error, data.message);
          console.log('🔍 Additional debug info:', {
            details: data.details,
            step: data.step,
            sqlstate: data.sqlstate
          });
          
          let errorMessage = data.message || i18n.t('battleStore.toasts.cancelFailed');
          
          // Show more detailed error for unexpected_error
          if (data.error === 'unexpected_error') {
            errorMessage = `${i18n.t('battleStore.toasts.systemError')}: ${data.details || data.message}`;
            if (data.step) {
              errorMessage += ` (ステップ: ${data.step})`;
            }
          }
          
          switch (data.error) {
            case 'no_vote_found':
              toast.info(i18n.t('toasts.info'), i18n.t('battleStore.toasts.noVoteToCancel'));
              break;
            case 'voting_closed':
              toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.cannotCancelEnded'));
              break;
            case 'voting_expired':
              toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.cannotCancelExpired'));
              break;
            case 'authentication_required':
              toast.error(i18n.t('toasts.error'), i18n.t('battleStore.toasts.loginRequired'));
              break;
            case 'battle_not_found':
              toast.error(i18n.t('toasts.error'), i18n.t('battleStore.toasts.battleNotFound'));
              break;
            case 'unexpected_error':
              toast.error(i18n.t('toasts.error'), errorMessage);
              break;
            default:
              toast.error(i18n.t('toasts.error'), errorMessage);
          }
          
          // Throw error to prevent local state update
          throw new Error(errorMessage);
        }
      } else {
        console.log('🤷 Unexpected cancellation response:', data);
        toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.cancelProcessCompleted'));
        throw new Error('Unexpected response format');
      }
      
    } catch (error) {
      console.error('💥 Cancel vote error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Only show error toast if it hasn't been shown already
      if (error instanceof Error && !error.message.includes('データベースエラー:')) {
        toast.error(i18n.t('toasts.error'), error instanceof Error ? error.message : i18n.t('battleStore.toasts.cancelFailed'));
      }
      
      // Always throw to ensure component knows about the error
      throw error;
    }
  },

  getUserVote: async (battleId: string) => {
    console.log('🔍 Getting user vote status:', { battleId });
    
    try {
      const { data, error } = await supabase.rpc('get_user_vote', {
        p_battle_id: battleId
      });

      if (error) {
        console.error('❌ Get User Vote RPC Error:', error);
        return { hasVoted: false, vote: null };
      }

      if (data && typeof data === 'object' && data.success) {
        console.log('📊 User vote status:', data);
        return {
          hasVoted: data.has_voted || false,
          vote: data.vote || null
        };
      }

      return { hasVoted: false, vote: null };
    } catch (error) {
      console.error('💥 Get user vote error:', error);
      return { hasVoted: false, vote: null };
    }
  },

  fetchArchivedBattles: async () => {
    set({ loading: true, error: null });
    try {
      // Step 1: Fetch archived battles
      const { data: battlesData, error: battlesError } = await supabase
        .from('archived_battles')
        .select(`
          id,
          original_battle_id,
          winner_id,
          final_votes_a,
          final_votes_b,
          archived_at,
          battle_format,
          player1_user_id,
          player2_user_id,
          player1_submission_id,
          player2_submission_id,
          player1_rating_change,
          player2_rating_change,
          player1_final_rating,
          player2_final_rating
        `)
        .order('archived_at', { ascending: false });

      if (battlesError) {
        console.error('Error fetching archived_battles entries:', battlesError);
        throw battlesError;
      }

      if (!battlesData || battlesData.length === 0) {
        set({ archivedBattles: [] }); // loading: false は finally で
        return;
      }

      // Step 2: Get user IDs for profiles and submission IDs for videos
  interface RawArchivedBattle { player1_user_id: string; player2_user_id: string; winner_id: string | null; player1_submission_id: string; player2_submission_id: string; final_votes_a: number; final_votes_b: number; archived_at: string; battle_format: BattleFormat | string; id: string; original_battle_id: string; created_at?: string; updated_at?: string; player1_rating_change: number | null; player2_rating_change: number | null; player1_final_rating: number | null; player2_final_rating: number | null; }
  const submissionIds = (battlesData as RawArchivedBattle[]).flatMap(battle => [
        battle.player1_submission_id,
        battle.player2_submission_id
      ].filter(id => id != null) as string[]);

  // ArchivedBattles では UI 側で username/avatar を利用しないため profiles 取得をスキップ

  let submissionsData: { id: string; video_url: string }[] = [];
      if (submissionIds.length > 0) {
        // Step 4: Fetch submissions (for video URLs)
        const { data: fetchedSubmissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select('id, video_url')
          .in('id', [...new Set(submissionIds)]);

        if (submissionsError) {
          console.error('Error fetching submissions for archived battles:', submissionsError);
          // エラーがあっても処理を継続（ビデオURLがundefinedになる）
        }
        submissionsData = fetchedSubmissionsData || [];
      }

      // Step 5: Transform data
  const transformedBattles: ArchivedBattle[] = (battlesData as RawArchivedBattle[]).map((battle) => {
        const player1Submission = submissionsData?.find(sub => sub.id === battle.player1_submission_id);
        const player2Submission = submissionsData?.find(sub => sub.id === battle.player2_submission_id);

        return {
          id: battle.id as string,
          original_battle_id: battle.original_battle_id as string,
          winner_id: battle.winner_id as string | null,
          final_votes_a: battle.final_votes_a as number,
          final_votes_b: battle.final_votes_b as number,
          archived_at: battle.archived_at as string,
      battle_format: battle.battle_format as BattleFormat, // DBの型をキャスト
          player1_user_id: battle.player1_user_id as string,
          player2_user_id: battle.player2_user_id as string,
          player1_submission_id: battle.player1_submission_id as string,
          player2_submission_id: battle.player2_submission_id as string,
          created_at: battle.created_at as string,
          updated_at: battle.updated_at as string,
          player1_rating_change: battle.player1_rating_change as number | null,
          player2_rating_change: battle.player2_rating_change as number | null,
          player1_final_rating: battle.player1_final_rating as number | null,
          player2_final_rating: battle.player2_final_rating as number | null,
          player1_video_url: player1Submission?.video_url as string | null,
          player2_video_url: player2Submission?.video_url as string | null,
      // ArchivedBattle の contestant_a/b は User を期待するがここでは軽量情報のみ → 既存UI利用箇所で username / avatar_url 参照のみのため省略
          video_url_a: player1Submission?.video_url as string | undefined,
          video_url_b: player2Submission?.video_url as string | undefined,
          rating_changes: battle.player1_rating_change !== null && battle.player2_rating_change !== null ? {
            player1_change: battle.player1_rating_change as number,
            player2_change: battle.player2_rating_change as number,
            player1_new_rating: battle.player1_final_rating as number,
            player2_new_rating: battle.player2_final_rating as number,
          } : undefined,
        };
      });

      set({ archivedBattles: transformedBattles });
    } catch (error) {
      console.error('Error in fetchArchivedBattles:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch archived battles' });
    } finally {
      set({ loading: false });
    }
  },

  fetchArchivedBattlesCount: async () => {
    try {
      const { count, error } = await supabase
        .from('archived_battles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching archived_battles count:', error);
        throw error;
      }

      set({ archivedBattlesCount: count || 0 });
    } catch (error) {
      console.error('Error in fetchArchivedBattlesCount:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch archived battles count' });
    }
  },

  fetchCommunityMembersCount: async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching community members count:', error);
        throw error;
      }

      set({ communityMembersCount: count || 0 });
    } catch (error) {
      console.error('Error in fetchCommunityMembersCount:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch community members count' });
    }
  },

  fetchTotalVotesCount: async () => {
    try {
      // 現在のアクティブバトルの投票数を取得
      const { count: activeBattleVotes, error: activeBattleVotesError } = await supabase
        .from('battle_votes')
        .select('*', { count: 'exact', head: true });

      if (activeBattleVotesError) {
        console.error('Error fetching active battle votes count:', activeBattleVotesError);
        throw activeBattleVotesError;
      }

      // アーカイブされたバトルの投票数の合計を取得
      const { data: archivedVotesData, error: archivedVotesError } = await supabase
        .from('archived_battles')
        .select('final_votes_a, final_votes_b');

      if (archivedVotesError) {
        console.error('Error fetching archived battle votes:', archivedVotesError);
        throw archivedVotesError;
      }

      // アーカイブバトルの投票数を合計
      const archivedVotesTotal = archivedVotesData?.reduce((total, battle) => {
        return total + (battle.final_votes_a || 0) + (battle.final_votes_b || 0);
      }, 0) || 0;

      // 現在のアクティブ投票数とアーカイブされた投票数を合計
      const totalVotes = (activeBattleVotes || 0) + archivedVotesTotal;

      console.log('Total votes calculation:', {
        activeBattleVotes: activeBattleVotes || 0,
        archivedVotesTotal,
        totalVotes
      });

      set({ totalVotesCount: totalVotes });
    } catch (error) {
      console.error('Error in fetchTotalVotesCount:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch total votes count' });
    }
  },

  // リアルタイム機能は廃止しました（UX改善のため）
  // subscribeToRealTimeUpdates: () => () => void;

  // 待機プール関連の新機能
  fetchWaitingSubmissions: async () => {
    set({ waitingLoading: true, error: null });
    try {
      // 新しいget_waiting_submissions関数を使用
      const { data: waitingData, error } = await supabase
        .rpc('get_waiting_submissions');

      if (error) {
        console.error('Error fetching waiting submissions:', error);
        throw error;
      }

  interface RawWaitingSubmission { id: string; user_id: string; battle_format: string; video_url: string; created_at: string; waiting_since: string; max_allowed_rating_diff: number; attempts_count: number; updated_at: string; username?: string; avatar_url?: string | null; user_rating?: number; }
  const transformedWaitingSubmissions = (waitingData as RawWaitingSubmission[] | undefined)?.map((waiting) => ({
        id: waiting.id,
        user_id: waiting.user_id,
        battle_format: waiting.battle_format,
        video_url: waiting.video_url,
        created_at: waiting.created_at,
        waiting_since: waiting.waiting_since,
        max_allowed_rating_diff: waiting.max_allowed_rating_diff,
        attempts_count: waiting.attempts_count,
        updated_at: waiting.updated_at,
        username: waiting.username,
        avatar_url: waiting.avatar_url,
        user_rating: waiting.user_rating,
      })) || [];

      set({ waitingSubmissions: transformedWaitingSubmissions });
    } catch (error) {
      console.error('Error in fetchWaitingSubmissions:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch waiting submissions' });
    } finally {
      set({ waitingLoading: false });
    }
  },

  submitToWaitingPool: async (videoUrl: string, battleFormat: BattleFormat) => {
    set({ waitingLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      // submissionsテーブルに直接投稿
      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          video_url: videoUrl,
          battle_format: battleFormat,
          status: 'WAITING_OPPONENT'
        })
        .select()
        .single();

      if (submissionError) {
        console.error('Error submitting to waiting pool:', submissionError);
        throw submissionError;
      }

      console.log('✅ Submission added to waiting pool with ID:', submission.id);

      // 20分間隔のプログレッシブマッチングシステムによる自動マッチング
      // - 最初の2分間: 待機期間（マッチングなし）
      // - 2-20分: レート差±50でマッチング
      // - 20-40分: レート差±100でマッチング  
      // - 40-60分: レート差±200でマッチング
      // - 60-80分: レート差±400でマッチング
      // - 80分以降: レート差無制限でマッチング
      
      // フロントエンドの状態を更新
      await get().fetchWaitingSubmissions();
      await get().fetchUserSubmissions();

      return submission;
    } catch (error) {
      console.error('Error in submitToWaitingPool:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    } finally {
      set({ waitingLoading: false });
    }
  },

  withdrawFromWaitingPool: async (submissionId: string) => {
    set({ waitingLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      // 新しいwithdraw_submission関数を使用
      const { data: success, error } = await supabase
        .rpc('withdraw_submission', { p_submission_id: submissionId });

      if (error) {
        console.error('Error withdrawing from waiting pool:', error);
        throw error;
      }

      if (!success) {
        throw new Error('投稿の取り下げに失敗しました。既にマッチングされているか、権限がありません。');
      }

      toast.success(
        i18n.t('toasts.submissionWithdrawn') || 'バトルキューから削除されました'
      );

      // 待機リストを更新
      await get().fetchWaitingSubmissions();

    } catch (error) {
      console.error('Error in withdrawFromWaitingPool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw from waiting pool';
      set({ error: errorMessage });
      toast.error(
        i18n.t('toasts.withdrawError') || `削除に失敗しました: ${errorMessage}`
      );
    } finally {
      set({ waitingLoading: false });
    }
  },

  fetchTotalSubmissionsCount: async () => {
    try {
      const { count, error } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching submissions count:', error);
        throw error;
      }

      set({ totalSubmissionsCount: count || 0 });
    } catch (error) {
      console.error('Error in fetchTotalSubmissionsCount:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch submissions count' });
    }
  },

  fetchUserSubmissions: async () => {
    // Implementation of fetchUserSubmissions function
  },

  voteBattleWithComment: async (battleId: string, vote: 'A' | 'B', comment: string) => {
    console.log('🗳️💬 Starting vote with comment process:', { battleId, vote, comment, timestamp: new Date().toISOString() });
    
    try {
      // Get current user for logging
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id, user?.email);
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        toast.error(i18n.t('toasts.error'), i18n.t('battleStore.toasts.checkLoginStatus'));
        return;
      }

      console.log('📡 Calling vote_battle_with_comment RPC with params:', {
        p_battle_id: battleId,
        p_vote: vote,
        p_comment: comment,
        user_id: user?.id
      });

      const { data, error } = await supabase.rpc('vote_battle_with_comment', {
        p_battle_id: battleId,
        p_vote: vote,
        p_comment: comment
      });

      console.log('📥 RPC Response:', { 
        data, 
        error, 
        dataType: typeof data,
        timestamp: new Date().toISOString() 
      });

      if (error) {
        console.error('❌ RPC Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        toast.error(i18n.t('toasts.error'), `${i18n.t('battleStore.toasts.databaseError')}: ${error.message}`);
        throw error;
      }

      // Enhanced response handling
  if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'success')) {
        console.log('📊 JSON Function response:', {
          success: data.success,
          error: data.error,
          message: data.message,
          responseType: typeof data
        });

        if (data.success === false) {
          console.log('⚠️ Vote blocked by function:', data.error, data.message);
          
          // Handle specific error types with appropriate messages
          switch (data.error) {
            case 'User not authenticated':
              toast.error(i18n.t('toasts.error'), i18n.t('battleStore.toasts.loginRequired'));
              break;
            case 'Battle not found or not active':
              toast.error(i18n.t('toasts.error'), i18n.t('battleStore.toasts.battleNotFound'));
              break;
            case 'Voting period has ended':
              toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.votingEnded'));
              break;
            case 'Cannot vote on your own battle':
              toast.warning(i18n.t('toasts.warning'), i18n.t('battleStore.toasts.cannotVoteOwn'));
              break;
            default:
              toast.error(i18n.t('toasts.error'), data.message || i18n.t('battleStore.toasts.voteError'));
          }
          return;
        } else if (data.success === true) {
          // Success case with proper JSON response
          console.log('✅ Vote with comment successful:', data);
          const successMessage = comment 
            ? i18n.t('battleStore.toasts.voteWithCommentSuccess', { player: vote })
            : i18n.t('battleStore.toasts.voteSuccess', { player: vote });
          toast.success(i18n.t('toasts.success'), successMessage);
          
          // Refresh comments for this battle
          await get().fetchBattleComments(battleId);
        }
      }

      console.log('🔄 Refreshing battles data...');
      // Refresh battles after voting attempt
      await get().fetchBattles();
      console.log('✅ Battles data refreshed');
      
    } catch (error) {
      console.error('💥 Vote battle with comment catch error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error(i18n.t('toasts.error'), error instanceof Error ? error.message : i18n.t('battleStore.toasts.voteError'));
      throw error;
    }
  },

  fetchBattleComments: async (battleId: string) => {
    console.log('💬 Fetching battle comments for:', battleId);
    
    set(state => ({
      commentsLoading: { ...state.commentsLoading, [battleId]: true }
    }));

    try {
      const { data, error } = await supabase.rpc('get_battle_comments', {
        p_battle_id: battleId
      });

      if (error) {
        console.error('❌ Error fetching battle comments:', error);
        throw error;
      }

      console.log('📥 Battle comments data:', data);

      interface RawBattleComment { id: string; user_id: string; username: string; avatar_url: string | null; vote: 'A' | 'B'; comment: string | null; created_at: string; }
      const comments: BattleComment[] = (data as RawBattleComment[] || []).map((c) => ({
        id: c.id,
        post_id: '', // コメント機能統合前の暫定値
        user_id: c.user_id,
        content: c.comment || '',
        created_at: c.created_at,
        updated_at: c.created_at,
        username: c.username,
        avatar_url: c.avatar_url,
        vote: c.vote,
        comment: c.comment
      }));

      set(state => ({
        battleComments: {
          ...state.battleComments,
          [battleId]: comments
        }
      }));

      console.log('✅ Battle comments updated for battle:', battleId);

    } catch (error) {
      console.error('💥 Error in fetchBattleComments:', error);
      toast.error(i18n.t('toasts.error'), 'Failed to load comments');
    } finally {
      set(state => ({
        commentsLoading: { ...state.commentsLoading, [battleId]: false }
      }));
    }
  }
}));