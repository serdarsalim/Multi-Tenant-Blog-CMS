-- Old post addresses keep working after a slug change: /posts/<old_slug>
-- redirects to the post's current slug. Run once in the Supabase SQL editor
-- (the service key cannot run DDL through PostgREST).
create table if not exists public.post_slug_redirects (
  old_slug text primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Server-side only (service role); no public policies.
alter table public.post_slug_redirects enable row level security;

-- "My Favorite Istanbul Mosques" first went out as about-common-sense-3f10d2b7.
insert into public.post_slug_redirects (old_slug, post_id)
select 'about-common-sense-3f10d2b7', id from public.posts where slug = 'my-favorite-istanbul-mosques'
on conflict (old_slug) do nothing;
