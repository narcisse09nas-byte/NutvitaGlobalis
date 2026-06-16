# Modeles Supabase Auth NutVitaGlobalis

Dans Supabase > Authentication > Email Templates, utiliser l'identite visuelle
NutVitaGlobalis pour les modeles `Confirm signup` et `Reset password`.

Les liens doivent conserver `{{ .ConfirmationURL }}`. Le message doit inclure :

- logo texte NutVitaGlobalis sur fond vert ;
- bouton orange ou vert vers `{{ .ConfirmationURL }}` ;
- mention de securite indiquant d'ignorer l'email si la demande n'a pas ete faite ;
- signature `Equipe NutVitaGlobalis`.

Configurer `NEXT_PUBLIC_SITE_URL` et ajouter les URLs suivantes dans la liste des
redirect URLs Supabase :

- `http://localhost:3000/auth/callback`
- `https://votre-domaine.vercel.app/auth/callback`
