// AUTO-GENERATED: Supabase types including ad tables (2025-08-21)
// Source: development project (wdttluticnlqzmqmfvgt)
// NOTE: Commit together with corresponding migrations.

/* eslint-disable */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12.2.3 (519615d)' }
  public: {
    Tables: {
      ad_campaigns: {
        Row: { advertiser_id: string | null; created_at: string | null; end_date: string; id: string; name: string; objective: string | null; start_date: string; status: string; updated_at: string | null }
        Insert: { advertiser_id?: string | null; created_at?: string | null; end_date: string; id?: string; name: string; objective?: string | null; start_date: string; status: string; updated_at?: string | null }
        Update: { advertiser_id?: string | null; created_at?: string | null; end_date?: string; id?: string; name?: string; objective?: string | null; start_date?: string; status?: string; updated_at?: string | null }
        Relationships: [{ foreignKeyName: 'ad_campaigns_advertiser_id_fkey'; columns: ['advertiser_id']; isOneToOne: false; referencedRelation: 'advertisers'; referencedColumns: ['id'] }]
      }
      ad_creatives: {
        Row: { body: string | null; campaign_id: string | null; created_at: string | null; cta_text: string | null; dimensions: string | null; file_url: string | null; headline: string | null; id: string; metadata: Json | null; target_url: string | null; type: string; updated_at: string | null }
        Insert: { body?: string | null; campaign_id?: string | null; created_at?: string | null; cta_text?: string | null; dimensions?: string | null; file_url?: string | null; headline?: string | null; id?: string; metadata?: Json | null; target_url?: string | null; type: string; updated_at?: string | null }
        Update: { body?: string | null; campaign_id?: string | null; created_at?: string | null; cta_text?: string | null; dimensions?: string | null; file_url?: string | null; headline?: string | null; id?: string; metadata?: Json | null; target_url?: string | null; type?: string; updated_at?: string | null }
        Relationships: [{ foreignKeyName: 'ad_creatives_campaign_id_fkey'; columns: ['campaign_id']; isOneToOne: false; referencedRelation: 'ad_campaigns'; referencedColumns: ['id'] }]
      }
      ad_events: {
        Row: { anon_session_id: string | null; client_meta: Json | null; creative_id: string | null; flight_id: string | null; id: number; occurred_at: string; placement_id: string | null; type: string; user_id: string | null }
        Insert: { anon_session_id?: string | null; client_meta?: Json | null; creative_id?: string | null; flight_id?: string | null; id?: number; occurred_at?: string; placement_id?: string | null; type: string; user_id?: string | null }
        Update: { anon_session_id?: string | null; client_meta?: Json | null; creative_id?: string | null; flight_id?: string | null; id?: number; occurred_at?: string; placement_id?: string | null; type?: string; user_id?: string | null }
        Relationships: [
          { foreignKeyName: 'ad_events_creative_id_fkey'; columns: ['creative_id']; isOneToOne: false; referencedRelation: 'ad_creatives'; referencedColumns: ['id'] },
          { foreignKeyName: 'ad_events_flight_id_fkey'; columns: ['flight_id']; isOneToOne: false; referencedRelation: 'ad_flights'; referencedColumns: ['id'] },
          { foreignKeyName: 'ad_events_placement_id_fkey'; columns: ['placement_id']; isOneToOne: false; referencedRelation: 'ad_placements'; referencedColumns: ['id'] }
        ]
      }
      ad_flights: {
        Row: { campaign_id: string | null; created_at: string | null; daily_cap: number | null; id: string; imp_goal: number | null; placement_id: string | null; targeting_json: Json | null; updated_at: string | null; weight: number | null }
        Insert: { campaign_id?: string | null; created_at?: string | null; daily_cap?: number | null; id?: string; imp_goal?: number | null; placement_id?: string | null; targeting_json?: Json | null; updated_at?: string | null; weight?: number | null }
        Update: { campaign_id?: string | null; created_at?: string | null; daily_cap?: number | null; id?: string; imp_goal?: number | null; placement_id?: string | null; targeting_json?: Json | null; updated_at?: string | null; weight?: number | null }
        Relationships: [
          { foreignKeyName: 'ad_flights_campaign_id_fkey'; columns: ['campaign_id']; isOneToOne: false; referencedRelation: 'ad_campaigns'; referencedColumns: ['id'] },
          { foreignKeyName: 'ad_flights_placement_id_fkey'; columns: ['placement_id']; isOneToOne: false; referencedRelation: 'ad_placements'; referencedColumns: ['id'] }
        ]
      }
      ad_placements: {
        Row: { created_at: string | null; description: string | null; id: string; is_active: boolean | null; key: string; size: string | null }
        Insert: { created_at?: string | null; description?: string | null; id?: string; is_active?: boolean | null; key: string; size?: string | null }
        Update: { created_at?: string | null; description?: string | null; id?: string; is_active?: boolean | null; key?: string; size?: string | null }
        Relationships: []
      }
      advertisers: {
        Row: { billing_info: Json | null; contact_info: Json | null; created_at: string | null; id: string; name: string; updated_at: string | null }
        Insert: { billing_info?: Json | null; contact_info?: Json | null; created_at?: string | null; id?: string; name: string; updated_at?: string | null }
        Update: { billing_info?: Json | null; contact_info?: Json | null; created_at?: string | null; id?: string; name?: string; updated_at?: string | null }
        Relationships: []
      }
      // ... other non-ad tables omitted for brevity in this generated slice
    }
    Views: {
      mv_ad_stats_daily: {
        Row: { day: string | null; creative_id: string | null; placement_id: string | null; flight_id: string | null; impressions: number | null; clicks: number | null }
        Relationships: []
      }
    }
    Functions: { app_role: { Args: Record<PropertyKey, never>; Returns: string } }
    Enums: {}
    CompositeTypes: { [_ in never]: never }
  }
}

export type AdTable = Database['public']['Tables'];
export type AdCampaign = AdTable['ad_campaigns']['Row'];
export type AdCreative = AdTable['ad_creatives']['Row'];
export type AdPlacement = AdTable['ad_placements']['Row'];
export type AdFlight = AdTable['ad_flights']['Row'];
export type AdEvent = AdTable['ad_events']['Row'];

export interface ServeRequestContext {
  placementKey: string;
  country?: string;
  language?: string;
  device?: string; // 'desktop' | 'mobile'
  userId?: string;
  anonSessionId?: string;
}

export interface SignedAdTokenPayload {
  creative_id: string;
  flight_id: string | null;
  placement_id: string;
  exp: number; // epoch seconds
}

// Utility helper narrow types
export type AdStatsDailyRow = {
  day: string;
  creative_id: string | null;
  placement_id: string | null;
  flight_id: string | null;
  impressions: number | null;
  clicks: number | null;
};
