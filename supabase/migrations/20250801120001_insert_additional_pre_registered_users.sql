-- Insert additional pre-registered users for early access beta testing
-- Migration: 20250801120001_insert_additional_pre_registered_users
-- Date: 2025-08-01
-- Purpose: Add 44 new email addresses to the pre_registered_users table

INSERT INTO public.pre_registered_users (email) VALUES 
  ('runesurucurephiaings@gmail.com'),
  ('damenmingguwu@gmail.com'),
  ('maajo222@gmail.com'),
  ('uwanoata8@gmail.com'),
  ('fjitajin@yahoo.co.jp'),
  ('yuito040309@gmail.com'),
  ('iwayoshi0801@gmail.com'),
  ('aru2004g2@gmail.com'),
  ('myojin0829@gmail.com'),
  ('upedyoucheng@icloud.com'),
  ('kenta.suga0113@gmail.com'),
  ('tomo.ue.yks@gmail.com'),
  ('sa1proto0707@gmail.com'),
  ('senafever0423@gmail.com'),
  ('msk1845@icloud.com'),
  ('amam50409@gmail.com'),
  ('yuki20010315@gmail.com'),
  ('s0u084000@gmail.com'),
  ('tai.sdbh1201@gmail.com'),
  ('4lterego422@gmail.com'),
  ('ag25110@shibaura-it.ac.jp'),
  ('itsutaka311@gmail.com'),
  ('tikyugi.mt@gmail.com'),
  ('tleebeatboxer232@gmail.com'),
  ('ilibeinfukuoka@gmail.com'),
  ('rainykaxi@gmail.com'),
  ('7tktk4@gmail.com'),
  ('shion11.05.314@gmail.com'),
  ('ilibeinfukuoa@gmail.com'),
  ('munisepo0728@gmail.com'),
  ('haru07030890@icloud.com'),
  ('1amdyin9@gmail.com'),
  ('zhenshilichuan@gmail.com'),
  ('yyyttt.nee.777@gmail.com'),
  ('tarikihongandamashii@gmail.com'),
  ('888exas@gmail.com'),
  ('tabasco115115@gmail.com'),
  ('tsubasa.i.0419@gmail.com'),
  ('aimabu.seien@gmail.com'),
  ('hiwao0915@gmail.com'),
  ('slope.sakamoto@gmail.com'),
  ('ryu.st.1251@gmail.com'),
  ('pesalmon5@gmail.com')
ON CONFLICT (email) DO NOTHING; -- 重複を防ぐため

-- 挿入結果の確認
DO $$
DECLARE
    inserted_count integer;
BEGIN
    -- 挿入されたレコード数を確認
    SELECT COUNT(*) INTO inserted_count 
    FROM public.pre_registered_users 
    WHERE email IN (
        'runesurucurephiaings@gmail.com',
        'damenmingguwu@gmail.com',
        'maajo222@gmail.com',
        'uwanoata8@gmail.com',
        'fjitajin@yahoo.co.jp',
        'yuito040309@gmail.com',
        'iwayoshi0801@gmail.com',
        'aru2004g2@gmail.com',
        'myojin0829@gmail.com',
        'upedyoucheng@icloud.com',
        'kenta.suga0113@gmail.com',
        'tomo.ue.yks@gmail.com',
        'sa1proto0707@gmail.com',
        'senafever0423@gmail.com',
        'msk1845@icloud.com',
        'amam50409@gmail.com',
        'yuki20010315@gmail.com',
        's0u084000@gmail.com',
        'tai.sdbh1201@gmail.com',
        '4lterego422@gmail.com',
        'ag25110@shibaura-it.ac.jp',
        'itsutaka311@gmail.com',
        'tikyugi.mt@gmail.com',
        'tleebeatboxer232@gmail.com',
        'ilibeinfukuoka@gmail.com',
        'rainykaxi@gmail.com',
        '7tktk4@gmail.com',
        'shion11.05.314@gmail.com',
        'ilibeinfukuoa@gmail.com',
        'munisepo0728@gmail.com',
        'haru07030890@icloud.com',
        '1amdyin9@gmail.com',
        'zhenshilichuan@gmail.com',
        'yyyttt.nee.777@gmail.com',
        'tarikihongandamashii@gmail.com',
        '888exas@gmail.com',
        'tabasco115115@gmail.com',
        'tsubasa.i.0419@gmail.com',
        'aimabu.seien@gmail.com',
        'hiwao0915@gmail.com',
        'slope.sakamoto@gmail.com',
        'ryu.st.1251@gmail.com',
        'pesalmon5@gmail.com'
    );
    
    RAISE NOTICE 'Successfully processed % email addresses for pre-registration', inserted_count;
END $$;
