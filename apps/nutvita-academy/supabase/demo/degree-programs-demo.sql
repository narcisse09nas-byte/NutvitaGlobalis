-- Opt-in demonstration dataset for Degree Programs.
-- Prerequisite: migrations 010-020 and at least three active STUDENT role assignments.
create or replace function public.academic_seed_degree_demo(p_organization_id uuid)
returns table(program_code text,student_records integer) language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();yr uuid;p record;v uuid;u uuid;student_count integer;begin
 if not public.academic_has_permission(p_organization_id,'academic.manage')then raise exception 'academic.manage required';end if;
 insert into public.academic_years(organization_id,label,start_date,end_date,status,created_by)values(p_organization_id,'2026-2027','2026-09-01','2027-07-31','ACTIVE',actor)on conflict(organization_id,label)do update set status='ACTIVE' returning id into yr;
 insert into public.academic_programs(organization_id,code,name_fr,name_en,level,degree_type,duration_years,duration_semesters,total_credits,language,status,created_by)values
 (p_organization_id,'DEMO-DUT','DUT démonstration','Demo Higher Technical Diploma','DUT','DUT',2,4,120,'FR_EN','ACTIVE',actor),
 (p_organization_id,'DEMO-LPRO','Licence professionnelle démonstration','Demo Professional Bachelor','LICENCE_PRO','LICENCE',1,2,60,'FR_EN','ACTIVE',actor),
 (p_organization_id,'DEMO-MPRO','Master professionnel démonstration','Demo Professional Master','MASTER_PRO','MASTER',2,4,120,'FR_EN','ACTIVE',actor)
 on conflict(organization_id,code)do update set status='ACTIVE';
 for p in select * from public.academic_programs where organization_id=p_organization_id and code::text like 'DEMO-%' loop
  insert into public.academic_program_versions(organization_id,program_id,version_number,effective_from,total_credits,status,approved_by,approval_date,notes_fr,notes_en,created_by)values(p_organization_id,p.id,1,'2026-09-01',p.total_credits,'APPROVED',actor,now(),'Version de démonstration','Demo version',actor)on conflict(program_id,version_number)do update set total_credits=excluded.total_credits returning id into v;
  insert into public.academic_semesters(organization_id,academic_year_id,program_id,program_version_id,semester_number,label_fr,label_en,start_date,end_date,status,created_by)values(p_organization_id,yr,p.id,v,1,'Semestre 1','Semester 1','2026-09-01','2027-01-31','ACTIVE',actor)on conflict(academic_year_id,program_version_id,semester_number)do update set status='ACTIVE';
  insert into public.academic_teaching_units(organization_id,program_version_id,code,name_fr,name_en,semester_number,credits,coefficient,unit_type,is_mandatory,minimum_pass_mark,status,created_by)values(p_organization_id,v,p.code::text||'-UE1','Fondamentaux','Foundations',1,30,1,'CORE',true,10,'ACTIVE',actor)on conflict(program_version_id,code)do update set status='ACTIVE' returning id into u;
  insert into public.academic_courses(organization_id,teaching_unit_id,code,name_fr,name_en,credits,coefficient,hours_lecture,hours_tutorial,hours_practical,hours_online,minimum_pass_mark,continuous_assessment_weight,final_exam_weight,status,created_by)values(p_organization_id,u,p.code::text||'-C1','Cours de démonstration','Demo course',30,1,30,10,10,5,10,40,60,'ACTIVE',actor)on conflict(teaching_unit_id,code)do update set status='ACTIVE';
  insert into public.academic_tuition_items(organization_id,program_id,academic_year_id,code,name_fr,name_en,amount,currency,mandatory,due_date,status,created_by)values(p_organization_id,p.id,yr,'TUITION','Frais de scolarité','Tuition fees',500000,'XAF',true,'2026-10-15','ACTIVE',actor)on conflict(program_id,academic_year_id,code)do nothing;
 end loop;
 with candidates as(select user_id,row_number()over(order by created_at)rn from public.academic_role_assignments where organization_id=p_organization_id and role='STUDENT'and active limit 3),programs as(select p.id program_id,v.id version_id,p.level::text level,row_number()over(order by p.code)rn from public.academic_programs p join public.academic_program_versions v on v.program_id=p.id and v.version_number=1 where p.organization_id=p_organization_id and p.code::text like'DEMO-%')
 insert into public.academic_students(organization_id,user_id,student_number,admission_year,current_program_id,current_program_version_id,current_level,current_semester,academic_status,registration_status,created_by)select p_organization_id,c.user_id,'DEMO-'||to_char(c.rn,'FM0000'),2026,p.program_id,p.version_id,p.level,1,'ENROLLED','REGISTERED',actor from candidates c join programs p using(rn)on conflict(organization_id,user_id,current_program_id)do nothing;
 select count(*)into student_count from public.academic_students where organization_id=p_organization_id and student_number like'DEMO-%';
 return query select p.code::text,student_count from public.academic_programs p where p.organization_id=p_organization_id and p.code::text like'DEMO-%'order by p.code;end$$;
revoke all on function public.academic_seed_degree_demo(uuid)from public;grant execute on function public.academic_seed_degree_demo(uuid)to authenticated;
-- Execute explicitly while authenticated as an academic administrator:
-- select * from public.academic_seed_degree_demo('YOUR-ORGANIZATION-UUID'::uuid);
