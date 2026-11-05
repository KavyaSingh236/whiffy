-- Run once in YOUR Supabase project's SQL Editor. No secret keys belong in the app.
create table if not exists public.whiffy_memories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint whiffy_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint whiffy_payload_size check (octet_length(payload::text) <= 100000),
  constraint whiffy_memory_text check (payload ? 'memory' and jsonb_typeof(payload->'memory') = 'string' and char_length(payload->>'memory') between 10 and 4000),
  constraint whiffy_payload_id check (payload ? 'id' and payload->>'id' = id::text)
);
create index if not exists whiffy_memories_owner_recent on public.whiffy_memories (user_id, updated_at desc);
alter table public.whiffy_memories enable row level security;
revoke all on public.whiffy_memories from anon;
revoke all on public.whiffy_memories from authenticated;
grant select, insert, update, delete on public.whiffy_memories to authenticated;

drop policy if exists whiffy_read_own on public.whiffy_memories;
create policy whiffy_read_own on public.whiffy_memories for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists whiffy_create_own on public.whiffy_memories;
create policy whiffy_create_own on public.whiffy_memories for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists whiffy_update_own on public.whiffy_memories;
create policy whiffy_update_own on public.whiffy_memories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists whiffy_delete_own on public.whiffy_memories;
create policy whiffy_delete_own on public.whiffy_memories for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.whiffy_touch_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists whiffy_update_timestamp on public.whiffy_memories;
create trigger whiffy_update_timestamp before update on public.whiffy_memories for each row execute function public.whiffy_touch_updated_at();
