-- ensure pgcrypto for gen_random_uuid (ads MVP prerequisite)
begin;
create extension if not exists pgcrypto;
commit;
