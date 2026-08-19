-- Prescription type support for nutrition and medical consultation documents.
alter table public.partner_consultations
  add column if not exists prescription_type text not null default 'exams';

alter table public.partner_consultations
  add column if not exists prescription_type_label text;

alter table public.partner_consultations
  drop constraint if exists partner_consultations_prescription_type_check;

alter table public.partner_consultations
  add constraint partner_consultations_prescription_type_check
  check (prescription_type in ('exams', 'medication', 'other'));

comment on column public.partner_consultations.prescription_type is
  'Prescription category: examination request, medication, or another specified category.';

comment on column public.partner_consultations.prescription_type_label is
  'Required human-readable label when prescription_type is other.';
