# Programmes diplomants — Lot 7 : resultats et credits

Le lot 7 ajoute un moteur academique deterministe, sans decision officielle confiee a l IA.

## Registres

- Resultats par cours : controle continu, examen final, rattrapage, note finale, lettre, credits tentes et acquis.
- Resultats par UE : moyenne ponderee, compensation et credits.
- Resultats semestriels : moyenne, credits, statut academique et workflow.
- Eligibilite au rattrapage : statut, justification et fenetre de rattrapage.
- Grand livre des credits : ecritures detaillees aux niveaux cours, UE et semestre. Les totaux annuels et programme sont reconstructibles par aggregation.
- Historique des resultats : version, score, statut, auteur, date et motif.
- Progression academique : proposition calculee et emplacement reserve a la decision officielle du jury.
- Vue derivee des credits : totaux par semestre, annee academique et programme.

## Regles de calcul

1. Seules les notes PUBLISHED participent au calcul.
2. Les ponderations regulieres d un cours doivent totaliser exactement 100 %.
3. Toute evaluation reguliere doit posseder une note publiee.
4. La moyenne de cours est la somme des notes normalisees ponderees.
5. Un rattrapage publie remplace avantageusement le resultat regulier, avec le plafond RESIT_SCORE_CAP approuve ou, a defaut, le seuil du cours.
6. Les moyennes d UE et de semestre utilisent les coefficients du curriculum.
7. La compensation exige une UE compensable et une moyenne atteignant son seuil.
8. Les credits ne sont portes au grand livre qu apres validation semestrielle.
9. Une correction de note publiee marque les resultats derives STALE; un recalcul motive est obligatoire.
10. Un resultat valide est verrouille contre un recalcul silencieux.

## Workflow et acces

CALCULATED vers SUBMITTED vers VALIDATED. Les coordonnateurs de programme et administrateurs habilites valident. L etudiant ne voit que ses resultats valides; les acteurs academiques restent limites a leur perimetre. Les RPC sensibles sont retirees a PUBLIC.

## Interface

- /degree-programs/results : calcul, workflow et cinq registres filtrables/exportables.
- /degree-programs/my-results : resultats officiels, detail par cours et rattrapages.
- API : /api/degree-programs/results/calculate et /api/degree-programs/results/workflow.

## Deploiement

Executer 016_degree_programs_results_credits.sql apres 015_degree_programs_assessments_grades.sql, puis le test 016_degree_programs_results_credits_test.sql. Aucune migration n a ete executee automatiquement sur Supabase.