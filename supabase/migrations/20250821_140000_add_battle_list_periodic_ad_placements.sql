-- 3件ごとの広告配置システム実装
-- バトル一覧ページで3件ごとに広告を表示するための配置場所を追加
-- 本番環境用マイグレーション

begin;

-- 3件ごとの広告配置を追加（after-6からafter-30まで）
insert into ad_placements (key, description, size) values
  ('battles.list.after-6.infeed','Battles 6件後 InFeed','300x250'),
  ('battles.list.after-9.infeed','Battles 9件後 InFeed','300x250'),
  ('battles.list.after-12.infeed','Battles 12件後 InFeed','300x250'),
  ('battles.list.after-15.infeed','Battles 15件後 InFeed','300x250'),
  ('battles.list.after-18.infeed','Battles 18件後 InFeed','300x250'),
  ('battles.list.after-21.infeed','Battles 21件後 InFeed','300x250'),
  ('battles.list.after-24.infeed','Battles 24件後 InFeed','300x250'),
  ('battles.list.after-27.infeed','Battles 27件後 InFeed','300x250'),
  ('battles.list.after-30.infeed','Battles 30件後 InFeed','300x250')
on conflict (key) do nothing;

commit;
