insert into storage.buckets (
  id,
  name,
  public
)
values
  ('avatars', 'avatars', true),
  ('course-resources', 'course-resources', false),
  ('certificates', 'certificates', false)
on conflict (id) do nothing;

create policy "avatar_public_read"
on storage.objects
for select
using (
  bucket_id = 'avatars'
);

create policy "avatar_owner_write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "course_resource_authenticated_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-resources'
);

create policy "certificate_owner_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'certificates'
  and (storage.foldername(name))[1] = auth.uid()::text
);
