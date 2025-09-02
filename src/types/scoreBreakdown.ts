import { ScoreSheet } from './scoreSheet';

export interface ScoreBreakdownEntry {
  user_id: string;
  vote: 'A' | 'B';
  comment: string | null;
  score_sheet: ScoreSheet;
  created_at: string;
}
