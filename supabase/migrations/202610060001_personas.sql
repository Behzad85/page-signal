begin;

create function public.persona_list_valid(items text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(array_ndims(items) = 1 and cardinality(items) between 1 and 8
    and not exists (select 1 from unnest(items) item where item is null or char_length(btrim(item)) not between 1 and 240), false);
$$;

create table public.personas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  goals text[] not null check (public.persona_list_valid(goals)),
  blockers text[] not null check (public.persona_list_valid(blockers)),
  audit_focus text not null check (char_length(btrim(audit_focus)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index personas_owner_updated_idx on public.personas(owner_id, updated_at desc, id);
alter table public.personas enable row level security;
alter table public.personas force row level security;
revoke all on public.personas from public, anon, authenticated;
grant select, delete on public.personas to authenticated;
grant insert (owner_id, name, description, goals, blockers, audit_focus) on public.personas to authenticated;
grant update (name, description, goals, blockers, audit_focus) on public.personas to authenticated;
create policy personas_select_own on public.personas for select to authenticated using (owner_id = (select auth.uid()));
create policy personas_insert_own on public.personas for insert to authenticated with check (owner_id = (select auth.uid()));
create policy personas_update_own on public.personas for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy personas_delete_own on public.personas for delete to authenticated using (owner_id = (select auth.uid()));

create function public.guard_persona_write() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.owner_id is distinct from auth.uid() then
    raise exception 'Persona access denied' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));
    if (select count(*) from public.personas where owner_id = new.owner_id) >= 50 then
      raise exception 'Persona limit reached' using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger personas_before_write before insert or update on public.personas for each row execute function public.guard_persona_write();
revoke all on function public.guard_persona_write() from public;
revoke all on function public.persona_list_valid(text[]) from public;
grant execute on function public.persona_list_valid(text[]) to authenticated;
commit;
