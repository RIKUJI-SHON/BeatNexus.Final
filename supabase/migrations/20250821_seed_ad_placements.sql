-- seed initial ad placement keys (idempotent)
begin;
insert into ad_placements (key, description, size) values
  ('home.features.mid.inline','Home HowItWorks→Features 間 Inline','inline-medium'),
  ('home.latest.before-list.infeed','Home LatestBattles 手前 InFeed','infeed-card'),
  ('battles.list.after-3.infeed','Battles 3件後 InFeed','infeed-card'),
  ('battles.list.after-10.infeed','Battles 10件後 InFeed 深部','infeed-card'),
  ('ranking.top.banner','Ranking トップポディウム直下 Banner','banner-wide'),
  ('ranking.list.after-5.infeed','Ranking 5位後 InFeed','infeed-card')
on conflict (key) do nothing;
commit;
