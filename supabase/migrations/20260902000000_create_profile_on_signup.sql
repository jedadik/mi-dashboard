-- Create a trial profile automatically for every new Auth user.
-- This keeps account creation independent from email confirmation and client state.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  subscription_status text not null default 'trial',
  plan_type text,
  subscription_end_date timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, subscription_status, created_at)
  values (new.id, new.email, 'trial', coalesce(new.created_at, now()))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill users created before this migration.
insert into public.profiles (id, email, subscription_status, created_at)
select id, email, 'trial', coalesce(created_at, now())
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = auth.users.id
);
