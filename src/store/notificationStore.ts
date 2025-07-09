import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useBattleResultStore } from './battleResultStore';
import { useBattleMatchedStore } from './battleMatchedStore';
import { getCurrentRank } from '../lib/rankUtils';
import { BattleMatchedData } from '../components/ui/BattleMatchedModal';

// Helper function to handle battle matched notifications
const handleBattleMatchedNotification = async (notificationData: Notification) => {
  console.log('⚡ [BattleMatchedModal] handleBattleMatchedNotification called:', notificationData);
  
  if (!notificationData.relatedBattleId) {
    console.log('❌ [BattleMatchedModal] No relatedBattleId found');
    return;
  }

  console.log('🔍 [BattleMatchedModal] Starting notification processing for battle:', notificationData.relatedBattleId);

  try {
    console.log('🔍 [BattleMatchedModal] Fetching battle data for ID:', notificationData.relatedBattleId);
    
    // アクティブバトル情報を取得
    const { data: battleData, error } = await supabase
      .from('active_battles')
      .select('*')
      .eq('id', notificationData.relatedBattleId)
      .single();

    if (error) {
      console.error('❌ [BattleMatchedModal] Failed to fetch battle data:', error);
      return;
    }

    console.log('📊 [BattleMatchedModal] Battle data fetched:', battleData);

    // プレイヤー情報を別途取得
    const { data: player1Profile, error: player1Error } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', battleData.player1_user_id)
      .single();

    const { data: player2Profile, error: player2Error } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', battleData.player2_user_id)
      .single();

    if (player1Error || player2Error) {
      // プロフィール取得に失敗した場合でもモーダルは表示する（Unknown 表示）
      console.warn('⚠️ [BattleMatchedModal] Could not fetch player profiles:', { player1Error, player2Error });
    }

    console.log('👥 [BattleMatchedModal] Player profiles fetched:', { player1Profile, player2Profile });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ [BattleMatchedModal] No authenticated user');
      return;
    }

    console.log('👤 [BattleMatchedModal] Current user ID:', user.id);

    const isPlayer1 = battleData.player1_user_id === user.id;
    const isPlayer2 = battleData.player2_user_id === user.id;
    
    console.log('🤔 [BattleMatchedModal] Player check:', { isPlayer1, isPlayer2 });
    
    if (!isPlayer1 && !isPlayer2) {
      console.log('❌ [BattleMatchedModal] User is not a participant in this battle');
      return;
    }

    const opponentUsername = isPlayer1 
      ? player2Profile?.username || 'Unknown'
      : player1Profile?.username || 'Unknown';
      
    const opponentAvatarUrl = isPlayer1 
      ? player2Profile?.avatar_url || null
      : player1Profile?.avatar_url || null;

    const matchData: BattleMatchedData = {
      battleId: notificationData.relatedBattleId,
      opponentUsername,
      opponentAvatarUrl,
      battleFormat: battleData.battle_format,
      votingEndsAt: battleData.end_voting_at,
      matchType: 'immediate' as const, // Edge Functionからの通知は即座マッチング
    };

    console.log('🎯 [BattleMatchedModal] Match data prepared:', matchData);

    // BattleMatchedStoreにデータを設定してモーダルを表示
    console.log('🎯 [BattleMatchedModal] About to call showMatchModal with data:', matchData);
    const { showMatchModal } = useBattleMatchedStore.getState();
    console.log('⚡ [BattleMatchedModal] Got showMatchModal function from store');
    
    showMatchModal(matchData);
    
    // ストア状態確認
    const storeState = useBattleMatchedStore.getState();
    console.log('✅ [BattleMatchedModal] showMatchModal called successfully, store state:', {
      isModalOpen: storeState.isModalOpen,
      hasPendingMatch: !!storeState.pendingMatch,
      pendingMatchData: storeState.pendingMatch
    });

    // 🆕 モーダル表示後に該当通知をデータベースから削除
    if (notificationData.id) {
      console.log('🗑️ [NotificationStore] Deleting battle matched notification from database after modal display');
      const { deleteNotification } = useNotificationStore.getState();
      await deleteNotification(notificationData.id);
      console.log('✅ [NotificationStore] Battle matched notification deleted from database');
    }
  } catch (error) {
    console.error('❌ [BattleMatchedModal] Error handling battle matched notification:', error);
  }
};

