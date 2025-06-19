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
        Relationships: [
          {
            foreignKeyName: "active_battles_player1_user_id_fkey"
            columns: ["player1_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_battles_player1_user_id_fkey"
            columns: ["player1_user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "active_battles_player1_user_id_fkey"
            columns: ["player1_user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "active_battles_player2_user_id_fkey"
            columns: ["player2_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_battles_player2_user_id_fkey"
            columns: ["player2_user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "active_battles_player2_user_id_fkey"
            columns: ["player2_user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "archived_battles_player1_user_id_fkey"
            columns: ["player1_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_battles_player1_user_id_fkey"
            columns: ["player1_user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "archived_battles_player1_user_id_fkey"
            columns: ["player1_user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "archived_battles_player2_user_id_fkey"
            columns: ["player2_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_battles_player2_user_id_fkey"
            columns: ["player2_user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "archived_battles_player2_user_id_fkey"
            columns: ["player2_user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "archived_battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "archived_battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "battle_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "active_battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "public_active_battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "battle_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      communities: {
        Row: {
          average_rating: number | null
          created_at: string | null
          description: string | null
          id: string
          member_count: number | null
          name: string
          owner_user_id: string
          password_hash: string | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_count?: number | null
          name: string
          owner_user_id: string
          password_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_count?: number | null
          name?: string
          owner_user_id?: string
          password_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "communities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_chat_messages: {
        Row: {
          community_id: string
          content: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_chat_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_chat_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "global_community_rankings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["community_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "global_community_rankings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_template_specs: {
        Row: {
          created_at: string | null
          html_content: string
          id: number
          subject: string
          template_type: string
          text_content: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          html_content: string
          id?: number
          subject: string
          template_type: string
          text_content: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          html_content?: string
          id?: number
          subject?: string
          template_type?: string
          text_content?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_battle_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_battle_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_battle_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          liked_by: string[]
          likes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          liked_by?: string[]
          likes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          liked_by?: string[]
          likes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_community_id: string | null
          deleted_at: string | null
          email: string
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
          email: string
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
          email?: string
          has_seen_onboarding?: boolean
          id?: string
          is_deleted?: boolean | null
          language?: string | null
          rating?: number
          updated_at?: string
          username?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_community_id_fkey"
            columns: ["current_community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_community_id_fkey"
            columns: ["current_community_id"]
            isOneToOne: false
            referencedRelation: "global_community_rankings_view"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          active_battle_id: string | null
          battle_format: Database["public"]["Enums"]["battle_format"] | null
          created_at: string
          id: string
          rank_at_submission: number | null
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          active_battle_id?: string | null
          battle_format?: Database["public"]["Enums"]["battle_format"] | null
          created_at?: string
          id?: string
          rank_at_submission?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          active_battle_id?: string | null
          battle_format?: Database["public"]["Enums"]["battle_format"] | null
          created_at?: string
          id?: string
          rank_at_submission?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      community_rankings_view: {
        Row: {
          avatar_url: string | null
          community_id: string | null
          joined_at: string | null
          rank_in_community: number | null
          rating: number | null
          role: Database["public"]["Enums"]["community_role"] | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "global_community_rankings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      global_community_rankings_view: {
        Row: {
          average_rating: number | null
          created_at: string | null
          description: string | null
          global_rank: number | null
          id: string | null
          member_count: number | null
          name: string | null
          owner_avatar_url: string | null
          owner_user_id: string | null
          owner_username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "communities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_active_battles: {
        Row: {
          battle_format: Database["public"]["Enums"]["battle_format"] | null
          created_at: string | null
          end_voting_at: string | null
          id: string | null
          player1_submission_id: string | null
          player1_user_id: string | null
          player1_username: string | null
          player2_submission_id: string | null
          player2_user_id: string | null
          player2_username: string | null
          status: Database["public"]["Enums"]["battle_status"] | null
          updated_at: string | null
          votes_a: number | null
          votes_b: number | null
        }
        Relationships: []
      }
      public_archived_battles: {
        Row: {
          archived_at: string | null
          battle_format: Database["public"]["Enums"]["battle_format"] | null
          created_at: string | null
          final_votes_a: number | null
          final_votes_b: number | null
          id: string | null
          original_battle_id: string | null
          player1_final_rating: number | null
          player1_rating_change: number | null
          player1_user_id: string | null
          player1_username: string | null
          player1_video_url: string | null
          player2_final_rating: number | null
          player2_rating_change: number | null
          player2_user_id: string | null
          player2_username: string | null
          player2_video_url: string | null
          winner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archived_battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "archived_battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rankings_view: {
        Row: {
          avatar_url: string | null
          battles_lost: number | null
          battles_won: number | null
          position: number | null
          rank_color: string | null
          rank_name: string | null
          rating: number | null
          season_points: number | null
          user_id: string | null
          username: string | null
          win_rate: number | null
        }
        Relationships: []
      }
      user_communities_view: {
        Row: {
          average_rating: number | null
          community_created_at: string | null
          community_description: string | null
          community_id: string | null
          community_name: string | null
          joined_at: string | null
          member_count: number | null
          role: Database["public"]["Enums"]["community_role"] | null
          user_id: string | null
          user_rank_in_community: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "global_community_rankings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "rankings_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "voter_rankings_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      voter_rankings_view: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          position: number | null
          rank_color: string | null
          rank_name: string | null
          rating: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          vote_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_force_release_email: {
        Args: { p_email: string }
        Returns: Json
      }
      admin_force_release_email_v2: {
        Args: { p_email: string }
        Returns: Json
      }
      auto_release_deleted_emails: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      calculate_elo_rating: {
        Args: { winner_rating: number; loser_rating: number; k_factor?: number }
        Returns: Json
      }
      calculate_elo_rating_change: {
        Args: {
          player_rating: number
          opponent_rating: number
          result: number
          k_factor?: number
        }
        Returns: number
      }
      calculate_elo_rating_with_format: {
        Args: {
          winner_rating: number
          loser_rating: number
          battle_format?: string
        }
        Returns: Json
      }
      cancel_vote: {
        Args: { p_battle_id: string }
        Returns: Json
      }
      check_submission_cooldown: {
        Args: { p_user_id: string }
        Returns: Json
      }
      cleanup_all_deleted_user_videos: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      complete_battle: {
        Args: { p_battle_id: string }
        Returns: Json
      }
      complete_battle_with_deleted_user_handling: {
        Args: { p_battle_id: string }
        Returns: Json
      }
      create_community: {
        Args: { p_name: string; p_description: string; p_password?: string }
        Returns: Json
      }
      create_submission_with_cooldown_check: {
        Args: {
          p_user_id: string
          p_video_url: string
          p_battle_format: Database["public"]["Enums"]["battle_format"]
        }
        Returns: Json
      }
      delete_community: {
        Args: { p_community_id: string }
        Returns: Json
      }
      delete_user_videos_from_storage: {
        Args: { p_user_id: string }
        Returns: Json
      }
      find_match_and_create_battle: {
        Args: { p_submission_id: string }
        Returns: Json
      }
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
      get_k_factor_by_format: {
        Args: { battle_format: string }
        Returns: number
      }
      get_original_email_hint: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_rank_color_from_rating: {
        Args: { rating: number }
        Returns: string
      }
      get_rank_from_rating: {
        Args: { rating: number }
        Returns: string
      }
      get_top_rankings: {
        Args: { p_limit?: number }
        Returns: {
          user_id: string
          username: string
          avatar_url: string
          rating: number
          season_points: number
          rank_name: string
          rank_color: string
          battles_won: number
          battles_lost: number
          win_rate: number
          user_position: number
        }[]
      }
      get_top_voter_rankings: {
        Args: { p_limit?: number }
        Returns: {
          user_id: string
          username: string
          avatar_url: string
          vote_count: number
          rating: number
          rank_name: string
          rank_color: string
          created_at: string
          updated_at: string
          user_position: number
        }[]
      }
      get_user_current_community: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      get_user_email_language: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_profile: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_rank: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
          username: string
          avatar_url: string
          rating: number
          season_points: number
          rank_name: string
          rank_color: string
          battles_won: number
          battles_lost: number
          win_rate: number
          user_position: number
        }[]
      }
      get_user_vote: {
        Args: { p_battle_id: string }
        Returns: Json
      }
      get_user_voter_rank: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
          username: string
          avatar_url: string
          vote_count: number
          rating: number
          rank_name: string
          rank_color: string
          created_at: string
          updated_at: string
          user_position: number
        }[]
      }
      get_waiting_submissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          battle_format: Database["public"]["Enums"]["battle_format"]
          video_url: string
          created_at: string
          waiting_since: string
          max_allowed_rating_diff: number
          attempts_count: number
          updated_at: string
          username: string
          avatar_url: string
          user_rating: number
        }[]
      }
      join_community: {
        Args: { p_community_id: string; p_password?: string }
        Returns: Json
      }
      kick_member_from_community: {
        Args: { p_community_id: string; p_target_user_id: string }
        Returns: Json
      }
      leave_community: {
        Args: { p_community_id: string }
        Returns: Json
      }
      process_expired_battles: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      progressive_matchmaking: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      safe_delete_user_account: {
        Args: { p_user_id: string }
        Returns: Json
      }
      safe_delete_user_account_v2: {
        Args: { p_user_id: string }
        Returns: Json
      }
      safe_delete_user_account_v3: {
        Args: { p_user_id: string }
        Returns: Json
      }
      safe_delete_user_account_v4: {
        Args: { p_user_id: string }
        Returns: Json
      }
      set_user_language_from_browser: {
        Args: { p_user_id: string; p_browser_language?: string }
        Returns: Json
      }
      setup_custom_email_templates: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_battle_ratings: {
        Args: { p_battle_id: string; p_winner_id?: string }
        Returns: Json
      }
      update_battle_ratings_safe: {
        Args: {
          p_battle_id: string
          p_winner_id: string
          p_player1_deleted?: boolean
          p_player2_deleted?: boolean
        }
        Returns: Json
      }
      update_community_stats: {
        Args: { p_community_id: string }
        Returns: undefined
      }
      update_member_role: {
        Args: {
          p_community_id: string
          p_target_user_id: string
          p_new_role: Database["public"]["Enums"]["community_role"]
        }
        Returns: Json
      }
      update_onboarding_status: {
        Args: { p_user_id: string; p_has_seen_onboarding: boolean }
        Returns: undefined
      }
      update_user_avatar: {
        Args: { p_user_id: string; p_avatar_url: string }
        Returns: Json
      }
      update_user_language: {
        Args: { p_user_id: string; p_language: string }
        Returns: Json
      }
      update_user_profile_details: {
        Args: { p_user_id: string; p_username: string; p_bio: string }
        Returns: Json
      }
      vote_battle: {
        Args: { p_battle_id: string; p_vote: string }
        Returns: Json
      }
      vote_battle_with_comment: {
        Args: { p_battle_id: string; p_vote: string; p_comment?: string }
        Returns: Json
      }
      withdraw_submission: {
        Args: { p_submission_id: string }
        Returns: boolean
      }
    }
    Enums: {
      battle_format: "MAIN_BATTLE" | "MINI_BATTLE" | "THEME_CHALLENGE"
      battle_status: "ACTIVE" | "COMPLETED" | "PROCESSING_RESULTS"
      community_role: "owner" | "admin" | "member"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      battle_format: ["MAIN_BATTLE", "MINI_BATTLE", "THEME_CHALLENGE"],
      battle_status: ["ACTIVE", "COMPLETED", "PROCESSING_RESULTS"],
      community_role: ["owner", "admin", "member"],
      submission_status: [
        "WAITING_OPPONENT",
        "MATCHED_IN_BATTLE",
        "BATTLE_ENDED",
        "WITHDRAWN",
      ],
    },
  },
} as const
