-- Public image storage for articles, formations and other website media.
-- Run once in Supabase SQL editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-assets',
  'public-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public assets are readable" on storage.objects;
create policy "Public assets are readable"
on storage.objects for select
using (bucket_id = 'public-assets');

drop policy if exists "Admins upload public assets" on storage.objects;
create policy "Admins upload public assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'public-assets' and public.is_admin());

drop policy if exists "Admins update public assets" on storage.objects;
create policy "Admins update public assets"
on storage.objects for update to authenticated
using (bucket_id = 'public-assets' and public.is_admin())
with check (bucket_id = 'public-assets' and public.is_admin());

drop policy if exists "Admins delete public assets" on storage.objects;
create policy "Admins delete public assets"
on storage.objects for delete to authenticated
using (bucket_id = 'public-assets' and public.is_admin());
