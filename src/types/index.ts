export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  rating: number;
  language: string;
  vote_count: number;
  has_seen_onboarding: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Battle {
  id: string;
  player1_submission_id: string;
  player2_submission_id: string;
  player1_user_id: string;
  player2_user_id: string;
  contestant_a_id: string | null;
  contestant_b_id: string | null;
  battle_format: BattleFormat;
  status: BattleStatus;
  votes_a: number;
  votes_b: number;
  end_voting_at: string;
  created_at: string;
  updated_at: string;
  contestant_a?: {
    username: string;
    avatar_url: string | null;
  };
  contestant_b?: {
    username: string;
    avatar_url: string | null;
  };
  video_url_a?: string;
  video_url_b?: string;
}

export interface ArchivedBattle {
  id: string;
  original_battle_id: string;
  winner_id: string | null;
  final_votes_a: number;
  final_votes_b: number;
  archived_at: string;
  player1_user_id: string;
  player2_user_id: string;
  player1_submission_id: string;
  player2_submission_id: string;
  created_at: string;
  updated_at: string;
  battle_format: BattleFormat;
  player1_rating_change: number | null;
  player2_rating_change: number | null;
  player1_final_rating: number | null;
  player2_final_rating: number | null;
  player1_video_url: string | null;
  player2_video_url: string | null;
  contestant_a?: User;
  contestant_b?: User;
  player1_submission?: Submission;
  player2_submission?: Submission;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  likes: number;
  liked_by: string[];
  comments_count: number;
  created_at: string;
  updated_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export interface RankingEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  season_points: number;
  rank_name: string;
  rank_color: string;
  battles_won: number;
  battles_lost: number;
  win_rate: number;
  position: number;
}

export interface VoterRankingEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  vote_count: number;
  rating: number;
  rank_name: string;
  rank_color: string;
  created_at: string;
  updated_at: string;
  position: number;
}

export interface RankInfo {
  rank: string;
  displayName: string;
  color: string;
  iconColor: string;
  minRating: number;
  maxRating: number;
}

export interface RankProgress {
  currentRank: RankInfo;
  nextRank: RankInfo | null;
  progress: number; // 0-100 percentage
  pointsNeeded: number;
  totalPointsInCurrentRank: number;
}

export interface WaitingSubmission {
  id: string;
  user_id: string;
  battle_format: string;
  video_url: string;
  created_at: string;
  waiting_since: string;
  max_allowed_rating_diff: number;
  attempts_count: number;
  updated_at: string;
  user_rating?: number;
  username?: string;
  avatar_url?: string | null;
}

export type BattleFormat = 'MAIN_BATTLE' | 'MINI_BATTLE' | 'THEME_CHALLENGE';
export type SubmissionStatus = 'WAITING_OPPONENT' | 'MATCHED_IN_BATTLE' | 'BATTLE_ENDED' | 'WITHDRAWN';
export type BattleStatus = 'ACTIVE' | 'COMPLETED' | 'PROCESSING_RESULTS';

export interface Submission {
  id: string;
  user_id: string;
  video_url: string;
  status: SubmissionStatus;
  rank_at_submission: number | null;
  active_battle_id: string | null;
  created_at: string;
  updated_at: string;
  battle_format: BattleFormat | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'battle_matched' | 'battle_win' | 'battle_lose' | 'battle_draw';
  is_read: boolean;
  related_battle_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BattleVote {
  id: string;
  battle_id: string;
  user_id: string | null;
  vote: 'A' | 'B';
  comment?: string | null;
  created_at: string;
}

export interface BattleComment {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  vote: 'A' | 'B';
  comment: string;
  created_at: string;
}

export interface DatabaseFunctionResponse {
  success: boolean;
  error?: string;
  error_detail?: string;
  [key: string]: any;
}

export interface UserRankInfo {
  user_id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  season_points: number;
  rank_name: string;
  rank_color: string;
  battles_won: number;
  battles_lost: number;
  win_rate: number;
  user_position: number;
}

export interface VoterRankInfo {
  user_id: string;
  username: string;
  avatar_url: string | null;
  vote_count: number;
  rating: number;
  rank_name: string;
  rank_color: string;
  created_at: string;
  updated_at: string;
  user_position: number;
}

// Community types
export type CommunityRole = 'owner' | 'admin' | 'member';

export interface Community {
  id: string;
  name: string;
  description?: string;
  owner_user_id: string;
  member_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
  password_hash?: string;
}

export interface CommunityMember {
  community_id: string;
  user_id: string;
  role: CommunityRole;
  joined_at: string;
  username?: string;
  avatar_url?: string;
  rating?: number;
}

export interface CommunityChatMessage {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export interface CommunityWithOwner extends Community {
  owner_username: string;
  owner_avatar_url?: string;
  global_rank?: number;
}

export interface UserCommunity {
  user_id: string;
  community_id: string;
  role: CommunityRole;
  joined_at: string;
  community_name: string;
  community_description?: string;
  member_count: number;
  average_rating: number;
  user_rank_in_community?: number;
}

export interface CommunityRanking {
  community_id: string;
  user_id: string;
  role: CommunityRole;
  joined_at: string;
  username: string;
  avatar_url?: string;
  rating: number;
  rank_in_community: number;
}