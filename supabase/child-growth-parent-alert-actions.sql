-- Actions du parent sur ses propres alertes de croissance.
alter table public.child_growth_alerts add column if not exists parent_comment text;
alter table public.child_growth_alerts add column if not exists parent_commented_at timestamptz;
alter table public.child_growth_alerts add column if not exists consultation_requested_at timestamptz;

drop policy if exists "Parents update own child growth alerts" on public.child_growth_alerts;
create policy "Parents update own child growth alerts" on public.child_growth_alerts
for update to authenticated
using (exists(select 1 from public.children c where c.id=child_growth_alerts.child_id and c.parent_id=auth.uid()))
with check (exists(select 1 from public.children c where c.id=child_growth_alerts.child_id and c.parent_id=auth.uid()));
