-- Degree Programs - Lot 3: admissions, application documents and student records. Run after 011.
do $$ begin create type public.academic_application_status as enum ('DRAFT','SUBMITTED','UNDER_REVIEW','INCOMPLETE','ELIGIBLE','ADMITTED','REJECTED','WAITLISTED','WITHDRAWN'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_student_status as enum ('APPLICANT','ADMITTED','ENROLLED','SUSPENDED','WITHDRAWN','GRADUATED','EXCLUDED','ON_LEAVE'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_document_verification_status as enum ('PENDING','VERIFIED','REJECTED','REPLACEMENT_REQUIRED'); exception when duplicate_object then null; end $$;
create sequence if not exists public.academic_application_number_seq;
create sequence if not exists public.academic_student_number_seq;

create table if not exists public.academic_applications(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 candidate_user_id uuid not null references public.profiles(id) on delete restrict, program_id uuid not null references public.academic_programs(id) on delete restrict,
 program_version_id uuid references public.academic_program_versions(id) on delete restrict, academic_year_id uuid not null references public.academic_years(id) on delete restrict,
 campus_id uuid references public.academic_campuses(id) on delete restrict, application_number text not null unique,
 submission_date timestamptz, status public.academic_application_status not null default 'DRAFT', decision text check(decision is null or decision in ('ADMITTED','REJECTED','WAITLISTED')),
 decision_date timestamptz, reviewer_id uuid references public.profiles(id) on delete set null, comments text,
 created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,candidate_user_id,program_id,academic_year_id)
);
create table if not exists public.academic_application_documents(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 application_id uuid not null references public.academic_applications(id) on delete cascade, document_type text not null,
 storage_bucket text not null default 'academic-documents', storage_path text not null, original_file_name text not null, mime_type text, file_size_bytes bigint check(file_size_bytes is null or file_size_bytes>=0),
 verification_status public.academic_document_verification_status not null default 'PENDING', verified_by uuid references public.profiles(id) on delete set null,
 verified_at timestamptz, verification_comment text, uploaded_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(application_id,document_type,storage_path)
);
create table if not exists public.academic_application_reviews(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 application_id uuid not null references public.academic_applications(id) on delete cascade,
 from_status public.academic_application_status, to_status public.academic_application_status not null,
 decision text, comments text not null, reviewed_by uuid not null references public.profiles(id) on delete restrict, reviewed_at timestamptz not null default now()
);
create table if not exists public.academic_students(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict, admission_application_id uuid unique references public.academic_applications(id) on delete restrict,
 student_number text not null unique, admission_year integer not null check(admission_year between 2000 and 2200),
 current_program_id uuid not null references public.academic_programs(id) on delete restrict,
 current_program_version_id uuid not null references public.academic_program_versions(id) on delete restrict,
 current_level text not null, current_semester smallint not null default 1 check(current_semester>0),
 academic_status public.academic_student_status not null default 'ADMITTED', registration_status text not null default 'PENDING' check(registration_status in ('PENDING','REGISTERED','INCOMPLETE','BLOCKED','CANCELLED')),
 country_code char(2), campus_id uuid references public.academic_campuses(id) on delete restrict,
 created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,user_id,current_program_id)
);
create table if not exists public.academic_student_status_history(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 student_id uuid not null references public.academic_students(id) on delete cascade,
 from_status public.academic_student_status, to_status public.academic_student_status not null,
 reason text not null, changed_by uuid not null references public.profiles(id) on delete restrict, changed_at timestamptz not null default now()
);

create index if not exists academic_applications_org_status_idx on public.academic_applications(organization_id,status,created_at desc);
create index if not exists academic_applications_candidate_idx on public.academic_applications(candidate_user_id,created_at desc);
create index if not exists academic_applications_program_year_idx on public.academic_applications(program_id,academic_year_id,status);
create index if not exists academic_application_documents_app_idx on public.academic_application_documents(application_id,verification_status);
create index if not exists academic_application_reviews_app_idx on public.academic_application_reviews(application_id,reviewed_at desc);
create index if not exists academic_students_org_status_idx on public.academic_students(organization_id,academic_status,current_program_id);
create index if not exists academic_students_user_idx on public.academic_students(user_id);
create index if not exists academic_student_history_idx on public.academic_student_status_history(student_id,changed_at desc);

