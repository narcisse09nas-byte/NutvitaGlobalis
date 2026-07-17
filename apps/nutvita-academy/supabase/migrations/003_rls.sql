alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "organizations_select_member"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members member
    where member.organization_id = organizations.id
      and member.user_id = auth.uid()
      and member.active = true
  )
  or owner_user_id = auth.uid()
);

create policy "organizations_update_admin"
on public.organizations
for update
to authenticated
using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members member
    where member.organization_id = organizations.id
      and member.user_id = auth.uid()
      and member.active = true
      and member.role in ('owner', 'admin')
  )
);

create policy "members_select_same_org"
on public.organization_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members viewer
    where viewer.organization_id = organization_members.organization_id
      and viewer.user_id = auth.uid()
      and viewer.active = true
  )
);

create policy "members_manage_admin"
on public.organization_members
for all
to authenticated
using (
  exists (
    select 1
    from public.organization_members manager
    where manager.organization_id = organization_members.organization_id
      and manager.user_id = auth.uid()
      and manager.active = true
      and manager.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_members manager
    where manager.organization_id = organization_members.organization_id
      and manager.user_id = auth.uid()
      and manager.active = true
      and manager.role in ('owner', 'admin')
  )
);

create policy "courses_select_published_or_member"
on public.courses
for select
to authenticated
using (
  status = 'published'
  or instructor_user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members member
    where member.organization_id = courses.organization_id
      and member.user_id = auth.uid()
      and member.active = true
  )
);

create policy "courses_insert_instructor"
on public.courses
for insert
to authenticated
with check (
  instructor_user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members member
    where member.organization_id = courses.organization_id
      and member.user_id = auth.uid()
      and member.active = true
      and member.role in ('owner', 'admin', 'manager', 'instructor')
  )
);

create policy "courses_update_instructor"
on public.courses
for update
to authenticated
using (
  instructor_user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members member
    where member.organization_id = courses.organization_id
      and member.user_id = auth.uid()
      and member.active = true
      and member.role in ('owner', 'admin', 'manager')
  )
);

create policy "modules_select_via_course"
on public.course_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.courses course
    where course.id = course_modules.course_id
      and (
        course.status = 'published'
        or course.instructor_user_id = auth.uid()
      )
  )
);

create policy "lessons_select_via_course"
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.course_modules module
    join public.courses course
      on course.id = module.course_id
    where module.id = lessons.module_id
      and (
        course.status = 'published'
        or course.instructor_user_id = auth.uid()
      )
  )
);

create policy "enrollments_select_own"
on public.enrollments
for select
to authenticated
using (user_id = auth.uid());

create policy "enrollments_insert_own"
on public.enrollments
for insert
to authenticated
with check (user_id = auth.uid());

create policy "progress_own"
on public.lesson_progress
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "certificates_select_own"
on public.certificates
for select
to authenticated
using (user_id = auth.uid());

create policy "audit_logs_org_admin"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members member
    where member.organization_id = audit_logs.organization_id
      and member.user_id = auth.uid()
      and member.active = true
      and member.role in ('owner', 'admin')
  )
);
