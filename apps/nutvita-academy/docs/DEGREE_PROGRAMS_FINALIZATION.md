# Degree Programs — Finalization lots 11 and 12

Lot 11 closes the remaining structured registries: academic student finance, tuition, charges, payments, allocations, competencies and portfolio. The payment-allocation trigger blocks over-allocation and cross-account allocation.

Lot 12 provides an opt-in demo seeder and a cross-module acceptance test. It creates DEMO-DUT, DEMO-LPRO and DEMO-MPRO catalogs. It only attaches student records to existing active STUDENT accounts; it never creates auth users.

## Ordre complet de reprise à partir du lot 8

Ne pas commencer par `018a` ou `019` : `academic_internships` et `academic_theses` sont créées par la migration 017.

1. `017_degree_programs_internships_theses.sql`
2. `018_degree_programs_juries_graduation.sql`
3. `018a_degree_programs_lot9_function_permissions_fix.sql`
4. `018_degree_programs_juries_graduation_test.sql`
5. `019_degree_programs_reporting_dashboards.sql`
6. `019_degree_programs_reporting_dashboards_test.sql`
7. `020_degree_programs_finance_competencies.sql`
8. `020_degree_programs_finance_competencies_test.sql`
9. `021_degree_programs_final_acceptance_test.sql`

Exécuter chaque fichier séparément. Les scripts de test se terminent par un rollback et ne remplacent jamais leur migration correspondante. Le jeu `degree-programs-demo.sql` reste facultatif et vient seulement après les migrations réussies.
