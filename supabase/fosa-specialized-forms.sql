-- Run after fosa-service.sql.
-- Extends FOSA facilities and supports the specialized Studio forms stored in fosa_records.payload.

alter table public.fosa_facilities add column if not exists hq_global text;
alter table public.fosa_facilities add column if not exists subdivision text;
alter table public.fosa_facilities add column if not exists programs text[] not null default '{}';
alter table public.fosa_facilities add column if not exists child_counter integer not null default 0;

create index if not exists fosa_records_payload_gin on public.fosa_records using gin(payload);

insert into public.system_email_templates(id,name,subject,body_text) values
('fosa_email_confirmation','Confirmation du compte FOSA','Confirmez votre compte FOSA NutVitaGlobalis','Bonjour {{name}},\n\nVotre compte FOSA a ete cree. Confirmez votre adresse email pour transmettre votre demande a NutVitaGlobalis.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis')
on conflict(id) do update set name=excluded.name,subject=excluded.subject,body_text=excluded.body_text;
