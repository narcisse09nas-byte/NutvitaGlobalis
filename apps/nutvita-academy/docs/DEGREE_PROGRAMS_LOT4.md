# Degree Programs — Lot 4: Registrations

## Objective

Lot 4 implements annual administrative registration, a normalized fee ledger and pedagogical enrollment in curriculum courses.

## Registers

- `academic_administrative_registrations`
- `academic_registration_fee_ledger`
- `academic_course_enrollments`

Administrative numbers follow `REG-YYYY-######`. A student has at most one administrative registration per academic year.

## Administrative workflow

`DRAFT → PENDING_PAYMENT → PENDING_VALIDATION → VALIDATED / REJECTED`

A registration cannot be validated while its financial status is unpaid or partially paid. A zero-fee registration is financially settled by default. Validation changes the student status to `ENROLLED` and records the transition.

## Financial source of truth

Fees and payments are never represented only by aggregate fields. Every charge, payment, waiver, refund or adjustment is written to the ledger. Posted entries recalculate `fees_due`, `fees_paid` and `financial_status` automatically. Ledger entries are not hard-deleted through RLS.

## Pedagogical registration

One normalized row links the student, annual registration, semester, teaching unit and course. PostgreSQL verifies:

- the administrative registration is validated;
- student and academic year match;
- semester belongs to the registered program version;
- teaching unit belongs to the semester;
- course belongs to the teaching unit;
- duplicate enrollment is prevented.

Types: `NORMAL`, `RETAKE`, `TRANSFER_CREDIT`, `EXEMPTION`.

## Interfaces

- `/degree-programs/registrations`
- `/degree-programs/registrations/[registrationId]`
- `/degree-programs/enrollments`
- Student 360° includes annual registrations, balances and enrolled courses.

## Supabase

Run after migrations 001–012:

```text
supabase/migrations/013_degree_programs_registrations.sql
```

Then run:

```text
supabase/tests/013_degree_programs_registrations_test.sql
```