// Helper function to handle battle result notifications
const handleBattleResultNotification = async (notificationData: Notification) => {
  console.log('🎬 [BattleResultModal] handleBattleResultNotification called:', notificationData);
  
  if (!notificationData.relatedBattleId) {
    console.log('❌ [BattleResultModal] No relatedBattleId found');
    return;
  }

  try {
    console.log('🔍 [BattleResultModal] Fetching battle data for ID:', notificationData.relatedBattleId);
    
    // バトル情報を取得してモーダルに必要なデータを構築
    const { data: battleData, error } = await supabase
      .from('archived_battles')
      .select(`
        *,
        player1_profile:profiles!player1_user_id(username),
        player2_profile:profiles!player2_user_id(username)
      `)
      .eq('original_battle_id', notificationData.relatedBattleId)
      .single();

    if (error) {
      console.error('❌ [BattleResultModal] Failed to fetch battle data:', error);
      return;
    }

    console.log('📊 [BattleResultModal] Battle data fetched:', battleData);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ [BattleResultModal] No authenticated user');
      return;
    }

    console.log('👤 [BattleResultModal] Current user ID:', user.id);

    const isPlayer1 = battleData.player1_user_id === user.id;
    const isPlayer2 = battleData.player2_user_id === user.id;
    
    console.log('🤔 [BattleResultModal] Player check:', { isPlayer1, isPlayer2 });
    
    if (!isPlayer1 && !isPlayer2) {
      console.log('❌ [BattleResultModal] User is not a participant in this battle');
      return;
    }

    const isWin = battleData.winner_id === user.id;
    const userRatingChange = isPlayer1 ? battleData.player1_rating_change : battleData.player2_rating_change;
    const userFinalRating = isPlayer1 ? battleData.player1_final_rating : battleData.player2_final_rating;
    const opponentUsername = isPlayer1 
      ? (battleData.player2_profile as any)?.username || 'Unknown'
      : (battleData.player1_profile as any)?.username || 'Unknown';

    const rankInfo = getCurrentRank(userFinalRating);

    const resultData = {
      battleId: notificationData.relatedBattleId,
      isWin,
      ratingChange: userRatingChange,
      newRating: userFinalRating,
      newRank: rankInfo.displayName,
      opponentUsername,
      battleFormat: battleData.battle_format,
    };

    console.log('🎯 [BattleResultModal] Result data prepared:', resultData);

    // BattleResultStoreにデータを設定してモーダルを表示
    const { showResultModal } = useBattleResultStore.getState();
    console.log('🎭 [BattleResultModal] Calling showResultModal...');
    showResultModal(resultData);
    console.log('✅ [BattleResultModal] showResultModal called successfully');

    // 🆕 モーダル表示後に該当通知をデータベースから削除
    if (notificationData.id) {
      console.log('🗑️ [NotificationStore] Deleting battle result notification from database after modal display');
      const { deleteNotification } = useNotificationStore.getState();
      await deleteNotification(notificationData.id);
      console.log('✅ [NotificationStore] Battle result notification deleted from database');
    }
  } catch (error) {
    console.error('❌ [BattleResultModal] Error handling battle result notification:', error);
  }
};

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'battle_matched' | 'battle_win' | 'battle_lose' | 'battle_draw';
  isRead: boolean;
  relatedBattleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  
  // Zustand Actions (メモリのみ - 後方互換性のため)
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt' | 'updatedAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Database Actions
  fetchNotifications: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  subscribeToNotifications: () => () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,

      // Zustand Actions (メモリのみ)
      addNotification: (notificationData) => {
        const newNotification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          ...notificationData,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => {
          const updatedNotifications = [newNotification, ...state.notifications];
          const newUnreadCount = updatedNotifications.filter(n => !n.isRead).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          };
        });

        // バトル終了通知の場合はモーダルを表示
        if (notificationData.type === 'battle_win' || notificationData.type === 'battle_lose') {
          console.log('🔔 [NotificationStore] Battle result notification detected, calling handler');
          handleBattleResultNotification(newNotification);
        }

        // ✅ バトルマッチング通知の場合はマッチングモーダルを表示
        if (notificationData.type === 'battle_matched') {
          console.log('⚡ [NotificationStore] Battle matched notification detected, calling handler');
          handleBattleMatchedNotification(newNotification);
        }

        // 同時にデータベースにも保存を試行（エラーは無視）
        get().createNotification(notificationData).catch(error => {
          console.warn('Failed to save notification to database:', error);
        });
      },

      markAsRead: (id) => {
        // 既読にする代わりに削除する
        set((state) => {
          const updatedNotifications = state.notifications.filter(n => n.id !== id);
          const newUnreadCount = updatedNotifications.filter(n => !n.isRead).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          };
        });

        // データベースからも削除
        get().deleteNotification(id).catch(error => {
          console.warn('Failed to delete notification from database:', error);
        });
      },

      markAllAsRead: () => {
        // すべての通知を削除する
        set({
          notifications: [],
            unreadCount: 0,
        });

        // データベースからもすべて削除
        get().deleteAllNotifications().catch(error => {
          console.warn('Failed to delete all notifications from database:', error);
        });
      },

      removeNotification: (id) => {
        set((state) => {
          const updatedNotifications = state.notifications.filter(n => n.id !== id);
          const newUnreadCount = updatedNotifications.filter(n => !n.isRead).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          };
        });

        // データベースからも削除
        get().deleteNotification(id).catch(error => {
          console.warn('Failed to delete notification from database:', error);
        });
      },

      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });

        // データベースからもすべて削除
        get().deleteAllNotifications().catch(error => {
          console.warn('Failed to clear all notifications from database:', error);
        });
      },

      // Database Actions
      fetchNotifications: async () => {
        set({ loading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set({ notifications: [], unreadCount: 0, loading: false });
            return;
          }

          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching notifications:', error);
            set({ error: error.message, loading: false });
            return;
          }

          const notifications: Notification[] = (data || []).map(item => ({
            id: item.id,
            title: item.title,
            message: item.message,
            type: item.type,
            isRead: item.is_read,
            relatedBattleId: item.related_battle_id,
            createdAt: new Date(item.created_at),
            updatedAt: new Date(item.updated_at),
          }));

          const unreadCount = notifications.filter(n => !n.isRead).length;

          set({
            notifications,
            unreadCount,
            loading: false,
            error: null,
          });

          // 🆕 既に存在する未読バトル結果通知があればモーダルを表示
          const pendingBattleResult = notifications.find(
            (n) =>
              !n.isRead &&
              (n.type === 'battle_win' || n.type === 'battle_lose') &&
              n.relatedBattleId
          );

          if (pendingBattleResult) {
            console.log('🔔 [NotificationStore] Pending battle result found on initial fetch, showing modal');
            handleBattleResultNotification(pendingBattleResult);
          }

          // ✅ 既に存在する未読バトルマッチング通知があればモーダルを表示
          const pendingBattleMatched = notifications.find(
            (n) =>
              !n.isRead &&
              n.type === 'battle_matched' &&
              n.relatedBattleId
          );

          console.log('🔍 [NotificationStore] Battle matched notification search result:', {
            totalNotifications: notifications.length,
            unreadNotifications: notifications.filter(n => !n.isRead).length,
            battleMatchedNotifications: notifications.filter(n => n.type === 'battle_matched').length,
            foundPending: !!pendingBattleMatched,
            pendingBattleMatched
          });

          if (pendingBattleMatched) {
            console.log('⚡ [NotificationStore] Pending battle matched found on initial fetch, showing modal');
            await handleBattleMatchedNotification(pendingBattleMatched);
          } else {
            console.log('🚫 [NotificationStore] No pending battle matched notifications found');
          }
        } catch (error) {
          console.error('Error in fetchNotifications:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch notifications',
            loading: false 
          });
        }
      },

      createNotification: async (notificationData) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const { data, error } = await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              title: notificationData.title,
              message: notificationData.message,
              type: notificationData.type,
              related_battle_id: notificationData.relatedBattleId || null,
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          console.log('✅ Notification saved to database:', data);
        } catch (error) {
          console.error('Error creating notification in database:', error);
          throw error;
        }
      },

      markNotificationAsRead: async (id) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) {
            throw error;
          }
        } catch (error) {
          console.error('Error marking notification as read:', error);
          throw error;
        }
      },

      markAllNotificationsAsRead: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

          if (error) {
            throw error;
          }
        } catch (error) {
          console.error('Error marking all notifications as read:', error);
          throw error;
        }
      },

      deleteNotification: async (id) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) {
            throw error;
          }
        } catch (error) {
          console.error('Error deleting notification:', error);
          throw error;
        }
      },

      deleteAllNotifications: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id);

          if (error) {
            throw error;
          }
        } catch (error) {
          console.error('Error deleting all notifications:', error);
          throw error;
        }
      },

      subscribeToNotifications: () => {
        console.log('🔔 Notifications system using manual refresh mode (WebSocket disabled for stability)');
        
        // WebSocket接続が不安定なため、手動更新ベースに切り替え
        // 初期データ取得
        get().fetchNotifications();
        
        // 定期的な手動更新（5分ごと）
        const refreshInterval = setInterval(() => {
          console.log('🔄 Manual refresh for notifications...');
          get().fetchNotifications();
        }, 300000); // 5分ごと
        
        // クリーンアップ関数を返す
        return () => {
          console.log('🧹 Cleaning up notifications manual refresh...');
          clearInterval(refreshInterval);
        };
      },
    }),
    {
      name: 'beatnexus-notifications',
      partialize: (state) => ({ 
        notifications: state.notifications,
        unreadCount: state.unreadCount 
      }),
    }
  )
); 