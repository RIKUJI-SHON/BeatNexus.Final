import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

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
        console.log('🔔 Setting up notifications real-time subscription...');
        
        let channel: any = null;
        let isSetupComplete = false;
        
        // まず現在のユーザーを取得
        const setupSubscription = async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              console.log('❌ No user found for notifications subscription');
              return () => {};
            }

            console.log('👤 Setting up notifications subscription for user:', user.id);
            
            // 少し待ってからチャンネルを設定（WebSocket接続の安定化）
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            channel = supabase
              .channel(`user-notifications-${user.id}`)
              .on(
                'postgres_changes',
                { 
                  event: '*', 
                  schema: 'public', 
                  table: 'notifications',
                  filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                  console.log('📨 Notification change received:', payload);
                  
                  // データベースから最新の通知を再取得
                  console.log('🔄 Fetching latest notifications...');
                  get().fetchNotifications();
                }
              )
              .subscribe((status, err) => {
                console.log('🔔 Notifications subscription status:', status);
                if (status === 'SUBSCRIBED') {
                  console.log('✅ Successfully subscribed to notifications realtime updates');
                  isSetupComplete = true;
                  // 最初のサブスクリプション時にも最新データを取得
                  get().fetchNotifications();
                } else if (status === 'CHANNEL_ERROR') {
                  console.warn('⚠️ Notifications connection failed:', err);
                  console.warn('⚠️ Continuing with manual refresh mode');
                } else if (status === 'TIMED_OUT') {
                  console.warn('⏰ Notifications subscription timed out, will retry automatically');
                } else if (status === 'CLOSED') {
                  console.log('🔒 Notifications subscription closed');
                }
              });

            return () => {
              console.log('🧹 Cleaning up notifications subscription...');
              try {
                if (channel) {
                  supabase.removeChannel(channel);
                  console.log('✅ Notifications subscription cleaned up');
                }
              } catch (error) {
                console.warn('Warning during notifications cleanup:', error);
              }
            };
          } catch (error) {
            console.error('Error setting up notifications subscription:', error);
            return () => {};
          }
        };

        // 非同期で設定を開始
        let cleanup: (() => void) | null = null;
        setupSubscription().then(cleanupFn => {
          cleanup = cleanupFn;
        }).catch(error => {
          console.error('Failed to setup notifications subscription:', error);
        });

        return () => {
          if (cleanup) {
            cleanup();
          }
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