-- リモートデータベース用のテストデータ挿入SQL
-- Supabase SQL Editorで実行

-- Step 1: プロフィールを挿入（levelカラム追加）
INSERT INTO public.profiles (id, username, avatar_url, email, level) VALUES 
('11111111-1111-1111-1111-111111111111', 'BeatMaster_A', 'https://i.pravatar.cc/150?img=1', 'test1@example.com', 5),
('22222222-2222-2222-2222-222222222222', 'RhythmKing_B', 'https://i.pravatar.cc/150?img=2', 'test2@example.com', 8),
('33333333-3333-3333-3333-333333333333', 'BassDropper_C', 'https://i.pravatar.cc/150?img=3', 'test3@example.com', 3),
('44444444-4444-4444-4444-444444444444', 'LoopLegend_D', 'https://i.pravatar.cc/150?img=4', 'test4@example.com', 7)
ON CONFLICT (id) DO NOTHING;

-- Step 2: サブミッションを挿入
INSERT INTO public.submissions (id, user_id, title, video_url, battle_format, status) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Epic Beatbox Session A', 'https://sample-videos.com/zip/10/mp4/SampleVideo_360x240_1mb.mp4', 'MAIN_BATTLE', 'APPROVED'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Amazing Rhythm B', 'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4', 'MAIN_BATTLE', 'APPROVED'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Bass Challenge C', 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4', 'MINI_BATTLE', 'APPROVED'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'Loop Master D', 'https://sample-videos.com/zip/10/mp4/SampleVideo_480x360_1mb.mp4', 'MINI_BATTLE', 'APPROVED')
ON CONFLICT (id) DO NOTHING;

-- Step 3: アクティブバトルを挿入
INSERT INTO public.active_battles (id, player1_submission_id, player2_submission_id, battle_format, status, votes_a, votes_b, end_voting_at) VALUES 
('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MAIN_BATTLE', 'ACTIVE', 5, 3, NOW() + INTERVAL '3 hours'),
('88888888-8888-8888-8888-888888888888', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'MINI_BATTLE', 'ACTIVE', 2, 7, NOW() + INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Step 4: 投票を挿入
INSERT INTO public.battle_votes (battle_id, user_id, vote) VALUES 
('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', 'A'),
('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'B'),
('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'B'),
('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'A')
ON CONFLICT (battle_id, user_id) DO NOTHING;

-- 確認クエリ
SELECT 'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'submissions' as table_name, COUNT(*) as count FROM public.submissions
UNION ALL
SELECT 'active_battles' as table_name, COUNT(*) as count FROM public.active_battles
UNION ALL
SELECT 'battle_votes' as table_name, COUNT(*) as count FROM public.battle_votes; 