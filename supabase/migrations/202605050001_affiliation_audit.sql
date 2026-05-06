alter table public.characters
add column if not exists updated_by_name text not null default '';

alter table public.characters
add column if not exists wins integer not null default 0;

alter table public.characters
add column if not exists losses integer not null default 0;

update public.characters
set affiliation = race
where affiliation not in ('Quincy', 'Shinigami', 'Arrancar', 'NPC')
  and race in ('Quincy', 'Shinigami', 'Arrancar');

update public.characters
set affiliation = 'NPC'
where affiliation not in ('Quincy', 'Shinigami', 'Arrancar', 'NPC');

update public.characters
set ability = ''
where race in ('Shinigami', 'Arrancar');

update public.characters
set ability = jsonb_build_object('name', ability, 'description', '')::text
where race = 'Quincy'
  and ability <> ''
  and left(trim(ability), 1) <> '{';
