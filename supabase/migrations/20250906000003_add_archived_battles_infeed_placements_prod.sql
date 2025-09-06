-- アーカイブ一覧（3枚おき）用の広告配置を追加（本番環境）
-- 作成日: 2025-09-06
-- 目的: アーカイブバトル一覧での広告計測時のplacement_id null問題を解決

begin;

-- アーカイブバトル一覧用の配置場所を追加
insert into ad_placements (key, description, is_active) values
  ('battles.archived.after-3.infeed','ArchivedBattles 一覧 3件後 InFeed', true),
  ('battles.archived.after-6.infeed','ArchivedBattles 一覧 6件後 InFeed', true),
  ('battles.archived.after-9.infeed','ArchivedBattles 一覧 9件後 InFeed', true),
  ('battles.archived.after-12.infeed','ArchivedBattles 一覧 12件後 InFeed', true),
  ('battles.archived.after-15.infeed','ArchivedBattles 一覧 15件後 InFeed', true),
  ('battles.archived.after-18.infeed','ArchivedBattles 一覧 18件後 InFeed', true),
  ('battles.archived.after-21.infeed','ArchivedBattles 一覧 21件後 InFeed', true),
  ('battles.archived.after-24.infeed','ArchivedBattles 一覧 24件後 InFeed', true),
  ('battles.archived.after-27.infeed','ArchivedBattles 一覧 27件後 InFeed', true),
  ('battles.archived.after-30.infeed','ArchivedBattles 一覧 30件後 InFeed', true)
  on conflict (key) do update set 
    is_active = excluded.is_active, 
    description = excluded.description;

commit;

-- 注意：
-- 1. この配置場所は generateArchivedBattleAdRules() 関数で使用されます
-- 2. フロントエンド側では 'battles.archived.after-{position}.infeed' 形式で配置キーが生成されます
-- 3. 今後の計測では placement_id が正しく記録されるため、配置場所別の分析が可能になります
