-- Align Production SuperTip-related schema to Development
-- Safe, stepwise migration with backfills and value normalization
-- Note: Run on production with a recent backup. Tested assumptions based on env inventories.

begin;

-- 1) SUPER_TIPS: add new columns first
alter table if exists public.super_tips
  add column if not exists active_battle_id uuid,
  add column if not exists archived_battle_id uuid,
  add column if not exists voter_user_id uuid,
  add column if not exists supported_player_user_id uuid,
  add column if not exists amount_jpy integer,
  add column if not exists payment_status text,
  add column if not exists stripe_account_id text,
  add column if not exists metadata jsonb default '{}'::jsonb;

-- 1.1) backfill simple mappings
update public.super_tips st
set active_battle_id = coalesce(st.active_battle_id, st.battle_id),
    amount_jpy = coalesce(st.amount_jpy, st.amount),
    payment_status = case
      when st.status = 'completed' then 'succeeded'
      when st.status = 'cancelled' then 'canceled'
      else st.status
    end,
    voter_user_id = coalesce(st.voter_user_id, st.sender_id),
    supported_player_user_id = coalesce(st.supported_player_user_id, st.recipient_id)
where true;

-- 1.2) stripe_account_id backfill from profiles of recipient
update public.super_tips st
set stripe_account_id = p.stripe_account_id
from public.profiles p
where st.supported_player_user_id = p.id
  and (st.stripe_account_id is null or st.stripe_account_id = '');

-- 1.3) normalize status values to allowed set
update public.super_tips st
set payment_status = case
  when payment_status in ('pending','processing','succeeded','failed','canceled') then payment_status
  when payment_status = 'completed' then 'succeeded'
  when payment_status = 'cancelled' then 'canceled'
  else 'pending'
end
where payment_status is not null;

-- 1.4) constraints and FKs (drop old ones carefully; add new ones)
-- remove existing check/constraints that may conflict
do $$ begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'super_tips' and c.conname = 'super_tips_status_check'
  ) then
    alter table public.super_tips drop constraint super_tips_status_check;
  end if;
exception when others then null; end $$;

-- set NOT NULL where applicable (defer strictness: stripe_account_id not null later after fill)
alter table public.super_tips
  alter column active_battle_id drop not null,
  alter column archived_battle_id drop not null,
  alter column voter_user_id drop not null,
  alter column supported_player_user_id drop not null;

-- add FKs if not exist
do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'super_tips' and c.conname = 'super_tips_active_battle_id_fkey'
  ) then
    alter table public.super_tips
      add constraint super_tips_active_battle_id_fkey foreign key (active_battle_id) references public.active_battles(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'super_tips' and c.conname = 'super_tips_archived_battle_id_fkey'
  ) then
    alter table public.super_tips
      add constraint super_tips_archived_battle_id_fkey foreign key (archived_battle_id) references public.archived_battles(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'super_tips' and c.conname = 'super_tips_supported_player_user_id_fkey'
  ) then
    alter table public.super_tips
      add constraint super_tips_supported_player_user_id_fkey foreign key (supported_player_user_id) references public.profiles(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'super_tips' and c.conname = 'super_tips_voter_user_id_fkey'
  ) then
    alter table public.super_tips
      add constraint super_tips_voter_user_id_fkey foreign key (voter_user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- value checks
do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'super_tips' and c.conname = 'super_tips_amount_jpy_check'
  ) then
    alter table public.super_tips
      add constraint super_tips_amount_jpy_check check (amount_jpy is null or amount_jpy >= 100);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'super_tips' and c.conname = 'super_tips_payment_status_check'
  ) then
    alter table public.super_tips
      add constraint super_tips_payment_status_check check (payment_status in ('pending','processing','succeeded','failed','canceled'));
  end if;
end $$;

