import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { 
  Community, 
  CommunityMember, 
  CommunityChatMessage, 
  CommunityWithOwner,
  UserCommunity,
  CommunityRanking,
  CommunityRole
} from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CommunityState {
  communities: CommunityWithOwner[];
  userCommunities: UserCommunity[];
  currentCommunity: Community | null;
  currentCommunityMembers: CommunityRanking[];
  chatMessages: CommunityChatMessage[];
  myRole: CommunityRole | null;
  loading: boolean;
  error: string | null;
  chatChannel: RealtimeChannel | null;

  // コミュニティ一覧取得
  fetchCommunities: () => Promise<void>;
  
  // ユーザーが参加しているコミュニティ一覧取得
  fetchUserCommunities: () => Promise<void>;
  
  // ユーザーの現在のコミュニティを取得
  fetchUserCurrentCommunity: () => Promise<Community | null>;
  
  // コミュニティ作成
  createCommunity: (name: string, description: string, password?: string) => Promise<{ success: boolean; message: string; community_id?: string }>;
  
  // コミュニティ参加
  joinCommunity: (communityId: string, password?: string) => Promise<{ success: boolean; message: string }>;
  
  // コミュニティ退出
  leaveCommunity: (communityId: string) => Promise<{ success: boolean; message: string }>;
  
  // コミュニティ削除（オーナーのみ）
  deleteCommunity: (communityId: string) => Promise<{ success: boolean; message: string }>;
  
  // コミュニティ詳細とメンバー取得
  fetchCommunityDetails: (communityId: string) => Promise<void>;
  
  // メンバーキック
  kickMember: (communityId: string, userId: string) => Promise<{ success: boolean; message: string }>;
  
  // メンバーの役割変更
  updateMemberRole: (communityId: string, userId: string, newRole: CommunityRole) => Promise<{ success: boolean; message: string }>;
  
  // チャットメッセージ送信
  sendChatMessage: (communityId: string, content: string) => Promise<void>;
  
  // チャットメッセージ取得
  fetchChatMessages: (communityId: string) => Promise<void>;
  
  // チャットのリアルタイム購読開始
  subscribeToCommunityChat: (communityId: string) => void;
  
  // チャットのリアルタイム購読解除
  unsubscribeFromCommunityChat: () => void;
  
  // エラーをクリア
  clearError: () => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  communities: [],
  userCommunities: [],
  currentCommunity: null,
  currentCommunityMembers: [],
  chatMessages: [],
  myRole: null,
  loading: false,
  error: null,
  chatChannel: null,

  fetchCommunities: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('global_community_rankings_view')
        .select('*')
        .order('global_rank', { ascending: true });

      if (error) throw error;
      set({ communities: data || [] });
    } catch (error) {
      console.error('Error fetching communities:', error);
      set({ error: 'Failed to fetch communities' });
    } finally {
      set({ loading: false });
    }
  },

  fetchUserCommunities: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_communities_view')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      set({ userCommunities: data || [] });
    } catch (error) {
      console.error('Error fetching user communities:', error);
      set({ error: 'Failed to fetch your communities' });
    } finally {
      set({ loading: false });
    }
  },

  fetchUserCurrentCommunity: async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_current_community');
      
      if (error) throw error;
      
      if (data.success && data.community) {
        return data.community as Community;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user current community:', error);
      return null;
    }
  },

  createCommunity: async (name: string, description: string, password?: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('create_community', {
        p_name: name,
        p_description: description,
        p_password: password || null
      });

      if (error) throw error;
      
      if (data.success) {
        // コミュニティ一覧を再取得
        await get().fetchCommunities();
        await get().fetchUserCommunities();
      }
      
      return data;
    } catch (error) {
      console.error('Error creating community:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create community';
      set({ error: errorMessage });
      return { success: false, message: errorMessage };
    } finally {
      set({ loading: false });
    }
  },

  joinCommunity: async (communityId: string, password?: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('join_community', {
        p_community_id: communityId,
        p_password: password || null
      });

      if (error) throw error;
      
      if (data.success) {
        // コミュニティ一覧を再取得
        await get().fetchCommunities();
        await get().fetchUserCommunities();
      }
      
      return data;
    } catch (error) {
      console.error('Error joining community:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join community';
      set({ error: errorMessage });
      return { success: false, message: errorMessage };
    } finally {
      set({ loading: false });
    }
  },

  leaveCommunity: async (communityId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('leave_community', {
        p_community_id: communityId
      });

      if (error) throw error;
      
      if (data.success) {
        // コミュニティ一覧を再取得
        await get().fetchCommunities();
        await get().fetchUserCommunities();
        // 現在のコミュニティから退出した場合はクリア
        if (get().currentCommunity?.id === communityId) {
          set({ currentCommunity: null, currentCommunityMembers: [], myRole: null });
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error leaving community:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave community';
      set({ error: errorMessage });
      return { success: false, message: errorMessage };
    } finally {
      set({ loading: false });
    }
  },

  deleteCommunity: async (communityId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('delete_community', {
        p_community_id: communityId
      });

      if (error) throw error;
      
      if (data.success) {
        // コミュニティ一覧を再取得
        await get().fetchCommunities();
        await get().fetchUserCommunities();
        // 削除されたコミュニティが現在のコミュニティの場合はクリア
        if (get().currentCommunity?.id === communityId) {
          set({ currentCommunity: null, currentCommunityMembers: [], myRole: null });
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error deleting community:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete community';
      set({ error: errorMessage });
      return { success: false, message: errorMessage };
    } finally {
      set({ loading: false });
    }
  },

  fetchCommunityDetails: async (communityId: string) => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // コミュニティ情報を取得
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();

      if (communityError) throw communityError;

      // メンバー一覧を取得
      const { data: membersData, error: membersError } = await supabase
        .from('community_rankings_view')
        .select('*')
        .eq('community_id', communityId);

      if (membersError) throw membersError;

      // 自分の役割を取得
      const myMember = membersData?.find(m => m.user_id === user.id);
      
      set({ 
        currentCommunity: communityData, 
        currentCommunityMembers: membersData || [],
        myRole: myMember?.role || null
      });
    } catch (error) {
      console.error('Error fetching community details:', error);
      set({ error: 'Failed to fetch community details' });
    } finally {
      set({ loading: false });
    }
  },

  kickMember: async (communityId: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('kick_member_from_community', {
        p_community_id: communityId,
        p_target_user_id: userId
      });

      if (error) throw error;
      
      if (data.success) {
        // メンバー一覧を再取得
        await get().fetchCommunityDetails(communityId);
      }
      
      return data;
    } catch (error) {
      console.error('Error kicking member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to kick member';
      set({ error: errorMessage });
      return { success: false, message: errorMessage };
    } finally {
      set({ loading: false });
    }
  },

  updateMemberRole: async (communityId: string, userId: string, newRole: CommunityRole) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('update_member_role', {
        p_community_id: communityId,
        p_target_user_id: userId,
        p_new_role: newRole
      });

      if (error) throw error;
      
      if (data.success) {
        // メンバー一覧を再取得
        await get().fetchCommunityDetails(communityId);
      }
      
      return data;
    } catch (error) {
      console.error('Error updating member role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update member role';
      set({ error: errorMessage });
      return { success: false, message: errorMessage };
    } finally {
      set({ loading: false });
    }
  },

  fetchChatMessages: async (communityId: string) => {
    set({ loading: true, error: null });
    try {
      console.log('Fetching chat messages for community:', communityId);
      
      // 認証状況を確認
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // RLSが無効化されているはずなので、シンプルなクエリでテスト
      const { data: messagesData, error: messagesError } = await supabase
        .from('community_chat_messages')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: true })
        .limit(50);

      console.log('Messages query result:', { messagesData, messagesError });
      
      if (messagesError) {
        console.error('Messages error details:', messagesError);
        throw messagesError;
      }

      if (!messagesData || messagesData.length === 0) {
        console.log('No messages found, setting empty array');
        set({ chatMessages: [] });
        return;
      }

      // ユーザー情報を取得（別クエリで）
      const userIds = [...new Set(messagesData.map(msg => msg.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      console.log('Users query result:', { usersData, usersError });

      if (usersError) {
        console.warn('Could not fetch user profiles:', usersError);
      }

      // ユーザー情報をマップに変換
      const userMap = new Map();
      if (usersData) {
        usersData.forEach(user => {
          userMap.set(user.id, user);
        });
      }

      // メッセージとユーザー情報を結合
      const messages: CommunityChatMessage[] = messagesData.map(msg => {
        const user = userMap.get(msg.user_id);
        return {
          id: msg.id,
          community_id: msg.community_id,
          user_id: msg.user_id,
          content: msg.content,
          created_at: msg.created_at,
          username: user?.username || `User-${msg.user_id.slice(0, 8)}`,
          avatar_url: user?.avatar_url
        };
      });

      console.log('Processed messages:', messages);
      set({ chatMessages: messages });
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      set({ error: 'Failed to fetch chat messages' });
    } finally {
      set({ loading: false });
    }
  },

  sendChatMessage: async (communityId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('community_chat_messages')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending chat message:', error);
      set({ error: 'Failed to send message' });
    }
  },

  subscribeToCommunityChat: (communityId: string) => {
    // 既存のチャンネルがあれば購読解除
    get().unsubscribeFromCommunityChat();

    const channel = supabase
      .channel(`community_chat:${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_chat_messages',
          filter: `community_id=eq.${communityId}`
        },
        async (payload) => {
          // 新しいメッセージのユーザー情報を取得
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage: CommunityChatMessage = {
            id: payload.new.id,
            community_id: payload.new.community_id,
            user_id: payload.new.user_id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            username: profile?.username,
            avatar_url: profile?.avatar_url
          };

          set(state => ({
            chatMessages: [...state.chatMessages, newMessage]
          }));
        }
      )
      .subscribe();

    set({ chatChannel: channel });
  },

  unsubscribeFromCommunityChat: () => {
    const { chatChannel } = get();
    if (chatChannel) {
      supabase.removeChannel(chatChannel);
      set({ chatChannel: null });
    }
  },

  clearError: () => set({ error: null })
})); 