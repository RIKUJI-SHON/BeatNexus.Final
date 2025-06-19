-- 引数付きの統計更新関数を作成

-- コミュニティ統計を手動で更新する関数（引数付き）
CREATE OR REPLACE FUNCTION update_community_stats(p_community_id uuid)
RETURNS void AS $$
BEGIN
  -- メンバー数と平均レーティングを再計算
  UPDATE communities
  SET 
    member_count = (
      SELECT COUNT(*) FROM community_members 
      WHERE community_id = p_community_id
    ),
    average_rating = COALESCE((
      SELECT AVG(p.rating)::integer 
      FROM community_members cm
      JOIN profiles p ON cm.user_id = p.id
      WHERE cm.community_id = p_community_id
    ), 1200), -- デフォルト値
    updated_at = now()
  WHERE id = p_community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガー関数名を変更（競合回避）
CREATE OR REPLACE FUNCTION update_community_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- メンバー数と平均レーティングを再計算
  UPDATE communities c
  SET 
    member_count = (
      SELECT COUNT(*) FROM community_members 
      WHERE community_id = c.id
    ),
    average_rating = COALESCE((
      SELECT AVG(p.rating)::integer 
      FROM community_members cm
      JOIN profiles p ON cm.user_id = p.id
      WHERE cm.community_id = c.id
    ), 1200), -- デフォルト値
    updated_at = now()
  WHERE c.id = COALESCE(NEW.community_id, OLD.community_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガーを再作成
DROP TRIGGER IF EXISTS update_community_stats_trigger ON community_members;
CREATE TRIGGER update_community_stats_trigger
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_stats_trigger(); 