-- 1.5) drop legacy columns no longer used in dev schema (keep payment_intent unique)
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='battle_id') then
    alter table public.super_tips drop column battle_id;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='sender_id') then
    alter table public.super_tips drop column sender_id;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='recipient_id') then
    alter table public.super_tips drop column recipient_id;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='amount') then
    alter table public.super_tips drop column amount;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='status') then
    alter table public.super_tips drop column status;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='platform_fee') then
    alter table public.super_tips drop column platform_fee;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='recipient_amount') then
    alter table public.super_tips drop column recipient_amount;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='stripe_transfer_id') then
    alter table public.super_tips drop column stripe_transfer_id;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='vote') then
    alter table public.super_tips drop column vote;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='comment') then
    alter table public.super_tips drop column comment;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='super_tips' and column_name='completed_at') then
    alter table public.super_tips drop column completed_at;
  end if;
end $$;

-- 2) BATTLE_VOTES: normalize payment_status and super_tip_amount
-- 2.1) remove default 'none' if exists
do $$ begin
  perform 1 from information_schema.columns
   where table_schema='public' and table_name='battle_votes' and column_name='payment_status';
  -- try to drop default and allow nulls
  begin
    alter table public.battle_votes alter column payment_status drop default;
  exception when others then null; end;
  begin
    alter table public.battle_votes alter column payment_status drop not null;
  exception when others then null; end;
end $$;

-- 2.2) value normalization
update public.battle_votes
set payment_status = case
  when payment_status = 'completed' then 'succeeded'
  when payment_status = 'cancelled' then 'canceled'
  when payment_status = 'none' then null
  else payment_status
end
where payment_status is not null;

-- 2.3) check constraint for allowed values
do $$ begin
  if not exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='battle_votes' and c.conname='battle_votes_payment_status_check') then
    alter table public.battle_votes
      add constraint battle_votes_payment_status_check check (payment_status in ('pending','succeeded','failed','canceled') or payment_status is null);
  end if;
end $$;

-- 2.4) super_tip_amount: drop default 0, add check >=100 or null
do $$ begin
  begin
    alter table public.battle_votes alter column super_tip_amount drop default;
  exception when others then null; end;
  if not exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='battle_votes' and c.conname='battle_votes_super_tip_amount_check') then
    alter table public.battle_votes
      add constraint battle_votes_super_tip_amount_check check (super_tip_amount is null or super_tip_amount >= 100);
  end if;
end $$;

-- 3) ARCHIVED_BATTLE_VOTES: mirror battle_votes normalization + add has_super_tip
alter table if exists public.archived_battle_votes
  add column if not exists has_super_tip boolean default false;

do $$ begin
  begin
    alter table public.archived_battle_votes alter column payment_status drop default;
  exception when others then null; end;
  begin
    alter table public.archived_battle_votes alter column payment_status drop not null;
  exception when others then null; end;
end $$;

update public.archived_battle_votes
set payment_status = case
  when payment_status = 'completed' then 'succeeded'
  when payment_status = 'cancelled' then 'canceled'
  when payment_status = 'none' then null
  else payment_status
end;

do $$ begin
  if not exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='archived_battle_votes' and c.conname='archived_battle_votes_payment_status_check') then
    alter table public.archived_battle_votes
      add constraint archived_battle_votes_payment_status_check check (payment_status in ('pending','succeeded','failed','canceled') or payment_status is null);
  end if;
end $$;

do $$ begin
  begin
    alter table public.archived_battle_votes alter column super_tip_amount drop default;
  exception when others then null; end;
  if not exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='archived_battle_votes' and c.conname='archived_battle_votes_super_tip_amount_check') then
    alter table public.archived_battle_votes
      add constraint archived_battle_votes_super_tip_amount_check check (super_tip_amount is null or super_tip_amount >= 100);
  end if;
end $$;

-- 3.1) backfill has_super_tip
update public.archived_battle_votes set has_super_tip = coalesce(super_tip_amount,0) >= 100;

-- 4) super_tips strictness: make stripe_account_id not null if all filled
do $$
declare missing int;
begin
  select count(*) into missing from public.super_tips where stripe_account_id is null or stripe_account_id = '';
  if missing = 0 then
    begin
      alter table public.super_tips alter column stripe_account_id set not null;
    exception when others then null; end;
  end if;
end $$;

commit;
