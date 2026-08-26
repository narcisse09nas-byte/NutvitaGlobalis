-- Accept heights entered either in metres (for example 1.80) or centimetres (180).
-- The database stores height_cm in centimetres and calculates BMI as kg / m².

create or replace function public.set_anthropometric_bmi()
returns trigger
language plpgsql
as $$
begin
  if new.height_cm is not null and new.height_cm > 0 and new.height_cm <= 3 then
    new.height_cm := new.height_cm * 100;
  end if;

  if new.weight_kg is not null and new.weight_kg > 0 and new.height_cm is not null and new.height_cm > 0 then
    new.bmi := round((new.weight_kg / power(new.height_cm / 100, 2))::numeric, 2);
  else
    new.bmi := null;
  end if;
  return new;
end;
$$;

drop trigger if exists anthropometric_bmi on public.anthropometric_measurements;
create trigger anthropometric_bmi
before insert or update of weight_kg, height_cm
on public.anthropometric_measurements
for each row execute function public.set_anthropometric_bmi();

-- Repair records previously saved with a height in metres inside height_cm.
update public.anthropometric_measurements
set height_cm = height_cm * 100
where height_cm > 0 and height_cm <= 3;

-- Recalculate every existing BMI using the normalized stored height.
update public.anthropometric_measurements
set bmi = round((weight_kg / power(height_cm / 100, 2))::numeric, 2)
where weight_kg is not null and weight_kg > 0 and height_cm is not null and height_cm > 0;