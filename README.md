# NutVitaGlobalis

Site Next.js 15, TypeScript et Tailwind CSS prêt pour Vercel.

## Administration locale sans Supabase

Le fichier `.env.local` active temporairement un mode admin local. Lancer :

```powershell
npm.cmd run dev
```

Puis ouvrir `http://localhost:3000/admin` avec les identifiants definis dans `.env.local` :

- email : `LOCAL_ADMIN_EMAILS` ;
- mot de passe : `LOCAL_ADMIN_PASSWORD`.

Les contenus de test sont conserves dans le `localStorage` du navigateur. Ce
mode sert au developpement uniquement : paiements, emails reels, fichiers et
donnees partagees exigent toujours Supabase et les services externes.

L'espace client local est accessible sur `http://localhost:3000/connexion` avec les identifiants definis dans `.env.local` :

- email : `LOCAL_CLIENT_EMAIL` ;
- mot de passe : `LOCAL_CLIENT_PASSWORD`.

Ce compte contient un abonnement actif, une formation, une consultation, un
paiement et des mesures de demonstration pour tester les graphiques.

Lors de la connexion a Supabase, renseigner ses variables dans `.env.local`,
executer les migrations documentees, puis definir
`NEXT_PUBLIC_LOCAL_ADMIN_MODE=false`. Changer ou supprimer ensuite le mot de
passe local.

## Administration Supabase

L’espace privé est disponible sur `/admin`. Il gère les articles, formations,
téléconseils, ressources premium, témoignages, réglages d’accueil et abonnés.

1. Créer un projet Supabase.
2. Ouvrir **SQL Editor**, puis exécuter tout le fichier `supabase/schema.sql`.
3. Dans **Authentication > Users**, créer l’utilisateur administrateur avec son email et son mot de passe.
4. Copier son UUID et exécuter dans SQL Editor :

```sql
insert into public.admin_users (id, email, full_name)
values ('UUID_DE_AUTH_USERS', 'admin@exemple.com', 'Administrateur');
```

5. Copier l’URL et la clé `Publishable` du dialogue **Connect** dans les variables d’environnement :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
```

Les règles RLS du schéma rendent publics uniquement les articles/formations/ressources
publiés, les téléconseils actifs et les témoignages visibles. Les écritures sont réservées
aux comptes présents et actifs dans `admin_users`.

## Module de recrutement

Après `supabase/schema.sql`, exécuter également `supabase/recruitment.sql` dans le SQL Editor.
Exécuter ensuite `supabase/recruitment-advanced.sql` pour la surveillance raisonnable,
les entretiens vidéo, la messagerie et les profils partenaires.
Cette migration crée :

- les profils et dossiers candidats ;
- les notifications et l’historique des décisions ;
- le test écrit, les tentatives uniques et la notation QCM sécurisée ;
- le bucket privé `recruitment-documents` et ses règles d’accès ;
- les politiques RLS séparant candidats et administrateurs.

Les espaces sont disponibles sur :

- `/recrutement-dieteticiens` pour la présentation publique ;
- `/candidat` pour l’inscription, le dossier et le test ;
- `/admin/recrutement` pour l’évaluation et la sélection.

Dans **Supabase > Authentication > URL Configuration**, ajouter l’URL du site Vercel
et `http://localhost:3000` aux URLs de redirection. La confirmation de création de compte
est envoyée par Supabase Auth. Personnaliser son modèle dans **Authentication > Email Templates**
et terminer le message par `Équipe NutVitaGlobalis`.

Les emails de soumission, dossier incomplet, présélection, invitation au test, entretien,
résultat et intégration utilisent la même configuration Resend que le formulaire de contact.

### Vidéo et surveillance

La première version utilise Jitsi dans une iframe. `NEXT_PUBLIC_JITSI_DOMAIN` permet de
remplacer `meet.jit.si` par une instance Jitsi dédiée. Les vidéos ne sont pas enregistrées.
Le test journalise uniquement les changements d’onglet et de connexion, après capture
consentie d’une photo. Le niveau de suspicion reste un indicateur soumis à validation humaine.

## Contrats electroniques et dossier nutritionnel

Apres les migrations existantes, executer `supabase/contracts-nutrition.sql`.
Cette migration ajoute le coffre documentaire prive, les contrats et signatures,
les profils clients et les historiques de sante.

- `/admin/contrats` : creation, envoi, signature et archivage ;
- `/candidat/contrats` : contrats des dieteticiens partenaires ;
- `/espace-client` : profil, dossier nutritionnel et consentements clients.

Ajouter la cle `service_role` aux variables serveur de Vercel :

```env
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxx
```

Cette cle ne doit jamais etre exposee dans une variable `NEXT_PUBLIC_*`.

## Suivi sante, analyses et abonnements

Executer ensuite `supabase/health-analytics.sql`. Cette migration ajoute les
offres, abonnements, paiements, analyses, alertes, rapports et journaux d'audit.
Apres `supabase/accounts-growth-admin.sql`, executer enfin
`supabase/health-subscriptions-upgrade.sql` pour activer les offres Basic et
Premium mensuelles, trimestrielles et annuelles.
Executer ensuite `supabase/commerce-payments.sql` pour activer le checkout
formations/consultations, les inscriptions, les reservations et les
notifications transactionnelles.
Executer enfin `supabase/billing-admin-upgrade.sql` pour ajouter les taxes par
type de service, les instantanes de factures, les journaux de webhooks, les
vues de compatibilite et les modeles d'emails transactionnels complementaires.

Les pages principales sont `/suivi-sante`, `/espace-client/tendances`,
`/espace-client/analyse` et `/espace-client/abonnement`.

