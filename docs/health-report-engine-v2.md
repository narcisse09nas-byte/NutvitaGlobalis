# Moteur de rapports de suivi santé v2

## Déploiement

1. Exécuter `supabase/health-report-engine-v2.sql` dans Supabase après les migrations santé et espaces de soins.
2. Déployer l’application.
3. Vérifier les trois exports depuis **Espace client > Analyses et rapports** : Résumé santé, Rapport patient, Rapport professionnel.
4. Vérifier un export professionnel depuis l’espace nutritionniste avec un consentement `premium_health_record` actif.

Aucune nouvelle variable d’environnement n’est nécessaire.

## Architecture livrée

- `lib/health-report/types.ts` : contrat commun des trois restitutions.
- `lib/health-report/indicator-registry.ts` : mapping strict indicateur/source/champ/unité/règle/référence/graphique.
- `lib/health-report/engine.ts` : profil, validation, calculs longitudinaux, direction, signification clinique, tendance, confiance, qualité, alertes, objectifs et traces.
- `lib/health-report/__tests__/engine.test.ts` : scénarios métier et non-régression clinique.
- `supabase/health-report-engine-v2.sql` : références, règles, traces, cycles d’objectifs, évaluations et versionnement.

## Comparaison ancien / nouveau

| Critère | Ancien moteur | Moteur v2 |
|---|---|---|
| Mapping | Ressemblance textuelle des libellés | Identifiant strict du registre |
| Poids | Baisse automatiquement favorable | Direction séparée de la signification clinique |
| Longitudinal | Première/dernière, parfois deux points appelés tendance | Baseline, précédente, actuelle; initiale/variation/tendance |
| Confiance | Score heuristique isolé | high/moderate/low/insufficient traçable |
| Scores bien-être | Mélange 1–5 et 0–100 | Restitution catégorielle 0–4, source 0–100 conservée |
| Taille adulte | Graphique automatique | Contexte IMC, aucun graphique longitudinal par défaut |
| Pression artérielle | PAS et PAD séparées | Carte commune et courbes PAS/PAD |
| Axes | min/max dynamique | Domaine et amplitude minimale configurés |
| Donnée manquante | Indicateur parfois absent | `not_measured`, jamais assimilé à normal |
| IA | Peut remplacer statut, référence et historique | Enrichissement rédactionnel uniquement |
| Références | Phrases codées dans l’analyse | Identifiants et versions stockables dans Supabase |
| Objectifs | Hors rapport | Objectifs précédents/prochains dans le modèle commun |
| Traçabilité | Journal de génération | Valeurs, dates, calcul, règle, référence et confiance |
| Rapports | Un PDF | Résumé, patient, professionnel |
| Questionnaires | Détails dans le corps analytique | Synthèse dans le corps, détails en annexe professionnelle |
| Validation finale | Absente | Blocage sur erreurs critiques et codes internes visibles |
| Tests | Aucun test métier | 10 scénarios automatisés initiaux |

## Rapport fictif

Le rapport longitudinal de contrôle est généré dans `output/reports/health-report-v2-demo.pdf`. Il contient quatre cycles de mesures anthropométriques, cardiovasculaires et comportementales, une carte PAS/PAD, les objectifs et l’annexe des réponses sources.

## Compatibilité

Les anciennes tables et colonnes ne sont pas supprimées. Les anciens PDF restent accessibles. La migration ajoute le modèle v2 à côté des données historiques. Les nouvelles routes exigent la migration avant la première nouvelle analyse ou génération.