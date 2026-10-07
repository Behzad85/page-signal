-- Run only in an isolated disposable test database with the migration applied.
begin;
insert into auth.users(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
insert into public.personas(name, description, goals, blockers, audit_focus) values ('Owner A', 'Test profile', array['Read'], array['Jargon'], 'Clarity');
do $$ begin
  if (select count(*) from public.personas) <> 1 then raise exception 'Owner cannot read own persona'; end if;
  begin
    insert into public.personas(owner_id,name,description,goals,blockers,audit_focus) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Forged','Test',array['Read'],array['Jargon'],'Clarity');
    raise exception 'Forged owner accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.personas set owner_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    raise exception 'Ownership transfer accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.personas(name,description,goals,blockers,audit_focus) values ('Bad','Test',array[]::text[],array['Jargon'],'Clarity');
    raise exception 'Empty goals accepted';
  exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
do $$ begin
  if exists(select 1 from public.personas) then raise exception 'Cross-owner read'; end if;
  update public.personas set name='Cross-owner edit';
  if found then raise exception 'Cross-owner update'; end if;
  delete from public.personas;
  if found then raise exception 'Cross-owner delete'; end if;
end $$;
insert into public.personas(name,description,goals,blockers,audit_focus) values ('Owner B','Test',array['Read'],array['Jargon'],'Clarity');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
update public.personas set name='Updated A';
do $$ begin
  if not exists(select 1 from public.personas where name='Updated A') then raise exception 'Own update failed'; end if;
end $$;
insert into public.personas(name,description,goals,blockers,audit_focus) select 'Quota '||n,'Test',array['Read'],array['Jargon'],'Clarity' from generate_series(1,49) n;
do $$ begin
  begin
    insert into public.personas(name,description,goals,blockers,audit_focus) values ('Over quota','Test',array['Read'],array['Jargon'],'Clarity');
    raise exception 'Quota bypass';
  exception when check_violation then null; end;
end $$;
delete from public.personas;
do $$ begin
  if exists(select 1 from public.personas) then raise exception 'Own delete failed'; end if;
end $$;
set local role anon;
do $$ begin
  begin perform 1 from public.personas; raise exception 'Anonymous access accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.personas) <> 1 then raise exception 'Other owner data changed'; end if;
end $$;
rollback;
select 'PASS: owner CRUD, cross-owner isolation, anonymous denial, ownership immutability, validation and quota' as result;
