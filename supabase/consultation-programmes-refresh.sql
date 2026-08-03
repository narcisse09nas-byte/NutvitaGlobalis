-- Refresh public consultation programme names without changing administrator-managed prices.
-- Safe to run after multilingual-fr-en.sql and services-and-recruitment-adjustments.sql.
update public.teleconseils set
  name='Nutrition/alimentation pendant la grossesse',
  name_en='Nutrition and healthy eating during pregnancy',
  description='Un accompagnement nutritionnel adapté à chaque étape de la grossesse.',
  description_en='Nutrition support tailored to every stage of pregnancy.'
where lower(name) like '%femme enceinte%' or lower(name) like '%grossesse%';

update public.teleconseils set
  name='Diabète, Hypertension, Dyslipidémie / Syndrome métabolique',
  name_en='Diabetes, Hypertension, Dyslipidemia / Metabolic Syndrome',
  description='Une stratégie alimentaire coordonnée avec votre situation clinique et vos traitements.',
  description_en='A nutrition strategy coordinated with your clinical situation and treatment.'
where lower(name) like '%diab%';

update public.teleconseils set
  name_en=coalesce(nullif(name_en,''),'Infant nutrition'),
  description_en=coalesce(nullif(description_en,''),'Personalized guidance to support child growth and nutrition.')
where lower(name) like '%infant%';

update public.teleconseils set
  name_en=coalesce(nullif(name_en,''),'Weight management'),
  description_en=coalesce(nullif(description_en,''),'A realistic, progressive pathway towards lasting balance.')
where lower(name) like '%poids%';

insert into public.teleconseils(name,name_en,description,description_en,price,duration,target_audience,target_audience_en,status,featured)
select 'Nutrition sportive','Sports nutrition','Optimisez vos performances, votre récupération et votre composition corporelle.','Optimize performance, recovery and body composition.',15000,'3 mois','Sportifs amateurs et professionnels.','Amateur and professional athletes.','active',true
where not exists(select 1 from public.teleconseils where lower(name) like '%sport%');
