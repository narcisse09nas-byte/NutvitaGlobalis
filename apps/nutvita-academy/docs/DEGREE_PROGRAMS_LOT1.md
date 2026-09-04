# Degree Programs — Lot 1 Foundation

## Objective

Create a strictly isolated academic foundation beside Professional Certifications. The Lot 1 source of truth is Supabase; no official academic data is persisted in localStorage.

## Delivered tree

```text
app/degree-programs/
  layout.tsx
  page.tsx
  programs/page.tsx
  students/page.tsx
  registries/page.tsx
  audit/page.tsx
  settings/page.tsx
  administration/departments/page.tsx
  administration/campuses/page.tsx
  administration/roles/page.tsx
app/api/degree-programs/exports/route.ts
components/degree-programs/
  DegreeProgramShell.tsx
  InstitutionalRegistry.tsx
config/degree-programs.ts
lib/degree-programs/access.ts
types/degree-programs.ts
supabase/migrations/010_degree_programs_foundation.sql
supabase/tests/010_degree_programs_foundation_test.sql
```

## Database

Run migrations 001 through 009 first, then execute:

```text
supabase/migrations/010_degree_programs_foundation.sql
```

The migration creates academic roles, departments, campuses, scoped role assignments, role permissions, module settings, immutable audit logs and an export-request registry.

### Initial bootstrap

A platform `super_admin` can enter the academic space. To bind the module explicitly to an organization, obtain the profile and organization UUIDs, then run:

```sql
insert into public.academic_role_assignments
  (organization_id,user_id,role,scope_type,assigned_by,assignment_reason)
values
  ('ORGANIZATION_UUID','PROFILE_UUID','SUPER_ADMIN','ORGANIZATION','PROFILE_UUID','Initial Degree Programs bootstrap')
on conflict (organization_id,user_id,role,scope_type,scope_id) nulls not distinct
  do update set active=true,valid_to=null,updated_at=now();

insert into public.academic_module_settings
  (organization_id,enabled,institution_name_fr,institution_name_en,created_by)
values
  ('ORGANIZATION_UUID',true,'Nom institution','Institution name','PROFILE_UUID')
on conflict (organization_id) do update set enabled=true,updated_at=now();
```

## Registry UX contract

Every academic registry must provide, when relevant: KPI summary, search, filters, sortable columns, server-ready pagination, permission-controlled export, detailed record, history and controlled actions. `InstitutionalRegistry` is the shared baseline for future lots.

Exports are recorded in `academic_registry_exports` before client-side CSV generation. PDF and XLSX generation will reuse the same traceability record.

## Authorization layers

1. Next.js DAL: `getDegreeSession` and `requireDegreeSession`.
2. Route/handler permission checks.
3. Supabase RLS through `academic_has_access` and `academic_has_permission`.

Navigation visibility is never treated as a security boundary.

## Validation commands

From `apps/nutvita-academy`:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run i18n:audit
npm.cmd run build
```

Run the SQL verification file after the migration in a non-production validation environment.

## Next lot

Lot 2 creates versioned programs, academic years, semesters, teaching units, academic courses, rules and the 360-degree program view.