create or replace function public.academic_set_application_number() returns trigger language plpgsql as $$ begin
 if new.application_number is null or btrim(new.application_number)='' then new.application_number='APP-'||extract(year from current_date)::int||'-'||lpad(nextval('public.academic_application_number_seq')::text,6,'0'); end if; return new; end $$;
create or replace function public.academic_set_student_number() returns trigger language plpgsql as $$ begin
 if new.student_number is null or btrim(new.student_number)='' then new.student_number='STD-'||new.admission_year||'-'||lpad(nextval('public.academic_student_number_seq')::text,6,'0'); end if; return new; end $$;
drop trigger if exists academic_applications_number on public.academic_applications;
create trigger academic_applications_number before insert on public.academic_applications for each row execute function public.academic_set_application_number();
drop trigger if exists academic_students_number on public.academic_students;
create trigger academic_students_number before insert on public.academic_students for each row execute function public.academic_set_student_number();

do $$ declare t text; begin foreach t in array array['academic_applications','academic_application_documents','academic_students'] loop
 execute format('drop trigger if exists %I_touch on public.%I',t,t); execute format('create trigger %I_touch before update on public.%I for each row execute function public.academic_touch_updated_at()',t,t);
 execute format('drop trigger if exists %I_audit on public.%I',t,t); execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.academic_audit_curriculum_change()',t,t); end loop; end $$;

create or replace function public.academic_has_program_scope(p_organization_id uuid,p_program_id uuid,p_permission text) returns boolean language sql stable security definer set search_path=public as $$
 select public.academic_is_super_admin() or exists(
  select 1 from public.academic_role_assignments a join public.academic_role_permissions rp on rp.role=a.role
  where a.organization_id=p_organization_id and a.user_id=auth.uid() and a.active and a.valid_from<=current_date and(a.valid_to is null or a.valid_to>=current_date)
  and rp.permission_code=p_permission and(a.scope_type in('ORGANIZATION','DEPARTMENT','CAMPUS') or(a.scope_type='PROGRAM' and a.scope_id=p_program_id))
 ) $$;
grant execute on function public.academic_has_program_scope(uuid,uuid,text) to authenticated;

insert into public.academic_role_permissions(role,permission_code,description_fr,description_en) values
('STUDENT','application.self.manage','Gerer ses candidatures','Manage own applications'),
('ACADEMIC_SECRETARY','application.read','Consulter les candidatures','Read applications'),
('ACADEMIC_SECRETARY','application.manage','Instruire les candidatures','Process applications'),
('ACADEMIC_SECRETARY','student.read','Consulter les dossiers etudiants','Read student records'),
('ACADEMIC_ADMIN','application.read','Consulter toutes les candidatures','Read all applications'),
('ACADEMIC_ADMIN','application.manage','Administrer les admissions','Administer admissions'),
('ACADEMIC_ADMIN','application.decide','Decider les admissions','Decide admissions'),
('ACADEMIC_ADMIN','student.read','Consulter tous les dossiers etudiants','Read all student records'),
('ACADEMIC_ADMIN','student.manage','Gerer les dossiers etudiants','Manage student records'),
('PROGRAM_COORDINATOR','application.read','Consulter les candidatures du programme','Read program applications'),
('PROGRAM_COORDINATOR','student.read','Consulter les etudiants du programme','Read program students'),
('SUPER_ADMIN','application.read','Consulter toutes les candidatures','Read all applications'),
('SUPER_ADMIN','application.manage','Gerer toutes les candidatures','Manage all applications'),
('SUPER_ADMIN','application.decide','Decider les admissions','Decide admissions'),
('SUPER_ADMIN','student.read','Consulter tous les dossiers etudiants','Read all student records'),
('SUPER_ADMIN','student.manage','Gerer tous les dossiers etudiants','Manage student records')
on conflict(role,permission_code) do update set description_fr=excluded.description_fr,description_en=excluded.description_en;

