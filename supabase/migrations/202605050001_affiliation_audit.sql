alter table public.characters
add column if not exists updated_by_name text not null default '';

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
