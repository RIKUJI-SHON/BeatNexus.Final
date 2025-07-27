export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      active_battles: {
        Row: {
          battle_format: Database["public"]["Enums"]["battle_format"]
          created_at: string
          end_voting_at: string
          id: string
          player1_submission_id: string
          player1_user_id: string
          player2_submission_id: string
          player2_user_id: string
          status: Database["public"]["Enums"]["battle_status"]
          updated_at: string
          votes_a: number
          votes_b: number
        }
        Insert: {
          battle_format: Database["public"]["Enums"]["battle_format"]
          created_at?: string
          end_voting_at?: string
          id?: string
          player1_submission_id: string
          player1_user_id: string
          player2_submission_id: string
          player2_user_id: string
          status?: Database["public"]["Enums"]["battle_status"]
          updated_at?: string
          votes_a?: number
          votes_b?: number
        }
        Update: {
          battle_format?: Database["public"]["Enums"]["battle_format"]
          created_at?: string
          end_voting_at?: string
          id?: string
          player1_submission_id?: string
          player1_user_id?: string
          player2_submission_id?: string
          player2_user_id?: string
          status?: Database["public"]["Enums"]["battle_status"]
          updated_at?: string
          votes_a?: number
          votes_b?: number
        }
        Relationships: []
      }
      archived_battle_votes: {
        Row: {
          archived_battle_id: string
          comment: string | null
          created_at: string
          id: string
          user_id: string | null
          vote: string
        }
        Insert: {
          archived_battle_id: string
          comment?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
          vote: string
        }
        Update: {
          archived_battle_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
          vote?: string
        }
        Relationships: []
      }
      archived_battles: {
        Row: {
          archived_at: string
          battle_format: Database["public"]["Enums"]["battle_format"]
          created_at: string
          final_votes_a: number
          final_votes_b: number
          id: string
          original_battle_id: string
          player1_final_rating: number | null
          player1_rating_change: number | null
          player1_submission_id: string
          player1_user_id: string
          player1_video_url: string | null
          player2_final_rating: number | null
          player2_rating_change: number | null
          player2_submission_id: string
          player2_user_id: string
          player2_video_url: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          archived_at?: string
          battle_format: Database["public"]["Enums"]["battle_format"]
          created_at?: string
          final_votes_a?: number
          final_votes_b?: number
          id?: string
          original_battle_id: string
          player1_final_rating?: number | null
          player1_rating_change?: number | null
          player1_submission_id: string
          player1_user_id: string
          player1_video_url?: string | null
          player2_final_rating?: number | null
          player2_rating_change?: number | null
          player2_submission_id: string
          player2_user_id: string
          player2_video_url?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          archived_at?: string
          battle_format?: Database["public"]["Enums"]["battle_format"]
          created_at?: string
          final_votes_a?: number
          final_votes_b?: number
          id?: string
          original_battle_id?: string
          player1_final_rating?: number | null
          player1_rating_change?: number | null
          player1_submission_id?: string
          player1_user_id?: string
          player1_video_url?: string | null
          player2_final_rating?: number | null
          player2_rating_change?: number | null
          player2_submission_id?: string
          player2_user_id?: string
          player2_video_url?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      battle_votes: {
        Row: {
          battle_id: string
          comment: string | null
          created_at: string
          id: string
          user_id: string | null
          vote: string
        }
        Insert: {
          battle_id: string
          comment?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
          vote: string
        }
        Update: {
          battle_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
          vote?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_community_id: string | null
          deleted_at: string | null
          has_seen_onboarding: boolean
          id: string
          is_deleted: boolean | null
          language: string | null
          rating: number
          updated_at: string
          username: string
          vote_count: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_community_id?: string | null
          deleted_at?: string | null
          has_seen_onboarding?: boolean
          id: string
          is_deleted?: boolean | null
          language?: string | null
          rating?: number
          updated_at?: string
          username: string
          vote_count?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_community_id?: string | null
          deleted_at?: string | null
          has_seen_onboarding?: boolean
          id?: string
          is_deleted?: boolean | null
          rating?: number
          updated_at?: string
          username?: string
          vote_count?: number
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      get_battle_comments: {
        Args: { p_battle_id: string }
        Returns: {
          id: string
          user_id: string
          username: string
          avatar_url: string
          vote: string
          comment: string
          created_at: string
        }[]
      }
    }
    Enums: {
      battle_format: "MAIN_BATTLE" | "MINI_BATTLE" | "THEME_CHALLENGE"
      battle_status: "ACTIVE" | "COMPLETED" | "PROCESSING_RESULTS"
      submission_status:
        | "WAITING_OPPONENT"
        | "MATCHED_IN_BATTLE"
        | "BATTLE_ENDED"
        | "WITHDRAWN"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
``` 