alter table public.academic_applications enable row level security;
alter table public.academic_application_documents enable row level security;
alter table public.academic_application_reviews enable row level security;
alter table public.academic_students enable row level security;
alter table public.academic_student_status_history enable row level security;
drop policy if exists "applications read" on public.academic_applications;
create policy "applications read" on public.academic_applications for select to authenticated using(candidate_user_id=auth.uid() or public.academic_has_program_scope(organization_id,program_id,'application.read'));
drop policy if exists "applications create self or staff" on public.academic_applications;
create policy "applications create self or staff" on public.academic_applications for insert to authenticated with check((candidate_user_id=auth.uid() and public.academic_has_access(organization_id)) or public.academic_has_program_scope(organization_id,program_id,'application.manage'));
drop policy if exists "applications update" on public.academic_applications;
create policy "applications update" on public.academic_applications for update to authenticated using((candidate_user_id=auth.uid() and status='DRAFT') or public.academic_has_program_scope(organization_id,program_id,'application.manage')) with check((candidate_user_id=auth.uid() and status in('DRAFT','SUBMITTED','WITHDRAWN')) or public.academic_has_program_scope(organization_id,program_id,'application.manage'));
drop policy if exists "application documents read" on public.academic_application_documents;
create policy "application documents read" on public.academic_application_documents for select to authenticated using(exists(select 1 from public.academic_applications a where a.id=application_id and(a.candidate_user_id=auth.uid() or public.academic_has_program_scope(a.organization_id,a.program_id,'application.read'))));
drop policy if exists "application documents insert" on public.academic_application_documents;
create policy "application documents insert" on public.academic_application_documents for insert to authenticated with check(uploaded_by=auth.uid() and exists(select 1 from public.academic_applications a where a.id=application_id and(a.candidate_user_id=auth.uid() or public.academic_has_program_scope(a.organization_id,a.program_id,'application.manage'))));
drop policy if exists "application documents verify" on public.academic_application_documents;
create policy "application documents verify" on public.academic_application_documents for update to authenticated using(exists(select 1 from public.academic_applications a where a.id=application_id and public.academic_has_program_scope(a.organization_id,a.program_id,'application.manage'))) with check(exists(select 1 from public.academic_applications a where a.id=application_id and public.academic_has_program_scope(a.organization_id,a.program_id,'application.manage')));
drop policy if exists "application reviews read" on public.academic_application_reviews;
create policy "application reviews read" on public.academic_application_reviews for select to authenticated using(exists(select 1 from public.academic_applications a where a.id=application_id and(a.candidate_user_id=auth.uid() or public.academic_has_program_scope(a.organization_id,a.program_id,'application.read'))));
drop policy if exists "application reviews append" on public.academic_application_reviews;
create policy "application reviews append" on public.academic_application_reviews for insert to authenticated with check(reviewed_by=auth.uid() and exists(select 1 from public.academic_applications a where a.id=application_id and public.academic_has_program_scope(a.organization_id,a.program_id,'application.manage')));
drop policy if exists "students read" on public.academic_students;
create policy "students read" on public.academic_students for select to authenticated using(user_id=auth.uid() or public.academic_has_program_scope(organization_id,current_program_id,'student.read'));
drop policy if exists "students manage" on public.academic_students;
create policy "students manage" on public.academic_students for all to authenticated using(public.academic_has_program_scope(organization_id,current_program_id,'student.manage')) with check(public.academic_has_program_scope(organization_id,current_program_id,'student.manage'));
drop policy if exists "student history read" on public.academic_student_status_history;
create policy "student history read" on public.academic_student_status_history for select to authenticated using(exists(select 1 from public.academic_students s where s.id=student_id and(s.user_id=auth.uid() or public.academic_has_program_scope(s.organization_id,s.current_program_id,'student.read'))));
drop policy if exists "student history append" on public.academic_student_status_history;
create policy "student history append" on public.academic_student_status_history for insert to authenticated with check(changed_by=auth.uid() and exists(select 1 from public.academic_students s where s.id=student_id and public.academic_has_program_scope(s.organization_id,s.current_program_id,'student.manage')));

