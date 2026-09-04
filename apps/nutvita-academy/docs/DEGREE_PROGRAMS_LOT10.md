# Degree Programs — Lot 10 (final)

## Objectif

Le dernier lot fournit les tableaux de bord étudiant, enseignant et institutionnel, ainsi que le reporting par programme. Les indicateurs sont calculés depuis les registres académiques et non depuis des données ressaisies.

## Livrables

- Migration 019 avec définitions, exécutions et lignes de métriques normalisées.
- Vues sécurisées academic_program_reporting_v et academic_student_dashboard_v.
- Instantanés auditables générés par RPC.
- Tableau /degree-programs/reporting avec filtre programme, KPI et comparaison.
- Tableau d'accueil adapté au rôle et strictement filtré par permissions.
- Test structurel et RLS 019.

## Déploiement

Exécuter 019_degree_programs_reporting_dashboards.sql après la migration 018, puis lancer 019_degree_programs_reporting_dashboards_test.sql dans une transaction de test.

Les exports CSV restent gérés par le registre existant. Les formats XLSX/PDF sont enregistrés comme demandes structurées et pourront être reliés à un worker documentaire sans modifier la source de vérité.
