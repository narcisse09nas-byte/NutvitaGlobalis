# Integration du service FOSA

Le service FOSA reprend la structure fonctionnelle du projet
`narcisse09nas-byte/studio` dans l'architecture Next.js et Supabase de
NutVitaGlobalis.

## Acces

- La creation d'un compte est obligatoire.
- Le demandeur indique le nombre de formations sanitaires et de membres du personnel.
- Un administrateur NutVitaGlobalis approuve ou rejette la demande.
- Apres approbation, le demandeur devient administrateur de son organisation FOSA.

## Organisation

L'administrateur FOSA peut :

- creer les formations sanitaires de son organisation ;
- inviter des collaborateurs par email ;
- attribuer les roles `createur`, `verificateur`, `validateur` ou `administrateur FOSA` ;
- limiter chaque collaborateur a une ou plusieurs formations sanitaires ;
- suivre les enregistrements de son organisation.

Chaque collaborateur recoit un email Supabase lui permettant de definir son mot de
passe personnel. Le mot de passe provisoire ne doit pas etre reutilise.

## Modules

Les domaines fonctionnels issus de Studio sont exposes depuis `/fosa` :

- admissions ;
- enfants ;
- references entrantes et sortantes ;
- cas sous attention particuliere ;
- stock et produits ;
- supervision ;
- activites communautaires ;
- formations sanitaires ;
- cartographie communautaire ;
- agents de sante communautaire ;
- rapports.

La premiere version fournit le catalogue des modules, les droits par FOSA et le
workflow creation, verification et validation. Les ecrans metier specialises de
Studio pourront ensuite remplacer progressivement le formulaire d'enregistrement
generique sans modifier le modele d'acces.

## Installation

Executer `supabase/fosa-service.sql` dans l'editeur SQL Supabase avant de tester le
service. Le script cree les tables, fonctions, politiques RLS et modeles d'emails.

Executer ensuite `supabase/fosa-specialized-forms.sql`. Cette migration ajoute les
informations de programme des FOSA et l'index PostgreSQL utilise par les formulaires
specialises.

## Email de confirmation

Le formulaire FOSA genere maintenant un lien de confirmation Supabase puis l'envoie
avec Resend. Les variables suivantes doivent etre definies dans Vercel :

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`

`MAIL_FROM` doit utiliser un domaine verifie dans Resend. En cas d'echec d'envoi, le
compte incomplet est supprime afin que le demandeur puisse recommencer proprement.

## Absence de Firebase

Aucun module Firebase ou Firestore du projet Studio n'est copie. Les formulaires,
les donnees, les droits et les rapports reposent exclusivement sur Next.js,
Supabase Auth et PostgreSQL.
