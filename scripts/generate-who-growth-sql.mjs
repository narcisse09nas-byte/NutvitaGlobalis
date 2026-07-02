import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const root = path.resolve("supabase/who-official");
const output = path.resolve("supabase/who-growth-standards-official.sql");
const source = "WHO Child Growth Standards 2006 official LMS tables";

function rows(file) {
  const workbook = XLSX.readFile(path.join(root, file));
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
}

function number(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric value: ${value}`);
  return parsed;
}

const values = [];
const addAge = (indicator, sex, row) => values.push([
  indicator, sex, number(row.Month), null, "not_applicable",
  number(row.L), number(row.M ?? row["M       "]), number(row.S), source,
]);
const addHeight = (sex, method, row) => values.push([
  "weight_for_height", sex, null, number(row.Length ?? row.Height), method,
  number(row.L), number(row.M), number(row.S), source,
]);

for (const [sex, suffix] of [["female", "girls"], ["male", "boys"]]) {
  rows(`wfa_${suffix}.xlsx`).forEach(row => addAge("weight_for_age", sex, row));
  rows(`lhfa_${suffix}_0_2.xlsx`).filter(row => Number(row.Month) < 24).forEach(row => addAge("height_for_age", sex, row));
  rows(`lhfa_${suffix}_2_5.xlsx`).forEach(row => addAge("height_for_age", sex, row));
  rows(`wfl_${suffix}.xlsx`).forEach(row => addHeight(sex, "recumbent_length", row));
  rows(`wfh_${suffix}.xlsx`).forEach(row => addHeight(sex, "standing_height", row));
}

const literal = value => value === null ? "null" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const tuples = values.map(row => `  (${row.map(literal).join(",")})`).join(",\n");
const sql = `-- Generated from the official WHO Child Growth Standards Excel tables.
-- Source: https://www.who.int/tools/child-growth-standards/standards/
-- Regenerate with: node scripts/generate-who-growth-sql.mjs

alter table public.child_growth_measurements
  add column if not exists measurement_method text;
alter table public.who_growth_standards
  add column if not exists measurement_method text not null default 'not_applicable';

alter table public.child_growth_measurements
  drop constraint if exists child_growth_measurements_measurement_method_check;
alter table public.child_growth_measurements
  add constraint child_growth_measurements_measurement_method_check
  check(measurement_method is null or measurement_method in ('recumbent_length','standing_height'));
alter table public.who_growth_standards
  drop constraint if exists who_growth_standards_measurement_method_check;
alter table public.who_growth_standards
  add constraint who_growth_standards_measurement_method_check
  check(measurement_method in ('not_applicable','recumbent_length','standing_height'));

drop index if exists public.who_growth_height_reference;
create unique index if not exists who_growth_height_reference
  on public.who_growth_standards(indicator,sex,measurement_method,length_height_cm)
  where length_height_cm is not null;

delete from public.who_growth_standards where source_version=${literal(source)};
insert into public.who_growth_standards(
  indicator,sex,age_months,length_height_cm,measurement_method,l,m,s,source_version
) values
${tuples};

create or replace function public.prepare_child_growth_measurement()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  child_record public.children%rowtype;
  reference_record public.who_growth_standards%rowtype;
  lowest_z numeric;
begin
  select * into child_record from public.children where id=new.child_id;
  new.age_months := round((extract(epoch from (new.measured_at - child_record.birth_date::timestamptz))/2629800)::numeric,2);
  new.measurement_method := coalesce(new.measurement_method,case when new.age_months < 24 then 'recumbent_length' else 'standing_height' end);
  if new.weight_kg > 0 and new.height_cm > 0 then
    new.bmi := round((new.weight_kg / power(new.height_cm / 100,2))::numeric,2);
  end if;
  if child_record.sex in ('female','male') then
    select * into reference_record from public.who_growth_standards where indicator='weight_for_age' and sex=child_record.sex and age_months is not null order by abs(age_months-new.age_months) limit 1;
    if found then new.weight_for_age_z := round(public.lms_z_score(new.weight_kg,reference_record.l,reference_record.m,reference_record.s),3); end if;
    select * into reference_record from public.who_growth_standards where indicator='height_for_age' and sex=child_record.sex and age_months is not null order by abs(age_months-new.age_months) limit 1;
    if found then new.height_for_age_z := round(public.lms_z_score(new.height_cm,reference_record.l,reference_record.m,reference_record.s),3); end if;
    select * into reference_record from public.who_growth_standards where indicator='bmi_for_age' and sex=child_record.sex and age_months is not null order by abs(age_months-new.age_months) limit 1;
    if found then new.bmi_for_age_z := round(public.lms_z_score(new.bmi,reference_record.l,reference_record.m,reference_record.s),3); end if;
    select * into reference_record from public.who_growth_standards where indicator='head_circumference_for_age' and sex=child_record.sex and age_months is not null order by abs(age_months-new.age_months) limit 1;
    if found then new.head_circumference_for_age_z := round(public.lms_z_score(new.head_circumference_cm,reference_record.l,reference_record.m,reference_record.s),3); end if;
    select * into reference_record from public.who_growth_standards where indicator='weight_for_height' and sex=child_record.sex and measurement_method=new.measurement_method and length_height_cm is not null order by abs(length_height_cm-new.height_cm) limit 1;
    if found then new.weight_for_height_z := round(public.lms_z_score(new.weight_kg,reference_record.l,reference_record.m,reference_record.s),3); end if;
  end if;
  select min(value) into lowest_z from unnest(array[new.weight_for_age_z,new.height_for_age_z,new.weight_for_height_z,new.bmi_for_age_z]) value;
  if new.edema or (new.age_months between 6 and 59 and new.muac_cm < 11.5) or lowest_z < -3 then
    new.risk_category := 'high'; new.interpretation := 'Risque eleve - evaluation professionnelle rapide recommandee';
  elsif (new.age_months between 6 and 59 and new.muac_cm < 12.5) or lowest_z < -2 then
    new.risk_category := 'moderate'; new.interpretation := 'Vigilance nutritionnelle - avis professionnel recommande';
  elsif lowest_z is null then
    new.risk_category := 'unclassified'; new.interpretation := 'Donnees insuffisantes pour la classification OMS';
  else
    new.risk_category := 'usual'; new.interpretation := 'Mesure dans la zone de suivi habituelle';
  end if;
  return new;
end $$;

update public.child_growth_measurements
set measured_at=measured_at
where weight_kg is not null and height_cm is not null;

notify pgrst, 'reload schema';
`;

fs.writeFileSync(output, sql);
console.log(`Generated ${output} with ${values.length} official WHO LMS rows.`);
