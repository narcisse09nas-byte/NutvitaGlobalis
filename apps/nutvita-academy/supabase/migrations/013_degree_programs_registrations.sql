-- Degree Programs - Lot 4: administrative and pedagogical registrations. Run after 012.
do $$ begin create type public.academic_registration_status as enum ('DRAFT','PENDING_PAYMENT','PENDING_VALIDATION','VALIDATED','REJECTED','CANCELLED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_financial_status as enum ('UNPAID','PARTIALLY_PAID','PAID','WAIVED','OVERDUE'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_fee_entry_type as enum ('CHARGE','PAYMENT','WAIVER','REFUND','ADJUSTMENT'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_enrollment_type as enum ('NORMAL','RETAKE','TRANSFER_CREDIT','EXEMPTION'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_enrollment_status as enum ('DRAFT','ACTIVE','DROPPED','COMPLETED','CANCELLED'); exception when duplicate_object then null; end $$;
create sequence if not exists public.academic_registration_number_seq;

create table if not exists public.academic_administrative_registrations(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 student_id uuid not null references public.academic_students(id) on delete restrict, academic_year_id uuid not null references public.academic_years(id) on delete restrict,
 program_id uuid not null references public.academic_programs(id) on delete restrict, program_version_id uuid not null references public.academic_program_versions(id) on delete restrict,
 campus_id uuid references public.academic_campuses(id) on delete restrict, registration_number text not null unique,
 registration_date date not null default current_date, status public.academic_registration_status not null default 'DRAFT',
 fees_due numeric(14,2) not null default 0 check(fees_due>=0), fees_paid numeric(14,2) not null default 0 check(fees_paid>=0),
 currency char(3) not null default 'XAF', financial_status public.academic_financial_status not null default 'PAID',
 submitted_at timestamptz, validated_by uuid references public.profiles(id) on delete set null, validated_at timestamptz,
 rejection_reason text, created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(student_id,academic_year_id)
);
create table if not exists public.academic_registration_fee_ledger(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 registration_id uuid not null references public.academic_administrative_registrations(id) on delete restrict,
 entry_type public.academic_fee_entry_type not null, reference text not null, description_fr text not null, description_en text not null,
 amount numeric(14,2) not null check(amount>0), currency char(3) not null, effective_date date not null default current_date,
 status text not null default 'POSTED' check(status in('PENDING','POSTED','VOIDED')), payment_provider text, external_payment_id text,
 recorded_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(), voided_at timestamptz, voided_by uuid references public.profiles(id) on delete set null,
 unique(organization_id,reference)
);
create table if not exists public.academic_course_enrollments(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 administrative_registration_id uuid not null references public.academic_administrative_registrations(id) on delete restrict,
 student_id uuid not null references public.academic_students(id) on delete restrict, academic_year_id uuid not null references public.academic_years(id) on delete restrict,
 semester_id uuid not null references public.academic_semesters(id) on delete restrict, teaching_unit_id uuid not null references public.academic_teaching_units(id) on delete restrict,
 course_id uuid not null references public.academic_courses(id) on delete restrict, enrollment_type public.academic_enrollment_type not null default 'NORMAL',
 status public.academic_enrollment_status not null default 'ACTIVE', registered_at timestamptz not null default now(),
 approved_by uuid references public.profiles(id) on delete set null, approval_reason text,
 created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(student_id,academic_year_id,course_id,enrollment_type)
);

create index if not exists academic_admin_registrations_org_idx on public.academic_administrative_registrations(organization_id,academic_year_id,status);
create index if not exists academic_admin_registrations_student_idx on public.academic_administrative_registrations(student_id,registration_date desc);
create index if not exists academic_fee_ledger_registration_idx on public.academic_registration_fee_ledger(registration_id,effective_date,created_at);
create index if not exists academic_course_enrollments_student_idx on public.academic_course_enrollments(student_id,academic_year_id,semester_id,status);
create index if not exists academic_course_enrollments_course_idx on public.academic_course_enrollments(course_id,semester_id,status);

create or replace function public.academic_set_registration_number() returns trigger language plpgsql as $$ begin
 if new.registration_number is null or btrim(new.registration_number)='' then new.registration_number='REG-'||extract(year from new.registration_date)::int||'-'||lpad(nextval('public.academic_registration_number_seq')::text,6,'0'); end if; return new; end $$;
drop trigger if exists academic_registration_number on public.academic_administrative_registrations;
create trigger academic_registration_number before insert on public.academic_administrative_registrations for each row execute function public.academic_set_registration_number();

create or replace function public.academic_validate_registration_links() returns trigger language plpgsql as $$ declare s public.academic_students; y public.academic_years; v public.academic_program_versions; begin
 select * into s from public.academic_students where id=new.student_id; select * into y from public.academic_years where id=new.academic_year_id; select * into v from public.academic_program_versions where id=new.program_version_id;
 if s.id is null or s.organization_id<>new.organization_id or s.current_program_id<>new.program_id or s.current_program_version_id<>new.program_version_id then raise exception 'Registration does not match the student academic record'; end if;
 if y.id is null or y.organization_id<>new.organization_id then raise exception 'Academic year does not belong to the organization'; end if;
 if v.program_id<>new.program_id then raise exception 'Program version does not belong to the program'; end if; return new; end $$;
drop trigger if exists academic_registration_links on public.academic_administrative_registrations;
create trigger academic_registration_links before insert or update on public.academic_administrative_registrations for each row execute function public.academic_validate_registration_links();
create or replace function public.academic_validate_enrollment_links() returns trigger language plpgsql as $$ declare r public.academic_administrative_registrations; s public.academic_semesters; u public.academic_teaching_units; c public.academic_courses; begin
 select * into r from public.academic_administrative_registrations where id=new.administrative_registration_id;
 select * into s from public.academic_semesters where id=new.semester_id; select * into u from public.academic_teaching_units where id=new.teaching_unit_id; select * into c from public.academic_courses where id=new.course_id;
 if r.id is null or r.status<>'VALIDATED' then raise exception 'A validated administrative registration is required'; end if;
 if r.student_id<>new.student_id or r.academic_year_id<>new.academic_year_id then raise exception 'Student or academic year does not match the administrative registration'; end if;
 if s.academic_year_id<>new.academic_year_id or s.program_version_id<>r.program_version_id then raise exception 'Semester does not match registration year and program version'; end if;
 if u.program_version_id<>r.program_version_id or u.semester_number<>s.semester_number then raise exception 'Teaching unit does not match semester and program version'; end if;
 if c.teaching_unit_id<>u.id then raise exception 'Course does not belong to selected teaching unit'; end if;
 return new; end $$;
drop trigger if exists academic_course_enrollment_links on public.academic_course_enrollments;
create trigger academic_course_enrollment_links before insert or update on public.academic_course_enrollments for each row execute function public.academic_validate_enrollment_links();

create or replace function public.academic_refresh_registration_finance(p_registration_id uuid) returns void language plpgsql security definer set search_path=public as $$ declare charge numeric:=0; paid numeric:=0; waived numeric:=0; reg public.academic_administrative_registrations; begin
 select coalesce(sum(case when entry_type in('CHARGE','ADJUSTMENT') then amount when entry_type='REFUND' then -amount else 0 end),0),
 coalesce(sum(case when entry_type='PAYMENT' then amount else 0 end),0),coalesce(sum(case when entry_type='WAIVER' then amount else 0 end),0)
 into charge,paid,waived from public.academic_registration_fee_ledger where registration_id=p_registration_id and status='POSTED';
 select * into reg from public.academic_administrative_registrations where id=p_registration_id;
 update public.academic_administrative_registrations set fees_due=greatest(charge-waived,0),fees_paid=paid,
 financial_status=case when greatest(charge-waived,0)=0 and waived>0 then 'WAIVED'::public.academic_financial_status when paid>=greatest(charge-waived,0) then 'PAID'::public.academic_financial_status when paid>0 then 'PARTIALLY_PAID'::public.academic_financial_status else 'UNPAID'::public.academic_financial_status end
 where id=p_registration_id; end $$;
create or replace function public.academic_fee_ledger_refresh_trigger() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.academic_refresh_registration_finance(coalesce(new.registration_id,old.registration_id)); return coalesce(new,old); end $$;
drop trigger if exists academic_fee_ledger_refresh on public.academic_registration_fee_ledger;
create trigger academic_fee_ledger_refresh after insert or update on public.academic_registration_fee_ledger for each row execute function public.academic_fee_ledger_refresh_trigger();
revoke all on function public.academic_refresh_registration_finance(uuid) from public;

do $$ declare t text; begin foreach t in array array['academic_administrative_registrations','academic_course_enrollments'] loop
 execute format('drop trigger if exists %I_touch on public.%I',t,t); execute format('create trigger %I_touch before update on public.%I for each row execute function public.academic_touch_updated_at()',t,t);
 execute format('drop trigger if exists %I_audit on public.%I',t,t); execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.academic_audit_curriculum_change()',t,t); end loop; end $$;
drop trigger if exists academic_fee_ledger_audit on public.academic_registration_fee_ledger;
create trigger academic_fee_ledger_audit after insert or update or delete on public.academic_registration_fee_ledger for each row execute function public.academic_audit_curriculum_change();

insert into public.academic_role_permissions(role,permission_code,description_fr,description_en) values
('STUDENT','registration.self.read','Consulter ses inscriptions','Read own registrations'),
('ACADEMIC_SECRETARY','registration.read','Consulter les inscriptions','Read registrations'),
('ACADEMIC_SECRETARY','registration.manage','Preparer les inscriptions','Prepare registrations'),
('ACADEMIC_SECRETARY','registration.validate','Valider les inscriptions administratives','Validate administrative registrations'),
('ACADEMIC_SECRETARY','enrollment.manage','Gerer les inscriptions pedagogiques','Manage course enrollments'),
('ACADEMIC_SECRETARY','registration.finance','Enregistrer les frais et paiements','Record fees and payments'),
('PROGRAM_COORDINATOR','registration.read','Consulter les inscriptions du programme','Read program registrations'),
('PROGRAM_COORDINATOR','enrollment.read','Consulter les inscriptions pedagogiques du programme','Read program course enrollments'),
('PROGRAM_COORDINATOR','enrollment.manage','Gerer les inscriptions pedagogiques du programme','Manage program course enrollments'),
('FINANCE_OFFICER','registration.read','Consulter les inscriptions financieres','Read financial registrations'),
('FINANCE_OFFICER','registration.finance','Gerer les frais et paiements','Manage fees and payments'),
('ACADEMIC_ADMIN','registration.read','Consulter toutes les inscriptions','Read all registrations'),
('ACADEMIC_ADMIN','registration.manage','Gerer les inscriptions','Manage registrations'),
('ACADEMIC_ADMIN','registration.validate','Valider les inscriptions','Validate registrations'),
('ACADEMIC_ADMIN','registration.finance','Gerer les finances d inscription','Manage registration finance'),
('ACADEMIC_ADMIN','enrollment.read','Consulter les inscriptions pedagogiques','Read course enrollments'),
('ACADEMIC_ADMIN','enrollment.manage','Gerer les inscriptions pedagogiques','Manage course enrollments'),
('SUPER_ADMIN','registration.read','Consulter toutes les inscriptions','Read all registrations'),
('SUPER_ADMIN','registration.manage','Gerer toutes les inscriptions','Manage all registrations'),
('SUPER_ADMIN','registration.validate','Valider toutes les inscriptions','Validate all registrations'),
('SUPER_ADMIN','registration.finance','Gerer toutes les finances d inscription','Manage all registration finance'),
('SUPER_ADMIN','enrollment.read','Consulter toutes les inscriptions pedagogiques','Read all course enrollments'),
('SUPER_ADMIN','enrollment.manage','Gerer toutes les inscriptions pedagogiques','Manage all course enrollments')
on conflict(role,permission_code) do update set description_fr=excluded.description_fr,description_en=excluded.description_en;

alter table public.academic_administrative_registrations enable row level security;
alter table public.academic_registration_fee_ledger enable row level security;
alter table public.academic_course_enrollments enable row level security;
drop policy if exists "administrative registrations read" on public.academic_administrative_registrations;
create policy "administrative registrations read" on public.academic_administrative_registrations for select to authenticated using(exists(select 1 from public.academic_students s where s.id=academic_administrative_registrations.student_id and(s.user_id=auth.uid() or public.academic_has_program_scope(academic_administrative_registrations.organization_id,academic_administrative_registrations.program_id,'registration.read'))));
drop policy if exists "administrative registrations manage" on public.academic_administrative_registrations;
drop policy if exists "administrative registrations insert" on public.academic_administrative_registrations;
create policy "administrative registrations insert" on public.academic_administrative_registrations for insert to authenticated with check(public.academic_has_program_scope(organization_id,program_id,'registration.manage'));
drop policy if exists "administrative registrations update" on public.academic_administrative_registrations;
create policy "administrative registrations update" on public.academic_administrative_registrations for update to authenticated using(public.academic_has_program_scope(organization_id,program_id,'registration.manage')) with check(public.academic_has_program_scope(organization_id,program_id,'registration.manage'));
drop policy if exists "administrative registrations delete draft" on public.academic_administrative_registrations;
create policy "administrative registrations delete draft" on public.academic_administrative_registrations for delete to authenticated using(status='DRAFT' and public.academic_has_program_scope(organization_id,program_id,'registration.manage'));
drop policy if exists "fee ledger read" on public.academic_registration_fee_ledger;
create policy "fee ledger read" on public.academic_registration_fee_ledger for select to authenticated using(exists(select 1 from public.academic_administrative_registrations r join public.academic_students s on s.id=r.student_id where r.id=academic_registration_fee_ledger.registration_id and(s.user_id=auth.uid() or public.academic_has_program_scope(r.organization_id,r.program_id,'registration.read'))));
drop policy if exists "fee ledger manage" on public.academic_registration_fee_ledger;
drop policy if exists "fee ledger insert" on public.academic_registration_fee_ledger;
create policy "fee ledger insert" on public.academic_registration_fee_ledger for insert to authenticated with check(recorded_by=auth.uid() and exists(select 1 from public.academic_administrative_registrations r where r.id=academic_registration_fee_ledger.registration_id and public.academic_has_program_scope(r.organization_id,r.program_id,'registration.finance')));
drop policy if exists "fee ledger update" on public.academic_registration_fee_ledger;
create policy "fee ledger update" on public.academic_registration_fee_ledger for update to authenticated using(exists(select 1 from public.academic_administrative_registrations r where r.id=academic_registration_fee_ledger.registration_id and public.academic_has_program_scope(r.organization_id,r.program_id,'registration.finance'))) with check(exists(select 1 from public.academic_administrative_registrations r where r.id=academic_registration_fee_ledger.registration_id and public.academic_has_program_scope(r.organization_id,r.program_id,'registration.finance')));
drop policy if exists "course enrollments read" on public.academic_course_enrollments;
create policy "course enrollments read" on public.academic_course_enrollments for select to authenticated using(exists(select 1 from public.academic_students s join public.academic_administrative_registrations r on r.id=academic_course_enrollments.administrative_registration_id where s.id=academic_course_enrollments.student_id and(s.user_id=auth.uid() or public.academic_has_program_scope(academic_course_enrollments.organization_id,r.program_id,'enrollment.read'))));
drop policy if exists "course enrollments manage" on public.academic_course_enrollments;
drop policy if exists "course enrollments insert" on public.academic_course_enrollments;
create policy "course enrollments insert" on public.academic_course_enrollments for insert to authenticated with check(exists(select 1 from public.academic_administrative_registrations r where r.id=academic_course_enrollments.administrative_registration_id and public.academic_has_program_scope(academic_course_enrollments.organization_id,r.program_id,'enrollment.manage')));
drop policy if exists "course enrollments update" on public.academic_course_enrollments;
create policy "course enrollments update" on public.academic_course_enrollments for update to authenticated using(exists(select 1 from public.academic_administrative_registrations r where r.id=academic_course_enrollments.administrative_registration_id and public.academic_has_program_scope(academic_course_enrollments.organization_id,r.program_id,'enrollment.manage'))) with check(exists(select 1 from public.academic_administrative_registrations r where r.id=academic_course_enrollments.administrative_registration_id and public.academic_has_program_scope(academic_course_enrollments.organization_id,r.program_id,'enrollment.manage')));

create or replace function public.academic_transition_registration(p_registration_id uuid,p_status public.academic_registration_status,p_reason text)
returns public.academic_administrative_registrations language plpgsql security definer set search_path=public as $$ declare r public.academic_administrative_registrations; old_status public.academic_registration_status; st public.academic_students; allowed boolean:=false; begin
 select * into r from public.academic_administrative_registrations where id=p_registration_id for update; if r.id is null then raise exception 'Registration not found'; end if;
 old_status:=r.status; allowed:=case when old_status='DRAFT' then p_status in('PENDING_PAYMENT','PENDING_VALIDATION','CANCELLED') when old_status='PENDING_PAYMENT' then p_status in('PENDING_VALIDATION','CANCELLED') when old_status='PENDING_VALIDATION' then p_status in('VALIDATED','REJECTED') when old_status='REJECTED' then p_status='DRAFT' else false end;
 if not allowed then raise exception 'Invalid registration transition: % -> %',old_status,p_status; end if;
 if p_status in('VALIDATED','REJECTED') and not public.academic_has_program_scope(r.organization_id,r.program_id,'registration.validate') then raise exception 'Registration validation permission required';
 elsif p_status not in('VALIDATED','REJECTED') and not public.academic_has_program_scope(r.organization_id,r.program_id,'registration.manage') then raise exception 'Registration management permission required'; end if;
 if p_status='VALIDATED' and r.financial_status not in('PAID','WAIVED') then raise exception 'Registration cannot be validated before payment or waiver'; end if;
 update public.academic_administrative_registrations set status=p_status,submitted_at=case when p_status='PENDING_VALIDATION' then now() else submitted_at end,
 validated_by=case when p_status='VALIDATED' then auth.uid() else validated_by end,validated_at=case when p_status='VALIDATED' then now() else validated_at end,
 rejection_reason=case when p_status='REJECTED' then p_reason else null end,updated_by=auth.uid() where id=r.id returning * into r;
 if p_status='VALIDATED' then
  select * into st from public.academic_students where id=r.student_id for update;
  update public.academic_students set academic_status='ENROLLED',registration_status='REGISTERED',updated_by=auth.uid() where id=st.id;
  if st.academic_status<>'ENROLLED' then insert into public.academic_student_status_history(organization_id,student_id,from_status,to_status,reason,changed_by) values(st.organization_id,st.id,st.academic_status,'ENROLLED',p_reason,auth.uid()); end if;
 end if;
 insert into public.academic_audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,reason) values(r.organization_id,auth.uid(),'academic_administrative_registrations',r.id,p_status::text,p_reason);
 return r; end $$;