create or replace function public.academic_transition_application(p_application_id uuid,p_status public.academic_application_status,p_comment text)
returns public.academic_applications language plpgsql security definer set search_path=public as $$ declare a public.academic_applications; old_status public.academic_application_status; allowed boolean:=false; begin
 select * into a from public.academic_applications where id=p_application_id for update; if a.id is null then raise exception 'Application not found'; end if;
 if not(a.candidate_user_id=auth.uid() or public.academic_has_program_scope(a.organization_id,a.program_id,'application.manage')) then raise exception 'Forbidden'; end if;
 old_status:=a.status;
 allowed:=case when old_status='DRAFT' then p_status in('SUBMITTED','WITHDRAWN') when old_status='SUBMITTED' then p_status in('UNDER_REVIEW','INCOMPLETE','WITHDRAWN')
 when old_status='UNDER_REVIEW' then p_status in('INCOMPLETE','ELIGIBLE','WAITLISTED','REJECTED') when old_status='INCOMPLETE' then p_status in('SUBMITTED','WITHDRAWN')
 when old_status in('ELIGIBLE','WAITLISTED') then p_status in('ADMITTED','REJECTED') else false end;
 if not allowed then raise exception 'Invalid application transition: % -> %',old_status,p_status; end if;
 if a.candidate_user_id=auth.uid() and p_status not in('SUBMITTED','WITHDRAWN') then raise exception 'Candidate cannot perform this transition'; end if;
 if p_status in('ADMITTED','REJECTED','WAITLISTED') and not public.academic_has_program_scope(a.organization_id,a.program_id,'application.decide') then raise exception 'Admission decision permission required'; end if;
 update public.academic_applications set status=p_status,submission_date=case when p_status='SUBMITTED' then coalesce(submission_date,now()) else submission_date end,
 decision=case when p_status in('ADMITTED','REJECTED','WAITLISTED') then p_status::text else decision end,
 decision_date=case when p_status in('ADMITTED','REJECTED') then now() else decision_date end,reviewer_id=case when candidate_user_id<>auth.uid() then auth.uid() else reviewer_id end,
 comments=p_comment,updated_by=auth.uid() where id=a.id returning * into a;
 insert into public.academic_application_reviews(organization_id,application_id,from_status,to_status,decision,comments,reviewed_by)
 values(a.organization_id,a.id,old_status,p_status,a.decision,p_comment,auth.uid()); return a; end $$;

