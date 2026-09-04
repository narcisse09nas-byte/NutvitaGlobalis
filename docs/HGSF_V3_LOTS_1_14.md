# HGSF V3 — lots 1 à 14

Les migrations sont additives et doivent être exécutées dans cet ordre :

1. `supabase/ppm-ops-hgsf-wave1.sql`
2. `supabase/ppm-ops-hgsf-wave2-lots7-10.sql`
3. `supabase/ppm-ops-hgsf-wave3-lots11-13.sql`
4. `supabase/tests/ppm-ops-hgsf-wave1-3-smoke.sql`

La vague conserve les tables historiques et ajoute les scopes partenaires, groupes alimentaires, besoins journaliers, mouvements de stock, rapports journaliers âge-sexe, réceptions distinctes, rapprochement à trois éléments, paiements partiels, supervisions, recommandations, actions, documents, alertes et vues KPI.

Le test est transactionnel et termine par `rollback`. Il ne modifie aucune donnée métier.

Avant production, exécuter les migrations sur une copie de staging, vérifier les politiques RLS avec un compte école, partenaire, coopérative, superviseur et bailleur, puis comparer les totaux historiques des commandes, livraisons, rapports et factures.
