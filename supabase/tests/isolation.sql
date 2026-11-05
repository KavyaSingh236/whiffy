-- Optional real-database security test. Run AFTER schema.sql in a test project's
-- SQL Editor. Everything, including the two fixture users, is rolled back.
begin;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','whiffy-test-a@example.invalid','',now(),now(),now(),'{}','{}'),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated','whiffy-test-b@example.invalid','',now(),now(),now(),'{}','{}');
insert into public.whiffy_memories (user_id,id,payload) values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","memory":"A private coffee memory."}'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","memory":"A private jasmine memory."}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
do $$
declare count_visible integer; changed integer;
begin
 select count(*) into count_visible from public.whiffy_memories;
 if count_visible <> 1 then raise exception 'Isolation failed: user A must see only one fixture row'; end if;
 begin
  insert into public.whiffy_memories (user_id,id,payload) values ('22222222-2222-4222-8222-222222222222','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","memory":"An unauthorized memory."}');
  raise exception 'Isolation failed: cross-user insertion succeeded';
 exception when insufficient_privilege then null;
 end;
 update public.whiffy_memories set payload=payload||'{"title":"should not change"}' where user_id='22222222-2222-4222-8222-222222222222';
 get diagnostics changed = row_count;
 if changed <> 0 then raise exception 'Isolation failed: cross-user update succeeded'; end if;
 delete from public.whiffy_memories where user_id='22222222-2222-4222-8222-222222222222';
 get diagnostics changed = row_count;
 if changed <> 0 then raise exception 'Isolation failed: cross-user deletion succeeded'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ declare count_visible integer; begin
 select count(*) into count_visible from public.whiffy_memories;
 if count_visible <> 1 then raise exception 'Isolation failed: user B must see only one fixture row'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin
  perform 1 from public.whiffy_memories;
  raise exception 'Isolation failed: anonymous read was allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
-- Success means no exceptions were raised. No fixture users or memories remain.