create or replace function public.academic_materialize_student(p_application_id uuid,p_reason text) returns public.academic_students language plpgsql security invoker as $$
declare a public.academic_applications; p public.academic_programs; v public.academic_program_versions; y public.academic_years; s public.academic_students; begin
 select * into a from public.academic_applications where id=p_application_id for update;
 if a.status<>'ADMITTED' or not public.academic_has_program_scope(a.organization_id,a.program_id,'student.manage') then raise exception 'Application is not admitted or operation is forbidden'; end if;
 select * into s from public.academic_students where admission_application_id=a.id; if s.id is not null then return s; end if;
 select * into p from public.academic_programs where id=a.program_id; select * into y from public.academic_years where id=a.academic_year_id;
 if a.program_version_id is not null then select * into v from public.academic_program_versions where id=a.program_version_id;
 else select * into v from public.academic_program_versions where program_id=a.program_id and status='APPROVED' order by version_number desc limit 1; end if;
 if v.id is null then raise exception 'No approved program version is available'; end if;
 insert into public.academic_students(organization_id,user_id,admission_application_id,student_number,admission_year,current_program_id,current_program_version_id,current_level,current_semester,academic_status,registration_status,campus_id,created_by,updated_by)
 values(a.organization_id,a.candidate_user_id,a.id,'',extract(year from y.start_date)::int,a.program_id,v.id,p.level::text,1,'ADMITTED','PENDING',a.campus_id,auth.uid(),auth.uid())
 on conflict(organization_id,user_id,current_program_id) do update set admission_application_id=excluded.admission_application_id,updated_by=auth.uid(),updated_at=now() returning * into s;
 insert into public.academic_student_status_history(organization_id,student_id,from_status,to_status,reason,changed_by) values(s.organization_id,s.id,null,s.academic_status,p_reason,auth.uid());
 insert into public.academic_role_assignments(organization_id,user_id,role,scope_type,scope_id,active,assigned_by,assignment_reason) values(s.organization_id,s.user_id,'STUDENT','PROGRAM',s.current_program_id,true,auth.uid(),p_reason) on conflict(organization_id,user_id,role,scope_type,scope_id) do update set active=true,valid_to=null,updated_at=now();
 return s; end $$;
grant execute on function public.academic_transition_application(uuid,public.academic_application_status,text) to authenticated;
grant execute on function public.academic_materialize_student(uuid,text) to authenticated;
create or replace function public.academic_transition_student(p_student_id uuid,p_status public.academic_student_status,p_reason text) returns public.academic_students language plpgsql security invoker as $$ declare s public.academic_students; old_status public.academic_student_status; begin
 select * into s from public.academic_students where id=p_student_id for update;
 if s.id is null or not public.academic_has_program_scope(s.organization_id,s.current_program_id,'student.manage') then raise exception 'Student not found or forbidden'; end if;
 old_status:=s.academic_status;
 if old_status=p_status then raise exception 'Student already has this status'; end if;
 if not(case when old_status='ADMITTED' then p_status in('ENROLLED','WITHDRAWN') when old_status='ENROLLED' then p_status in('SUSPENDED','ON_LEAVE','WITHDRAWN','EXCLUDED','GRADUATED') when old_status in('SUSPENDED','ON_LEAVE') then p_status in('ENROLLED','WITHDRAWN','EXCLUDED') else false end) then raise exception 'Invalid student status transition: % -> %',old_status,p_status; end if;
 update public.academic_students set academic_status=p_status,updated_by=auth.uid() where id=s.id returning * into s;
 insert into public.academic_student_status_history(organization_id,student_id,from_status,to_status,reason,changed_by) values(s.organization_id,s.id,old_status,p_status,p_reason,auth.uid());
 return s; end $$;
grant execute on function public.academic_transition_student(uuid,public.academic_student_status,text) to authenticated;
insert into storage.buckets(id,name,public) values('academic-documents','academic-documents',false) on conflict(id) do nothing;
drop policy if exists "academic documents read" on storage.objects;
create policy "academic documents read" on storage.objects for select to authenticated using(bucket_id='academic-documents' and exists(select 1 from public.academic_applications a where a.id=(storage.foldername(name))[1]::uuid and(a.candidate_user_id=auth.uid() or public.academic_has_program_scope(a.organization_id,a.program_id,'application.read'))));
drop policy if exists "academic documents upload" on storage.objects;
create policy "academic documents upload" on storage.objects for insert to authenticated with check(bucket_id='academic-documents' and exists(select 1 from public.academic_applications a where a.id=(storage.foldername(name))[1]::uuid and(a.candidate_user_id=auth.uid() or public.academic_has_program_scope(a.organization_id,a.program_id,'application.manage'))));
comment on table public.academic_students is 'Institutional academic identity distinct from the authentication profile.';
comment on table public.academic_application_reviews is 'Append-only history of every application workflow transition.';
