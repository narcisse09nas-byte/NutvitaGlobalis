# Migration localStorage vers Supabase

Procéder module par module.

## Ordre recommandé

1. Authentification
2. Profils
3. Organisations et membres
4. Catalogue des cours
5. Inscriptions
6. Progression
7. Quiz et examens
8. Certificats
9. Marketplace
10. Classes virtuelles
11. Notifications
12. IA

## Stratégie

Pour chaque module :

1. créer les tables ;
2. écrire les politiques RLS ;
3. créer un repository Supabase ;
4. conserver temporairement l’ancien provider local ;
5. ajouter un adaptateur ;
6. migrer les données de test ;
7. vérifier les parcours ;
8. désactiver le stockage local du module ;
9. supprimer l’ancien code seulement après validation.

Ne remplacez pas tous les providers en une seule opération.
