-- Hotfix Lot 9: remove PostgreSQL's default PUBLIC EXECUTE grants.
-- Run once after 018_degree_programs_juries_graduation.sql.
revoke all on function public.academic_set_lot9_numbers() from public;
revoke all on function public.academic_evaluate_graduation_eligibility(uuid,uuid,text) from public;
revoke all on function public.academic_transition_jury(uuid,public.academic_jury_status,text) from public;
revoke all on function public.academic_record_jury_minutes(uuid,text,text) from public;
revoke all on function public.academic_sign_jury_membership(uuid,boolean,boolean,text) from public;
revoke all on function public.academic_approve_jury_decision(uuid,text) from public;
revoke all on function public.academic_generate_transcript(uuid,uuid,uuid,text) from public;
revoke all on function public.academic_publish_transcript(uuid,text,text) from public;
revoke all on function public.academic_issue_degree(uuid,text,text) from public;
revoke all on function public.academic_verify_official_document(text) from public;

grant execute on function public.academic_evaluate_graduation_eligibility(uuid,uuid,text) to authenticated;
grant execute on function public.academic_transition_jury(uuid,public.academic_jury_status,text) to authenticated;
grant execute on function public.academic_record_jury_minutes(uuid,text,text) to authenticated;
grant execute on function public.academic_sign_jury_membership(uuid,boolean,boolean,text) to authenticated;
grant execute on function public.academic_approve_jury_decision(uuid,text) to authenticated;
grant execute on function public.academic_generate_transcript(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.academic_publish_transcript(uuid,text,text) to authenticated;
grant execute on function public.academic_issue_degree(uuid,text,text) to authenticated;
grant execute on function public.academic_verify_official_document(text) to anon,authenticated;
