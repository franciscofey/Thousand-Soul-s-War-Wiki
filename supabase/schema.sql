create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text not null default '',
  role text not null default 'user' check (role in ('user', 'admin', 'main-admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  race text not null check (race in ('Shinigami', 'Quincy', 'Arrancar')),
  affiliation text not null default '',
  ability text not null default '',
  image text not null default '',
  notes text not null default '',
  overview text not null default '',
  history text not null default '',
  equipment text not null default '',
  abilities text not null default '',
  zanpakuto_name text not null default '',
  activation_command text not null default '',
  shikai text not null default '',
  bankai text not null default '',
  attack integer not null default 0,
  defense integer not null default 0,
  speed integer not null default 0,
  health integer not null default 0,
  reiatsu integer not null default 0,
  updated_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_editor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'main-admin')
$$;

create or replace function public.is_main_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() = 'main-admin'
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
    and current_user <> 'service_role'
    and not public.is_main_admin()
  then
    raise exception 'Only the main admin can change roles';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists characters_touch_updated_at on public.characters;
create trigger characters_touch_updated_at
before update on public.characters
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.characters enable row level security;

drop policy if exists "Anyone can read characters" on public.characters;
create policy "Anyone can read characters"
on public.characters for select
using (true);

drop policy if exists "Editors can create characters" on public.characters;
create policy "Editors can create characters"
on public.characters for insert
with check (public.is_editor());

drop policy if exists "Editors can update characters" on public.characters;
create policy "Editors can update characters"
on public.characters for update
using (public.is_editor())
with check (public.is_editor());

drop policy if exists "Editors can delete characters" on public.characters;
create policy "Editors can delete characters"
on public.characters for delete
using (public.is_editor());

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (id = auth.uid() or public.is_main_admin());

drop policy if exists "Users can update own username" on public.profiles;
create policy "Users can update own username"
on public.profiles for update
using (id = auth.uid() or public.is_main_admin())
with check (id = auth.uid() or public.is_main_admin());

drop policy if exists "Main admin can create profiles" on public.profiles;
create policy "Main admin can create profiles"
on public.profiles for insert
with check (public.is_main_admin());

insert into public.characters (
  name, race, affiliation, ability, image, notes, overview, history, equipment, abilities,
  zanpakuto_name, activation_command, shikai, bankai, attack, defense, speed, health, reiatsu, updated_by_name
) values
(
  'Uryu Ishida', 'Quincy', 'Quincy', 'Heilig Pfeil precision and spiritual archery', 'assets/uryu-reference.png',
  'Child | 2001 | 2003',
  'A precise Quincy archer with disciplined spiritual control and a calm tactical style.',
  'Raised within the Quincy tradition, Uryu keeps detailed records of his training, rivalries, and wartime decisions.',
  'Quincy bow, spiritual arrows, Seele Schneider, and utility items for ranged engagements.',
  'Expert marksmanship, Hirenkyaku movement, spiritual thread perception, and high reiatsu control.',
  '', '', '', '', 82, 68, 76, 64, 88, 'Sistema'
),
(
  'Kaien Shiba', 'Shinigami', 'Shinigami', '', '',
  'Lieutenant archive profile',
  'A loyal Shinigami officer known for balanced combat instincts and strong command presence.',
  'Served as a lieutenant in the Gotei 13 and left a record of mentorship, duty, and sacrifice.',
  'Standard Shinigami robes, zanpakuto, and division field gear.',
  'Zanjutsu, Hoho, spiritual pressure control, and water-based release techniques.',
  'Nejibana', 'Rankle the seas and skies',
  'Nejibana changes shape and channels water into piercing and sweeping attacks.',
  'Unknown or unrecorded.', 72, 70, 74, 78, 80, 'Sistema'
),
(
  'Nelliel Tu Odelschwanck', 'Arrancar', 'Arrancar', '', '',
  'Former Espada profile',
  'A powerful Arrancar with a composed temperament and tremendous spiritual pressure.',
  'Former Espada records describe a warrior displaced by betrayal and later defined by restraint.',
  'Arrancar uniform, broken mask remains, and resurreccion weaponry.',
  'Cero Doble, high-speed combat, lance techniques, Hierro, and overwhelming reiatsu.',
  'Gamuza', 'Declare',
  'Arrancar do not use Shikai; this field can describe Resurreccion notes if desired.',
  'Arrancar do not use Bankai; this field can hold Segunda Etapa or advanced release notes.',
  88, 83, 78, 86, 90, 'Sistema'
);

-- After creating the three Auth users in Supabase, run this once:
-- update public.profiles set role = 'admin', username = 'GM Quincy' where email = 'gm@quincy.com';
-- update public.profiles set role = 'admin', username = 'Elses' where email = 'elses@quincy.com';
-- update public.profiles set role = 'main-admin', username = 'Sigma' where email = 'sigma@quincy.com';
