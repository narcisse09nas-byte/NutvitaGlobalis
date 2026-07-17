# NutVitaGlobalis Academy

L'application Academy est importee dans `apps/nutvita-academy` et conserve son propre runtime Next.js 16. Elle est exposee sous le prefixe `/academy` afin de ne pas entrer en collision avec les routes du site principal.

## Developpement local

1. Installer ses dependances : `npm.cmd run install:academy`
2. Lancer Academy sur le port 3010 : `npm.cmd run dev:academy`
3. Ajouter `ACADEMY_ORIGIN=http://localhost:3010` dans `.env.local`
4. Lancer le site principal avec `npm.cmd run dev`

Les liens « Mes formations » utilisent alors `/academy/dashboard/courses`. Le site principal transmet toutes les routes `/academy/*` au serveur Academy.
Les ressources Next.js de cette zone utilisent le prefixe distinct `/academy-static` pour eviter les collisions avec celles du site principal.

## Acces unifie et catalogue

1. Executer `supabase/platform-unified-access.sql` dans le projet Supabase principal.
2. Executer `apps/nutvita-academy/supabase/migrations/008_unified_platform_access.sql` dans le meme projet.
3. Configurer le site principal et Academy avec la meme URL Supabase et la meme cle publique.
4. Definir `NEXT_PUBLIC_XOF_PER_USD` dans Academy pour convertir le prix du catalogue public.

Apres connexion, `/choisir-acces` demande d'abord le service puis l'espace autorise. Les deux comptes principaux disposent de tous les services et espaces sans achat. Lorsqu'un cours Academy est publie, sa fiche est synchronisee vers `formations` et devient visible dans le catalogue et sur l'accueil du site principal. Un cours remis en brouillon est retire de ces pages publiques.

## Production

Deployer `apps/nutvita-academy` comme second projet depuis le meme depot et definir `ACADEMY_ORIGIN` dans le projet principal avec son URL interne ou publique. La variable `NEXT_PUBLIC_SITE_URL` du projet Academy doit se terminer par `/academy`.
