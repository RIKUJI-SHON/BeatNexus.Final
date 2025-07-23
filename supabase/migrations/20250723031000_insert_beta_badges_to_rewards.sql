-- Insert beta season data into rewards table (corrected for actual table structure)
-- Insert The Founder's Crest badge for beta testers
INSERT INTO public.rewards (
    name,
    description,
    type,
    image_url,
    season_id,
    rank_requirement,
    min_battles,
    is_limited,
    is_active
) VALUES (
    'The Founder''s Crest',
    'BeatNexusのβテストに参加した創設メンバーに贈られる特別なバッジ。サービスの初期から支えてくれた証として永続的に表示される。まだ誰も足を踏み入れたことのない、混沌と熱狂に満ちた黎明期を共に駆け抜けた仲間の証。',
    'badge',
    'https://wdttluticnlqzmqmfvgt.supabase.co/storage/v1/object/public/badge//Beta%20season%20TOP8.png',
    NULL,  -- 永続的な報酬なのでseason_idはNULL
    NULL,  -- 全員が対象（βテスト参加者全員）
    0,     -- 最低バトル数は0
    true,  -- 限定バッジ
    true   -- アクティブ
),
(
    'β Top 8',
    'β Season 0において、プレイヤーランキングTOP8に入賞した者に贈られる名誉の証。BeatNexusの歴史に最初の1ページを刻んだプレイヤーの証明。',
    'badge',
    'https://wdttluticnlqzmqmfvgt.supabase.co/storage/v1/object/public/badge//Beta%20season%20TOP8.png',
    NULL,  -- βシーズンは特別扱いなのでNULL
    8,     -- TOP8入賞者
    5,     -- 最低5バトル必要
    true,  -- 限定バッジ
    true   -- アクティブ
),
(
    'β Champion',
    'β Season 0のプレイヤーランキング1位獲得者に贈られる最高の栄誉。BeatNexusの最初の王者として、その名は永遠に刻まれる。',
    'badge',
    'https://wdttluticnlqzmqmfvgt.supabase.co/storage/v1/object/public/badge//Beta%20season%20TOP8.png',
    NULL,  -- βシーズンは特別扱いなのでNULL
    1,     -- 1位のみ
    5,     -- 最低5バトル必要
    true,  -- 限定バッジ
    true   -- アクティブ
),
(
    'β Judge',
    'β Season 0において、投票者ランキングTOP20に入賞した者に贈られるバッジ。コミュニティへの貢献と優れた審美眼の証明。',
    'badge',
    'https://wdttluticnlqzmqmfvgt.supabase.co/storage/v1/object/public/badge//Beta%20season%20TOP8.png',
    NULL,  -- βシーズンは特別扱いなのでNULL
    20,    -- TOP20（投票者ランキング用）
    0,     -- バトル数の制限なし
    true,  -- 限定バッジ
    true   -- アクティブ
);
