
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROJECTS TABLE
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  workspace_id text default 'default',
  title text,
  author text,
  description text,
  genres text[],
  source_lang text,
  target_lang text,
  cover_image text,
  is_public boolean default false,
  settings jsonb default '{}'::jsonb,
  total_chapters integer default 0,
  translated_chapters integer default 0,
  views bigint default 0,
  rating numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. CHAPTERS TABLE
create table if not exists public.chapters (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  index integer not null,
  title_original text,
  title_translated text,
  content_raw text,
  content_translated text,
  summary text,
  status text default 'raw', -- raw, draft, translated, approved, published
  version integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. GLOSSARY TERMS
create table if not exists public.glossary_terms (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  term text not null,
  definition text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- INDEXES
create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_projects_public on public.projects(is_public);
create index if not exists idx_chapters_project on public.chapters(project_id);
create index if not exists idx_chapters_index on public.chapters(project_id, index);
create index if not exists idx_glossary_project on public.glossary_terms(project_id);

-- ROW LEVEL SECURITY (RLS)
alter table public.projects enable row level security;
alter table public.chapters enable row level security;
alter table public.glossary_terms enable row level security;

-- Policies for PROJECTS
drop policy if exists "Users can view their own projects or public ones" on public.projects;
create policy "Users can view their own projects or public ones"
on public.projects for select
using (auth.uid() = user_id or is_public = true);

drop policy if exists "Users can insert their own projects" on public.projects;
create policy "Users can insert their own projects"
on public.projects for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
on public.projects for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
on public.projects for delete
using (auth.uid() = user_id);

-- Policies for CHAPTERS
drop policy if exists "View chapters of visible projects" on public.chapters;
create policy "View chapters of visible projects"
on public.chapters for select
using (
  exists (
    select 1 from public.projects
    where projects.id = chapters.project_id
    and (projects.user_id = auth.uid() or projects.is_public = true)
  )
);

drop policy if exists "Manage chapters of own projects" on public.chapters;
create policy "Manage chapters of own projects"
on public.chapters for all
using (
  exists (
    select 1 from public.projects
    where projects.id = chapters.project_id
    and projects.user_id = auth.uid()
  )
);

-- Policies for GLOSSARY
drop policy if exists "View glossary of visible projects" on public.glossary_terms;
create policy "View glossary of visible projects"
on public.glossary_terms for select
using (
  exists (
    select 1 from public.projects
    where projects.id = glossary_terms.project_id
    and (projects.user_id = auth.uid() or projects.is_public = true)
  )
);

drop policy if exists "Manage glossary of own projects" on public.glossary_terms;
create policy "Manage glossary of own projects"
on public.glossary_terms for all
using (
  exists (
    select 1 from public.projects
    where projects.id = glossary_terms.project_id
    and projects.user_id = auth.uid()
  )
);

-- RPC: Increment View Count
create or replace function increment_project_view(row_id uuid)
returns void as $$
begin
  update public.projects
  set views = views + 1
  where id = row_id;
end;
$$ language plpgsql;
