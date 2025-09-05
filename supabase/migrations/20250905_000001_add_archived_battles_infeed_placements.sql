-- アーカイブ一覧（3枚おき）用の広告配置を追加
-- 仕様: battles.archived.after-3/6/9.infeed ほか、以後は必要に応じて拡張

begin;

insert into ad_placements (key, description, size, is_active) values
  ('battles.archived.after-3.infeed','ArchivedBattles 一覧 3件後 InFeed','infeed-card', true),
  ('battles.archived.after-6.infeed','ArchivedBattles 一覧 6件後 InFeed','infeed-card', true),
  ('battles.archived.after-9.infeed','ArchivedBattles 一覧 9件後 InFeed','infeed-card', true)
  on conflict (key) do update set is_active = excluded.is_active, description = excluded.description, size = excluded.size;

commit;
