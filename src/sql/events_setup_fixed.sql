-- Enable storage if not already
insert into storage.buckets (id, name, public)
values ('event-posters', 'event-posters', true)
on conflict (id) do nothing;

-- 1. Drop existing policies if they exist to avoid conflicts
-- We check for both the generic "Public Access" (if this script created it before) and the specific one
do $$
begin
  if exists (select 1 from pg_policies where policyname = 'Public Access' and tablename = 'objects' and schemaname = 'storage') then
      -- Only drop if it's specifically for event-posters, otherwise we might break other buckets
      -- But we can't easily check the definition in sql easily without complex queries.
      -- So we'll skip dropping 'Public Access' safely and just ensure our new specific policy exists.
      null; 
  end if;
end $$;

drop policy if exists "Public Access Events Posters" on storage.objects;
drop policy if exists "Authenticated users can upload event posters" on storage.objects;
drop policy if exists "Users can delete their own event posters" on storage.objects;

-- 2. Create storage policies with UNIQUE names to avoid conflicts
create policy "Public Access Events Posters"
  on storage.objects for select
  using ( bucket_id = 'event-posters' );

create policy "Authenticated users can upload event posters"
  on storage.objects for insert
  with check ( bucket_id = 'event-posters' and auth.role() = 'authenticated' );

create policy "Users can delete their own event posters"
  on storage.objects for delete
  using ( bucket_id = 'event-posters' and owner = auth.uid() );


-- 3. Ensure events table has cover_url
alter table public.events 
add column if not exists cover_url text;

-- 4. Event Table Policies
alter table public.events enable row level security;

drop policy if exists "Events are viewable by everyone" on public.events;
drop policy if exists "Users can create events" on public.events;
drop policy if exists "Users can update their own events" on public.events;
drop policy if exists "Users can delete their own events" on public.events;

create policy "Events are viewable by everyone"
  on public.events for select
  using ( true );

create policy "Users can create events"
  on public.events for insert
  with check ( auth.role() = 'authenticated' );

create policy "Users can update their own events"
  on public.events for update
  using ( auth.uid() = created_by );

create policy "Users can delete their own events"
  on public.events for delete
  using ( auth.uid() = created_by );
