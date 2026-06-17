-- Run after manual-payments.sql.
-- Service catalog cleanup and configurable written recruitment tests.

alter table public.recruitment_test_questions drop constraint if exists recruitment_test_questions_question_type_check;
alter table public.recruitment_test_questions
  add constraint recruitment_test_questions_question_type_check
  check(question_type in ('qcm','multi_qcm','open','case_study','file_upload'));

alter table public.recruitment_test_questions add column if not exists allow_external_window boolean not null default false;
alter table public.recruitment_test_questions add column if not exists file_instructions text;
alter table public.recruitment_test_questions add column if not exists max_files integer not null default 1;

create table if not exists public.recruitment_test_settings (
  id integer primary key default 1 check(id = 1),
  title text not null default 'Test ecrit NutVitaGlobalis',
  instructions text not null default 'Lisez attentivement chaque question avant de repondre.',
  available_from timestamptz,
  available_until timestamptz,
  duration_minutes integer not null default 60 check(duration_minutes between 5 and 240),
  camera_required boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.recruitment_test_settings(id) values(1) on conflict(id) do nothing;

alter table public.recruitment_test_settings enable row level security;
drop policy if exists "Admins manage recruitment test settings" on public.recruitment_test_settings;
create policy "Admins manage recruitment test settings" on public.recruitment_test_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Candidates read active recruitment test settings" on public.recruitment_test_settings;
create policy "Candidates read active recruitment test settings" on public.recruitment_test_settings for select to authenticated using(active = true or public.is_admin());

create or replace function public.start_recruitment_test() returns jsonb language plpgsql security definer set search_path=public as $$
declare app public.recruitment_applications; attempt public.recruitment_test_attempts; settings public.recruitment_test_settings;
begin
  select * into app from public.recruitment_applications where candidate_id=(select auth.uid());
  if app.id is null or app.status <> 'invited_to_test' then raise exception 'Vous n etes pas invite a ce test.'; end if;
  select * into settings from public.recruitment_test_settings where id=1;
  if settings.active is false then raise exception 'Le test ecrit n est pas encore actif.'; end if;
  if settings.available_from is not null and now() < settings.available_from then raise exception 'La periode du test n est pas encore ouverte.'; end if;
  if settings.available_until is not null and now() > settings.available_until then raise exception 'La periode du test est terminee.'; end if;
  select * into attempt from public.recruitment_test_attempts where application_id=app.id;
  if attempt.id is null then
    insert into public.recruitment_test_attempts(application_id,candidate_id,expires_at)
    values(app.id,(select auth.uid()),now() + make_interval(mins => settings.duration_minutes)) returning * into attempt;
  end if;
  return jsonb_build_object(
    'attempt_id',attempt.id,
    'expires_at',attempt.expires_at,
    'status',attempt.status,
    'answers',attempt.answers,
    'settings',jsonb_build_object('title',settings.title,'instructions',settings.instructions,'duration_minutes',settings.duration_minutes,'camera_required',settings.camera_required,'available_until',settings.available_until),
    'questions',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'category',q.category,'type',q.question_type,'prompt',q.prompt,'options',q.options,'points',q.points,'allow_external_window',q.allow_external_window,'file_instructions',q.file_instructions,'max_files',q.max_files) order by q.position),'[]') from public.recruitment_test_questions q where q.active)
  );
end $$;

create or replace function public.submit_recruitment_test() returns numeric language plpgsql security definer set search_path=public as $$
declare earned numeric:=0; total numeric:=0; score numeric:=0; att public.recruitment_test_attempts;
begin
  select * into att from public.recruitment_test_attempts where candidate_id=(select auth.uid()) for update;
  if att.id is null or att.status<>'in_progress' then raise exception 'Aucun test actif.'; end if;
  select coalesce(sum(q.points),0) into total
  from public.recruitment_test_questions q
  where q.active and q.question_type='qcm';
  select coalesce(sum(q.points),0) into earned
  from public.recruitment_test_questions q
  where q.active
    and q.question_type='qcm'
    and att.answers->>q.id::text=q.correct_answer;
  if total > 0 then
    score := round((earned / total) * 100, 2);
  end if;
  update public.recruitment_test_attempts set automatic_score=score,submitted_at=now(),status=case when expires_at<now() then 'expired' else 'submitted' end where id=att.id;
  update public.recruitment_applications set status='test_completed' where id=att.application_id;
  insert into public.recruitment_history(application_id,actor_id,action,from_status,to_status) values(att.application_id,(select auth.uid()),'Test ecrit termine','invited_to_test','test_completed');
  return score;
end $$;

update public.subscription_plans set active=false where service_type in ('health_tracking','child_growth');

insert into public.subscription_plans(id,name,tier,billing_period,amount,currency,features,active,service_type,duration_months,price_excluding_tax)
values
('health-autonomous-yearly','Suivi sante autonome','basic','yearly',10000,'XOF','["Tableau de bord de suivi","Visualisation automatique de la progression","Analyses informatives","Rapports et recommandations"]',true,'health_tracking',12,10000),
('health-autonomous-premium-yearly','Suivi sante autonome premium','premium','yearly',15000,'XOF','["Tout le suivi autonome","Echange avec un teleconseiller une fois par trimestre","Acces aux articles premium","Rapports et recommandations prioritaires"]',true,'health_tracking',12,15000),
('child-growth-yearly','Suivi croissance enfant','basic','yearly',10000,'XOF','["Courbes de croissance","Historique des mesures","Analyses informatives","Conseils aux parents"]',true,'child_growth',12,10000),
('child-growth-premium-yearly','Suivi croissance enfant premium','premium','yearly',15000,'XOF','["Tout le suivi croissance","Echange avec un teleconseiller une fois par trimestre","Acces aux articles premium","Rapports et recommandations prioritaires"]',true,'child_growth',12,15000)
on conflict(id) do update set
  name=excluded.name,tier=excluded.tier,billing_period=excluded.billing_period,
  amount=excluded.amount,currency=excluded.currency,features=excluded.features,
  active=true,service_type=excluded.service_type,duration_months=excluded.duration_months,
  price_excluding_tax=excluded.price_excluding_tax;
