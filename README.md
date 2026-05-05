# Thousand Soul's War Wiki

A local roleplay wiki for Shinigami, Quincy, and Arrancar character files.

Open `index.html` in a browser to use it.

Seeded accounts:

- `gm@quincy.com` / `gmquincy`
- `elses@quincy.com` / `elsesquincy`
- `sigma@quincy.com` / `sigmaquincy`

Only `sigma@quincy.com` can access the Admin page and manage accounts. Admin editor accounts can create, update, and delete character files.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run `supabase/schema.sql`.
3. In Supabase Authentication, create these users:
   - `gm@quincy.com` / `gmquincy`
   - `elses@quincy.com` / `elsesquincy`
   - `sigma@quincy.com` / `sigmaquincy`
4. Run the three role update statements at the bottom of `supabase/schema.sql`.
5. Copy your Project URL and anon public key into `supabase-config.js`.
6. Optional: deploy the Edge Functions in `supabase/functions` if you want Sigma to create/delete users from the Admin page:

```bash
supabase functions deploy create-user
supabase functions deploy delete-user
```

Character data is stored in the Supabase `characters` table, so everyone visiting the GitHub Pages site sees the same information.

The anon public key is safe to use in GitHub Pages. Never put the Supabase `service_role` key in `supabase-config.js` or any browser file.
