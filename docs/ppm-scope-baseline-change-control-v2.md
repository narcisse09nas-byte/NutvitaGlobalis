# Scope Baseline & Change Control V2

## Migration obligatoire

Exécuter dans Supabase SQL Editor :

`supabase/ppm-scope-baseline-change-control-v2.sql`

La migration est idempotente et doit être exécutée après `ppm-wbs-baseline-change.sql` et `ppm-project-cadrage.sql`.

## Workflow

1. La demande de changement suit `draft → submitted → impact_assessed → approved`.
2. À l’approbation, Supabase attribue automatiquement un ID métier `CR-000001`.
3. Depuis une baseline verrouillée, **Nouvelle version (via Change Request)** exige une demande approuvée non utilisée.
4. Le parcours guidé ouvre successivement :
   - Périmètre du projet ;
   - WBS ;
   - Dictionnaire WBS.
5. Chaque écriture référence la demande approuvée.
6. Le Dictionnaire soumet la baseline en revue.
7. Le workflow existant fait passer la baseline de `review` à `approved`, puis à `baseline`.
8. Au verrouillage, les snapshots du Périmètre, du WBS et du Dictionnaire sont conservés.
9. Le bouton **Mise en œuvre** de la demande devient actif uniquement quand la baseline liée est verrouillée.

## Verrous

Les verrous sont appliqués dans l’interface et par triggers PostgreSQL. Une modification directe via API est refusée si la dernière baseline n’est pas au statut `draft`. Une demande ne peut pas passer à `implemented` sans baseline liée et verrouillée.

## Personnel

Le champ **Demandé par** propose uniquement les ressources humaines ou consultants actifs rattachés au projet. La saisie libre a été supprimée.