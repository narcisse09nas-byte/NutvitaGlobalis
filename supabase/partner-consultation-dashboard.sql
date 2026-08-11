-- Stable business identifiers and classification for nutrition consultations.
alter table public.partner_consultations add column if not exists consultation_code text;
alter table public.partner_consultations add column if not exists consultation_nature text not null default 'appointment';

alter table public.partner_consultations drop constraint if exists partner_consultations_nature_check;
alter table public.partner_consultations add constraint partner_consultations_nature_check
  check (consultation_nature in ('first_contact','appointment','other'));

create unique index if not exists partner_consultations_code_unique
  on public.partner_consultations(consultation_code)
  where consultation_code is not null;

create or replace function public.assign_partner_consultation_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare candidate text;
begin
  if new.consultation_code is not null then return new; end if;
  loop
    candidate := 'NVG' || upper(substr(md5(gen_random_uuid()::text), 1, 5));
    exit when not exists (select 1 from public.partner_consultations where consultation_code = candidate);
  end loop;
  new.consultation_code := candidate;
  return new;
end;
$$;

drop trigger if exists assign_partner_consultation_code on public.partner_consultations;
create trigger assign_partner_consultation_code before insert on public.partner_consultations
for each row execute function public.assign_partner_consultation_code();

do $$
declare item record;
begin
  for item in select id from public.partner_consultations where consultation_code is null loop
    update public.partner_consultations set consultation_code = 'NVG' || upper(substr(md5(item.id::text), 1, 5)) where id = item.id;
  end loop;
end $$;
