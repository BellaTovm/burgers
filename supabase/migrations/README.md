# Supabase migrations

The Supabase project is the source of truth for all application data. These
files exist so the schema is reviewable in version control — the repo had no
record of it before.

There is no Supabase CLI wired up yet, so migrations are applied by hand:
open the Supabase dashboard → SQL Editor → paste the file → Run. Apply them
in filename order and never edit a file that has already been run; add a new
numbered one instead.

| File | Purpose |
|------|---------|
| `0000_baseline.sql` | Snapshot of the schema as it existed on 2026-09-07. Already applied in production — written as a safe no-op. |

`0000_baseline.sql` deliberately reproduces two known defects rather than
fixing them, so that it matches production exactly:

- `storage.objects` "Admin Delete Access" is missing its admin check, so any
  authenticated user can delete every product image.
- `public.handle_new_user()` has no `ON CONFLICT` guard and no pinned
  `search_path`.

Both are fixed in later migrations.