Pour Stripe, creer un Price recurrent pour chaque offre puis renseigner
`subscription_plans.stripe_price_id`. Pour Flutterwave, creer les plans
correspondants puis renseigner `subscription_plans.flutterwave_plan_id`.
Configurer les webhooks suivants :

- Stripe : `/api/payments/webhook/stripe` avec `checkout.session.completed`,
  `checkout.session.expired` et `checkout.session.async_payment_failed` ;
- Flutterwave : `/api/payments/webhook/flutterwave` avec le secret `verif-hash`.

Les interfaces financieres sont disponibles sur `/admin/paiements`,
`/admin/factures`, `/admin/taxes` et `/admin/offres`. Les factures PDF sont
telechargeables depuis `/espace-client` avec une URL signee temporaire.

Pour les emails Supabase Auth (verification d'adresse et reinitialisation du
mot de passe), appliquer les modeles et URLs decrits dans
`supabase/auth-email-templates.md`. Les autres emails transactionnels sont
envoyes par Resend et journalises dans `system_email_logs`.

Les analyses actuelles utilisent `nvg-rules-v1`, un moteur explicable base sur
les tendances et seuils de vigilance. Il ne produit ni diagnostic ni decision
automatique. Les rapports PDF sont stockes dans le bucket prive `document-vault`.

## Comptes, taxes et croissance enfant

Executer `supabase/accounts-growth-admin.sql` apres les migrations precedentes.
Cette migration ajoute les localisations de comptes, les taux de taxe, les
roles administrateurs, les enfants, les mesures de croissance, les factures et
les modeles d'emails systeme.

- `/admin/taxes` configure les taux par pays et le fallback mondial ;
- `/admin/utilisateurs` gere les administrateurs et leurs roles ;
- `/admin/emails-systeme` gere les modeles et le journal d'envoi ;
- `/espace-client/croissance-enfant` gere les enfants et leurs abonnements.

Le suivi sante autonome et le suivi croissance enfant sont chacun configures a
10 000 FCFA HT pour douze mois, le second etant facture par enfant. Apres webhook valide,
l'acces est active pour la duree du plan, une facture PDF est archivee et un
email de confirmation est envoye.

Executer ensuite `supabase/child-growth-who-upgrade.sql` pour completer les
profils enfants, les observations de suivi et le moteur LMS de z-scores. Le
fichier `supabase/who-growth-standards-template.csv` decrit le format d'import;
seules les tables officielles OMS doivent etre chargees pour un usage clinique.
Executer enfin `supabase/child-growth-advanced.sql` pour activer les analyses
parentales, les alertes partagees avec l'administration, les conseils adaptes,
les emails critiques et les rapports PDF de croissance.
Executer ensuite `supabase/advanced-admin-security.sql` pour installer les cinq
roles administrateurs, les permissions, les historiques, les vues de
compatibilite et les protections du dernier super-admin. Les comptes Auth
`pauln.zebaze@gmail.com` et `contact@nutvitaglobalis.com` sont promus
automatiquement s'ils existent deja dans Supabase Authentication.

La gestion super-admin est disponible sur `/admin/utilisateurs-admin`.
Verifier le domaine `nutvitaglobalis.com` dans Resend et utiliser
`NutVitaGlobalis <contact@nutvitaglobalis.com>` comme expediteur.

Le premier administrateur existant devient automatiquement `super_admin` si
aucun super-administrateur n'existe. `/api/geo` utilise CountriesNow pour les
pays, subdivisions et villes, avec cache et fallback manuel local.

## Développement

```bash
npm install
npm run dev
```

## Configuration Vercel

Copier les variables de `.env.example` dans **Project Settings > Environment Variables**.

1. Créer une clé API et, si souhaité, un segment Newsletter dans Resend.
2. Vérifier le domaine d’envoi dans Resend.
3. Renseigner `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `MAIL_FROM` et éventuellement `RESEND_SEGMENT_ID`.
4. Renseigner le numéro WhatsApp au format international, chiffres uniquement et sans `+`.
5. Déployer avec `npm run build` comme commande de build.

Renseigner egalement `NEXT_PUBLIC_SITE_URL` avec l'URL publique exacte du site,
par exemple `https://nutvitaglobalis.com`, afin de produire des liens valides
dans les emails et les redirections de paiement.

## Paiements CinetPay et PayPal

Executer `supabase/cinetpay-paypal-payments.sql` apres les migrations de base
pour autoriser les fournisseurs `cinetpay` et `paypal`.

Variables serveur a renseigner dans Vercel :

```env
CINETPAY_API_KEY=xxxxxxxxx
CINETPAY_SITE_ID=000000
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=xxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxx
```

Configurer la notification CinetPay vers :

```text
https://www.nutvitaglobalis.com/api/payments/webhook/cinetpay
```

PayPal utilise l'API Orders et capture le paiement au retour client via
`/api/payments/paypal/capture`.

## Paiements manuels et CamPay

Executer `supabase/manual-payments.sql` apres `supabase/cinetpay-paypal-payments.sql`.
Cette migration ajoute les comptes de paiement prives, les preuves de paiement
et reserve `campay` comme fournisseur automatique futur.

Pendant la phase de lancement, les clients connectes peuvent choisir Mobile
Money manuel ou virement bancaire. Les coordonnees configurees dans
`/admin/paiements` ne sont affichees qu'apres creation d'une reference de
paiement privee. L'administration valide ensuite le paiement et active le
service correspondant.

Sans clé Resend, le site reste consultable mais les formulaires affichent une indisponibilité explicite.