create or replace function public.academic_enroll_courses(p_registration_id uuid,p_semester_id uuid,p_course_ids uuid[],p_type public.academic_enrollment_type,p_reason text)
returns setof public.academic_course_enrollments language plpgsql security invoker as $$ declare r public.academic_administrative_registrations; course_id uuid; c public.academic_courses; u public.academic_teaching_units; inserted public.academic_course_enrollments; begin
 select * into r from public.academic_administrative_registrations where id=p_registration_id;
 if r.status<>'VALIDATED' or not public.academic_has_program_scope(r.organization_id,r.program_id,'enrollment.manage') then raise exception 'Validated registration and enrollment permission required'; end if;
 foreach course_id in array p_course_ids loop
  select * into c from public.academic_courses where id=course_id; select * into u from public.academic_teaching_units where id=c.teaching_unit_id;
  insert into public.academic_course_enrollments(organization_id,administrative_registration_id,student_id,academic_year_id,semester_id,teaching_unit_id,course_id,enrollment_type,status,approved_by,approval_reason,created_by,updated_by)
  values(r.organization_id,r.id,r.student_id,r.academic_year_id,p_semester_id,u.id,c.id,p_type,'ACTIVE',auth.uid(),p_reason,auth.uid(),auth.uid())
  on conflict(student_id,academic_year_id,course_id,enrollment_type) do update set status='ACTIVE',semester_id=excluded.semester_id,approved_by=auth.uid(),approval_reason=p_reason,updated_by=auth.uid(),updated_at=now() returning * into inserted;
  return next inserted; end loop; return; end $$;
grant execute on function public.academic_transition_registration(uuid,public.academic_registration_status,text) to authenticated;
grant execute on function public.academic_enroll_courses(uuid,uuid,uuid[],public.academic_enrollment_type,text) to authenticated;
comment on table public.academic_registration_fee_ledger is 'Normalized financial source of truth; registration totals are derived from posted ledger entries.';
comment on table public.academic_course_enrollments is 'One normalized row per student, year, course and enrollment type.';
