# Déploiement

## Supabase

1. Créer un projet.
2. Exécuter les migrations SQL.
3. Configurer l’URL de redirection Auth :
   - local : `http://localhost:3000/auth/callback`
   - production : `https://votre-domaine/auth/callback`
4. Vérifier les politiques RLS.
5. Tester avec deux comptes distincts.

## Vercel

1. Importer le dépôt GitHub.
2. Configurer les variables d’environnement.
3. Déployer.
4. Associer le domaine.
5. Vérifier `/api/health`.

## Contrôles avant mise en ligne

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- création de compte ;
- confirmation email ;
- connexion ;
- déconnexion ;
- accès dashboard ;
- création organisation ;
- contrôle RLS ;
- test sur mobile ;
- test de restauration de sauvegarde.
