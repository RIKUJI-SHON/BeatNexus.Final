-- 2025-S11シーズンを最新の終了シーズンとして設定するマイグレーション
-- HomepageTestPageでのテスト表示用

-- 2025-S11シーズンのend_atを最新の日時に更新
UPDATE seasons 
SET 
  end_at = '2025-07-29 10:00:00+00',
  updated_at = NOW()
WHERE name = '2025-S11' AND status = 'ended';

-- 確認用のSELECT文（実際のマイグレーションでは不要だが、開発用として残す）
-- SELECT name, status, end_at, updated_at FROM seasons WHERE name = '2025-S11';
