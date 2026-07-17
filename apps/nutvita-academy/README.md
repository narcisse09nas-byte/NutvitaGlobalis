# NutVitaGlobalis Academy — Lot 25 Production

## Flux serveur activés

- Flutterwave Standard crée une commande `pending` côté serveur.
- Le webhook signé vérifie ensuite la transaction auprès de Flutterwave.
- Une transaction PostgreSQL marque la commande payée et crée les inscriptions.
- Studio, catalogue et Marketplace partagent les tables `courses` et `enrollments`.
- Les classes Jitsi utilisent les sessions, inscriptions, présences et messages Supabase Realtime.
- Les certificats publiés sont vérifiables sans connexion via `/verify/[certificateId]`.

Webhook Flutterwave à déclarer :

```text
https://votre-domaine/api/payments/flutterwave/webhook
```

Ce lot prépare le passage du mode local vers une architecture de production :

- Supabase Auth ;
- PostgreSQL ;
- Row Level Security ;
- organisations multi-tenant ;
- profils, membres, formations et inscriptions ;
- stockage des certificats ;
- clients Supabase navigateur et serveur ;
- Proxy Next.js 16 ;
- route de santé ;
- journalisation structurée ;
- en-têtes de sécurité ;
- CI GitHub Actions ;
- configuration Vercel ;
- procédure de déploiement.

## 1. Installer les dépendances

À la racine de `nutvita-academy` :

```powershell
npm install @supabase/supabase-js @supabase/ssr
npm install -D prettier
```

## 2. Variables d’environnement

Copiez :

```text
.env.example
```

vers :

```text
.env.local
```

Puis renseignez les valeurs Supabase.

Ne placez jamais `SUPABASE_SERVICE_ROLE_KEY` dans une variable commençant par `NEXT_PUBLIC_`.

## 3. Créer la base Supabase

Dans Supabase SQL Editor, exécutez dans cet ordre :

```text
supabase/migrations/001_extensions.sql
supabase/migrations/002_core_schema.sql
supabase/migrations/003_rls.sql
supabase/migrations/004_functions.sql
supabase/migrations/005_storage.sql
supabase/migrations/006_commerce_live_certification.sql
supabase/migrations/007_ai_identity_proctoring.sql
supabase/seed.sql
```

## 4. Fichiers à intégrer

Copiez les dossiers du paquet à la racine du projet.

Le fichier :

```text
proxy.ts
```

est prévu pour Next.js 16.

## 5. Vérification locale

```powershell
Ctrl + C
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

Testez :

```text
http://localhost:3000/api/health
http://localhost:3000/auth/sign-in
http://localhost:3000/auth/sign-up
```

## 6. Déploiement Vercel

Ajoutez dans Vercel :

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
FLW_SECRET_KEY
FLW_WEBHOOK_SECRET
NEXT_PUBLIC_SITE_URL
APP_ENV
PROCTORING_IDENTITY_PROVIDER
PROCTORING_IDENTITY_THRESHOLD
PROCTORING_AUTO_ADMIT
DIDIT_API_KEY
DIDIT_WORKFLOW_ID
DIDIT_WEBHOOK_SECRET
```

Puis déployez.

## Moteur IA de contrôle d’identité

Le moteur NutVita orchestre le score, l’admission au contrôle technique et les alertes de surveillance. En mode local, il surveille les événements du navigateur mais conserve la vérification d’identité en revue humaine : il ne fabrique jamais de score biométrique.

Après application de `007_ai_identity_proctoring.sql`, le cockpit examinateur appelle `/api/proctoring/readiness` et affiche automatiquement les services ou secrets manquants. Pour activer l’automatisation :

1. créer un compte Didit et un workflow `ID Verification + Liveness + Face Match` ;
2. définir `PROCTORING_IDENTITY_PROVIDER=didit` ;
3. renseigner `DIDIT_API_KEY` et `DIDIT_WORKFLOW_ID` ;
4. configurer le webhook `/api/proctoring/identity/didit-webhook` et renseigner `DIDIT_WEBHOOK_SECRET` ;
5. conserver une politique de consentement, d’audit et de rétention limitée des preuves.

Le webhook signé Didit normalise les résultats du fournisseur. Une admission automatique à la barrière d’identité exige que l’authenticité du document, la comparaison faciale, la preuve de vie, la validité et la concordance du profil dépassent les règles configurées. Tout résultat défavorable passe en revue humaine.

## Limite importante

Ce lot fournit le socle de production et les primitives serveur.
Il ne remplace pas automatiquement tous les anciens providers `localStorage`.
La migration fonctionnelle doit se faire module par module afin d’éviter une régression globale.
