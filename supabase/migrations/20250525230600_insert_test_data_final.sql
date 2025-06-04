/*
  # Insert test data for development (final version)
  
  This creates test auth users and profiles for development.
  This should be removed in production.
*/

-- Step 1: auth.usersにテストユーザーを作成
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'test1@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"username": "BeatMaster_A"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222222222',
  'test2@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"username": "RhythmKing_B"}'::jsonb
),
(
  '33333333-3333-3333-3333-333333333333',
  'test3@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"username": "BassDropper_C"}'::jsonb
),
(
  '44444444-4444-4444-4444-444444444444',
  'test4@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"username": "LoopLegend_D"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: プロフィールを挿入（トリガーが自動作成するが、levelを更新）
UPDATE public.profiles SET 
  avatar_url = CASE id
    WHEN '11111111-1111-1111-1111-111111111111' THEN 'https://i.pravatar.cc/150?img=1'
    WHEN '22222222-2222-2222-2222-222222222222' THEN 'https://i.pravatar.cc/150?img=2'
    WHEN '33333333-3333-3333-3333-333333333333' THEN 'https://i.pravatar.cc/150?img=3'
    WHEN '44444444-4444-4444-4444-444444444444' THEN 'https://i.pravatar.cc/150?img=4'
  END,
  level = CASE id
    WHEN '11111111-1111-1111-1111-111111111111' THEN 5
    WHEN '22222222-2222-2222-2222-222222222222' THEN 8
    WHEN '33333333-3333-3333-3333-333333333333' THEN 3
    WHEN '44444444-4444-4444-4444-444444444444' THEN 7
  END,
  username = CASE id
    WHEN '11111111-1111-1111-1111-111111111111' THEN 'BeatMaster_A'
    WHEN '22222222-2222-2222-2222-222222222222' THEN 'RhythmKing_B'
    WHEN '33333333-3333-3333-3333-333333333333' THEN 'BassDropper_C'
    WHEN '44444444-4444-4444-4444-444444444444' THEN 'LoopLegend_D'
  END
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);

-- Step 3: サブミッションを挿入
INSERT INTO public.submissions (id, user_id, video_url, battle_format, status) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'https://sample-videos.com/zip/10/mp4/SampleVideo_360x240_1mb.mp4', 'MAIN_BATTLE', 'MATCHED_IN_BATTLE'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4', 'MAIN_BATTLE', 'MATCHED_IN_BATTLE'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4', 'MINI_BATTLE', 'MATCHED_IN_BATTLE'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'https://sample-videos.com/zip/10/mp4/SampleVideo_480x360_1mb.mp4', 'MINI_BATTLE', 'MATCHED_IN_BATTLE')
ON CONFLICT (id) DO NOTHING;

-- Step 4: アクティブバトルを挿入（修正されたテーブル構造に合わせる）
INSERT INTO public.active_battles (id, player1_submission_id, player1_user_id, player2_submission_id, player2_user_id, battle_format, status, votes_a, votes_b, end_voting_at) VALUES 
('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'MAIN_BATTLE', 'ACTIVE', 5, 3, NOW() + INTERVAL '3 hours'),
('88888888-8888-8888-8888-888888888888', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'MINI_BATTLE', 'ACTIVE', 2, 7, NOW() + INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Step 5: 投票を挿入
INSERT INTO public.battle_votes (battle_id, user_id, vote) VALUES 
('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', 'A'),
('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'B'),
('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'B'),
('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'A')
ON CONFLICT (battle_id, user_id) DO NOTHING; 