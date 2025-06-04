export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface Battle {
  id: string;
  title: string;
  created_at: string;
  end_voting_at: string;
  contestant_a_id: string;
  contestant_b_id: string;
  votes_a: number;
  votes_b: number;
  status: string;
  battle_format: string;
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
  player1_rating_change?: number;
  player2_rating_change?: number;
  player1_final_rating?: number;
  player2_final_rating?: number;
  player1_video_url?: string | null;
  player2_video_url?: string | null;
  // 関連データ
  contestant_a?: User;
  contestant_b?: User;
  player1_submission?: Submission;
  player2_submission?: Submission;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes: number;
  comments: number;
  liked_by: string[];
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

// 待機プール用の新しい型定義
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
  // JOINで取得する追加情報
  user_rating?: number;
  username?: string;
  avatar_url?: string | null;
}

export type BattleFormat = 'MAIN_BATTLE' | 'MINI_BATTLE' | 'THEME_CHALLENGE';
export type SubmissionStatus = 'WAITING_OPPONENT' | 'MATCHED_IN_BATTLE' | 'BATTLE_ENDED' | 'WITHDRAWN';

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