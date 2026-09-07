-- =====================================================================
-- 0000_baseline.sql — faithful snapshot of the live Supabase schema
-- as captured on 2026-09-07 from project wslfqrsemrllotjlpahc.
--
-- This is DOCUMENTATION, not a change. Everything here is ALREADY
-- applied to production; the file is written to be a safe no-op so the
-- repo finally has a source of truth for the schema. Fixes and new
-- features go in later, numbered migrations — never by editing this one.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------- tables
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text default 'customer'
             constraint profiles_role_check
             check (role = any (array['customer','manager','admin'])),
  created_at timestamptz default now()
);

create table if not exists public.categories (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id           uuid primary key default uuid_generate_v4(),
  category_id  uuid references public.categories(id) on delete set null,
  name         text not null,
  description  text,
  price        numeric not null,
  image_url    text,
  stock_count  integer default 0,
  is_available boolean default true,
  created_at   timestamptz default now()
);

-- NOTE: customer_id is NULLABLE while customer_name / customer_phone /
-- delivery_address are NOT NULL — guest checkout is supported by design,
-- and delivery details are mandatory on every order.
create table if not exists public.orders (
  id               uuid primary key default uuid_generate_v4(),
  customer_id      uuid references public.profiles(id) on delete set null,
  customer_name    text not null,
  customer_phone   text not null,
  delivery_address text not null,
  items            jsonb not null,
  total_price      numeric not null,
  status           text default 'pending'
                   constraint orders_status_check
                   check (status = any (array['pending','accepted','preparing',
                                              'delivering','completed','rejected'])),
  created_at       timestamptz default now()
);

create table if not exists public.site_content (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

-- ------------------------------------------------------- profile creation
-- SECURITY DEFINER so it can write public.profiles despite RLS.
-- KNOWN GAPS (addressed in a later migration, left as-is here to stay
-- faithful to production): no ON CONFLICT guard, and no pinned search_path.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer');
  return new;
end;
$$;

-- Guarded rather than dropped/recreated, so running this file against the
-- live database never leaves even a momentary window with no trigger.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
      and not tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- ------------------------------------------------------------------- RLS
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.products     enable row level security;
alter table public.orders       enable row level security;
alter table public.site_content enable row level security;

-- Policies are created only when absent, so this file stays a no-op.
-- IMPORTANT: these are SELECT-only. There is deliberately NO insert,
-- update or delete policy on any table yet, which is why ordering and
-- all admin writes are currently impossible through PostgREST.
do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='public' and tablename='categories'
                   and policyname='Public Read Categories') then
    create policy "Public Read Categories" on public.categories
      for select using (true);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='public' and tablename='products'
                   and policyname='Public Read Products') then
    create policy "Public Read Products" on public.products
      for select using (true);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='public' and tablename='site_content'
                   and policyname='Public Read Content') then
    create policy "Public Read Content" on public.site_content
      for select using (true);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='public' and tablename='profiles'
                   and policyname='Allow individual read access') then
    create policy "Allow individual read access" on public.profiles
      for select using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='public' and tablename='orders'
                   and policyname='View Orders') then
    create policy "View Orders" on public.orders
      for select using (
        auth.uid() = customer_id
        or exists (select 1 from public.profiles
                   where profiles.id = auth.uid()
                     and profiles.role = any (array['admin','manager']))
      );
  end if;
end $$;

-- --------------------------------------------------------------- storage
-- Bucket product-images: public=true, no size limit, no MIME restriction.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Storage policies exactly as they exist in production.
-- ⚠ "Admin Delete Access" is MISSING its admin check — any authenticated
--   user can delete every product image. Fixed in a later migration;
--   reproduced verbatim here so the baseline matches reality.
-- ⚠ There is no UPDATE policy, so overwriting an existing object (upsert)
--   fails even for an admin.
do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='storage' and policyname='Public Access') then
    create policy "Public Access" on storage.objects
      for select using (bucket_id = 'product-images');
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and policyname='Admin Upload Access') then
    create policy "Admin Upload Access" on storage.objects
      for insert with check (
        bucket_id = 'product-images'
        and auth.role() = 'authenticated'
        and exists (select 1 from public.profiles
                    where id = auth.uid() and role = 'admin')
      );
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and policyname='Admin Delete Access') then
    create policy "Admin Delete Access" on storage.objects
      for delete using (
        bucket_id = 'product-images' and auth.role() = 'authenticated'
      );
  end if;
end $$;
