# Degree Programs — Lot 2: Programs and curriculum

## Objective

Lot 2 implements the normalized, bilingual and versioned academic reference model. An approved curriculum is never overwritten: changes start from a cloned draft version and follow submission and academic approval.

## Delivered registers

- academic_programs
- academic_program_versions
- academic_years
- academic_semesters
- academic_teaching_units
- academic_courses
- academic_course_prerequisites
- academic_rules

Every register is protected by RLS, indexed, audited and exposed through an institutional registry with search, filters, sortable columns, detail, history and controlled export.

## Workflow

DRAFT → SUBMITTED → APPROVED or REJECTED.

An APPROVED version is immutable. “New version” clones its UE, courses, prerequisites and academic rules into the next draft version. Approval retires the former active version with an effective end date.

## Program 360° view

The route `/degree-programs/programs/[programId]` provides the institutional program file with General, Versions, Curriculum, Semesters, Units, Courses, Instructors, Students, Results, Internships, Theses, Juries, Documents and Analytics sections. Later lots populate the operational tabs while retaining this stable program identity.

## Supabase

Run after migrations 001–010:

```text
supabase/migrations/011_degree_programs_curriculum.sql
```

Then execute the structural test in a non-production validation environment:

```text
supabase/tests/011_degree_programs_curriculum_test.sql
```

## Security

- `curriculum.read`: read authorized curriculum registers.
- `curriculum.manage`: create and edit draft curriculum data.
- `curriculum.approve`: approve or reject submitted versions.
- UI visibility, route checks, RLS and database workflow functions are cumulative controls.
- CSV export is allowed only after a successful record in `academic_registry_exports`.

## Validation

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run i18n:audit
npm.cmd run build
```
