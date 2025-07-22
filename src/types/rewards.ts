export interface Reward {
  id: string;
  name: string;
  description: string | null;
  type: 'badge' | 'frame';
  image_url: string;
  season_id: string | null;
  rank_requirement: number | null;
  min_battles: number;
  is_limited: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_id: string;
  earned_at: string;
  earned_season_id: string | null;
  reward: Reward;
}

export interface CollectionStats {
  totalBadges: number;
  totalFrames: number;
  earnedBadges: number;
  earnedFrames: number;
}
