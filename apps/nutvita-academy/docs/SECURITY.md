# Sécurité

## Principes appliqués

- secrets serveur séparés des variables publiques ;
- vérification utilisateur avec `getUser()` ;
- Row Level Security ;
- accès tenant par `organization_id` ;
- service role réservé au serveur ;
- journaux structurés ;
- en-têtes HTTP de sécurité ;
- CI avant déploiement.

## À ne jamais faire

- exposer `SUPABASE_SERVICE_ROLE_KEY` au navigateur ;
- désactiver RLS en production ;
- faire confiance au rôle fourni par le client ;
- stocker des mots de passe dans `localStorage` ;
- créer une table métier sans politique RLS ;
- mettre les secrets dans Git.

## Recommandations supplémentaires

- activer MFA pour les administrateurs ;
- limiter les tentatives de connexion ;
- surveiller les erreurs 401/403/500 ;
- mettre en place une politique de sauvegarde ;
- auditer les rôles chaque trimestre ;
- tester les politiques RLS avec plusieurs utilisateurs.
