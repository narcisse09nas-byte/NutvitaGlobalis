-- Public contact inbox and marketing-oriented homepage solutions.
alter table public.homepage_settings add column if not exists whatsapp_group_url text;

create table if not exists public.external_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  subject text not null default 'Message externe',
  message text not null check (char_length(message) between 10 and 5000),
  source text not null default 'website',
  status text not null default 'new' check (status in ('new','read','replied','archived')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.external_messages enable row level security;
drop policy if exists "Public submit external messages" on public.external_messages;
drop policy if exists "Admins manage external messages" on public.external_messages;
create policy "Public submit external messages" on public.external_messages
for insert to anon, authenticated with check (true);
create policy "Admins manage external messages" on public.external_messages
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists set_updated_at on public.external_messages;
create trigger set_updated_at before update on public.external_messages
for each row execute function public.set_updated_at();

update public.homepage_settings set services = '[
 {"title":"Formations certifiantes","text":"Renforcez vos competences avec des parcours pratiques, certifiants et concus par des experts de la nutrition et de la sante."},
 {"title":"Teleconseils nutritionnels","text":"Accedez a distance a des professionnels qualifies pour obtenir une orientation personnalisee, confidentielle et adaptee a votre quotidien."},
 {"title":"Application de support a la prise en charge de la malnutrition aigue (Nutritrack)","text":"Digitalisez le depistage, l admission, le suivi clinique, les stocks et le reporting des programmes de prise en charge de la malnutrition aigue."},
 {"title":"Application de Support aux enquetes de securite alimentaire et nutrition.","text":"Concevez vos questionnaires, collectez des donnees fiables et transformez rapidement les resultats en analyses utiles a la decision."},
 {"title":"Application de support a la gestion des projets, programmes et portefeuilles","text":"Planifiez, coordonnez et pilotez vos projets, programmes et portefeuilles avec une vision claire des activites, ressources et resultats."},
 {"title":"Application de Suivi sante personnalise Pour enfants (suivi de la croissance) et adultes.","text":"Suivez la croissance des enfants et les indicateurs de sante des adultes grace a des outils simples, securises et adaptes a chaque parcours."}
]'::jsonb,
services_en = '[
 {"title":"Certified training","text":"Build practical skills through certification pathways designed by nutrition and health experts."},
 {"title":"Nutrition tele-counselling","text":"Connect remotely with qualified professionals for confidential guidance tailored to your daily needs."},
 {"title":"Acute malnutrition care support application (Nutritrack)","text":"Digitize screening, admission, clinical follow-up, stock management and reporting for acute malnutrition programmes."},
 {"title":"Food security and nutrition survey support application.","text":"Design questionnaires, collect reliable data and rapidly turn findings into decision-ready analysis."},
 {"title":"Project, programme and portfolio management support application","text":"Plan, coordinate and manage projects, programmes and portfolios with clear visibility over activities, resources and results."},
 {"title":"Personalized health monitoring application for children (growth monitoring) and adults.","text":"Monitor child growth and adult health indicators through secure, accessible tools tailored to each care journey."}
]'::jsonb
where id = 1;
