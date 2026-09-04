# Lot 6 — Évaluations et notes académiques

## Objectif

Le lot 6 introduit un moteur académique séparé du moteur de certification. Il gère les évaluations, les tentatives, les notes brutes et normalisées, la modération, l’approbation, la publication et les corrections officielles.

## Migration

Exécuter après la migration 014 :

supabase/migrations/015_degree_programs_assessments_grades.sql

Puis exécuter le test contractuel :

supabase/tests/015_degree_programs_assessments_grades_test.sql

## Registres structurés

- academic_assessments : calendrier, barème, pondération, modalité et rattrapage ;
- academic_assessment_attempts : une ligne par tentative étudiante ;
- academic_grades : source officielle des notes ;
- academic_grade_history : historique immuable des valeurs et statuts.

## Workflows

Évaluation :

DRAFT → SCHEDULED → OPEN → CLOSED → ARCHIVED

Une évaluation peut aussi être annulée selon les transitions autorisées.

Note :

DRAFT → SUBMITTED → MODERATED → APPROVED → PUBLISHED

Les notes APPROVED et PUBLISHED sont verrouillées. Une correction nécessite la permission grade.correct, un motif détaillé, puis renvoie la note à SUBMITTED pour une nouvelle modération, approbation et publication.

## Calcul

La fonction academic_normalize_score calcule exclusivement :

note_normalisée = note_brute / barème_maximum × 100

Le déclencheur de base impose le barème de l’évaluation et rejette les valeurs hors limites. L’IA n’intervient jamais dans une note officielle.

## Sécurité

- étudiant : uniquement ses propres notes PUBLISHED ;
- enseignant : évaluations et étudiants de ses cours affectés ;
- coordonnateur : modération dans son périmètre ;
- responsable de programme : approbation dans son périmètre ;
- administration académique : publication et correction autorisée ;
- aucune suppression directe des notes ou de leur historique ;
- les fonctions SECURITY DEFINER sensibles ne sont pas exécutables par PUBLIC.

## Interfaces

- /degree-programs/assessments
- /degree-programs/my-assessments
- /degree-programs/grades
- /degree-programs/my-grades
- onglet Notes / Grades de la fiche étudiant 360°