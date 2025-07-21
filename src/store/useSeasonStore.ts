import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Season {
  id: string;
  name: string;
  status: 'upcoming' | 'active' | 'ended';
  start_at: string;
  end_at: string;
  created_at: string;
  updated_at: string;
}

interface SeasonState {
  activeSeason: Season | null;
  fetchActiveSeason: () => Promise<void>;
  checkForNewSeason: () => Promise<void>; // 後方互換性のため残すがもう使用しない
}

let lastCheckedSeasonId: string | null = null;

export const useSeasonStore = create<SeasonState>((set) => ({
  activeSeason: null,
  fetchActiveSeason: async () => {
    console.log('🔄 [SeasonStore] Fetching active season...');
    
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .order('start_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('❌ [SeasonStore] Error fetching active season:', error);
    } else {
      console.log('📊 [SeasonStore] Active season fetched:', data);
      set({ activeSeason: data });
      if (data) {
        lastCheckedSeasonId = data.id;
        console.log('✅ [SeasonStore] lastCheckedSeasonId initialized to:', lastCheckedSeasonId);
      }
    }
  },
  checkForNewSeason: async () => {
    console.log('🔍 [SeasonStore] Checking for new season. lastCheckedSeasonId:', lastCheckedSeasonId);
    
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .order('start_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('❌ [SeasonStore] Error checking for new season:', error);
      return;
    }

    console.log('📊 [SeasonStore] Current active season:', data);
    console.log('🔍 [SeasonStore] Comparison - Current ID:', data?.id, 'Last checked ID:', lastCheckedSeasonId);

    if (data && data.id !== lastCheckedSeasonId) {
      console.log('🎉 [SeasonStore] New season detected!', data.id, 'Previous ID:', lastCheckedSeasonId);
      set({ activeSeason: data });
      lastCheckedSeasonId = data.id;
      
      // モーダルを開く
      console.log('🚀 [SeasonStore] Opening new season modal...');
      const { useModalStore } = await import('./useModalStore');
      useModalStore.getState().openNewSeasonModal();
      console.log('✅ [SeasonStore] Modal open command sent');
    } else {
      console.log('ℹ️ [SeasonStore] No new season detected. Same season ID:', data?.id);
    }
  },
}));
