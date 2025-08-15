-- Insert multilingual news article announcing ranking updates
-- Safe to run once per environment

insert into public.site_news (
  id, title, body, image_url, link_url, content_type,
  article_content, meta_description, tags,
  is_featured, is_published, display_order,
  published_at, created_at, updated_at, language
) values (
  gen_random_uuid(),
  'ランキング更新: シーズンポイント固定配点・投票率タイブレーク導入',
  'シーズンポイントは固定配点（勝+16/負+4/引+8）。同点時は投票率などの指標で順位が決まります。',
  'https://qgqcjtjxaoplhxurbpis.supabase.co/storage/v1/object/public/news/1%20(2).png',
  null,
  'article',
  $$
# ランキング更新のお知らせ

いつも BeatNexus をご利用いただきありがとうございます。今回のアップデートでは、ランキング関連の仕様を以下の通り改善しました。

## 主な変更点
- シーズンポイントの固定配点化（勝+16 / 負+4 / 引+8）
  - 最低値は 1100（これ未満には下がりません）
  - レーティング（Elo）は従来通りで、対戦相手との実力差に応じて変動します（マッチング/結果反映時）
- タイブレークの導入（同点時の順位決定）
  1) 投票率（weighted_vote_share）
  2) 得失票率の累積（sum_margin_ratio）
  3) 試合数（battles_played）
  4) 最終試合日時（last_battle_at）
  5) user_id（安定化）
- UI: ランキング行に投票率（xx.x%）を表示（多言語対応）
- 参加者限定: シーズン中にバトル参加のないユーザーはシーズンランキングに表示されません

## よくある質問
- Q. レーティング計算は変わりましたか？
  - A. いいえ。レーティング（Elo）は従来通りです。今回変わったのは「シーズンポイント」の配点方式のみです。

本変更は開発/本番環境に適用済みです。引き続き BeatNexus をお楽しみください。
$$,
  'シーズンポイントを固定配点化し、同点は投票率などで順位が決まるようになりました。',
  ARRAY['ranking','season','update'],
  false,
  true,
  50,
  now(),
  now(),
  now(),
  'ja'
), (
  gen_random_uuid(),
  'Ranking Update: Fixed Season Points & Vote-Share Tiebreakers',
  'Season points are now fixed (+16 Win / +4 Loss / +8 Draw). When tied, rankings are decided by vote-based metrics.',
  'https://qgqcjtjxaoplhxurbpis.supabase.co/storage/v1/object/public/news/1%20(2).png',
  null,
  'article',
  $$
# Ranking Update

We''ve improved the ranking system with the following changes:

## Highlights
- Fixed season points: Win +16 / Loss +4 / Draw +8
  - Floor at 1100 (won''t go below)
  - Elo rating remains unchanged and still varies by opponent strength (matching/results)
- Tiebreakers when season points are equal:
  1) Vote share (weighted_vote_share)
  2) Sum of margin ratio (sum_margin_ratio)
  3) Battles played
  4) Last battle time
  5) user_id (stability)
- UI: Vote share (xx.x%) is now shown in ranking rows (i18n)
- Participants only: Users without season battles won''t appear in season rankings

These updates are live in both dev and production. Enjoy BeatNexus!
$$,
  'Season points are now fixed, and ties are broken by vote share and other metrics.',
  ARRAY['ranking','season','update'],
  false,
  true,
  50,
  now(),
  now(),
  now(),
  'en'
);
