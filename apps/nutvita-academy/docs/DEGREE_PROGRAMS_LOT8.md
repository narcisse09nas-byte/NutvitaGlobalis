# Programmes diplomants — Lot 8 : stages et memoires

## Objectif

Le lot 8 structure le cycle stage, suivi, memoire/projet final et preparation de la soutenance. Les decisions de jury restent reservees au lot 9.

## Registres ajoutes

- academic_internships : organisme, fonction, objectifs bilingues, encadrement, periode, heures, rapport, evaluation et workflow.
- academic_internship_supervisions : visites, progression, heures, constats et prochaine action.
- academic_theses : sujet bilingue, direction, methodologie, depots, plagiat et workflow.
- academic_thesis_milestones : livrables planifies, echeances, depot et revue.
- academic_defenses : planification technique de soutenance, prete a etre liee au jury du lot 9.
- academic_practicum_documents : fichiers prives et versions structurees.
- academic_practicum_history : changements critiques, auteur, date et motif.

## Workflows

Stage : DRAFT, SUBMITTED, APPROVED, IN_PROGRESS, COMPLETED, UNDER_REVIEW, VALIDATED. Le passage a COMPLETED exige les heures attendues et un rapport.

Memoire : PROPOSED, SUBMITTED, APPROVED, IN_PROGRESS, SUBMITTED_FOR_REVIEW, UNDER_REVIEW, READY_FOR_DEFENSE, DEFENDED, VALIDATED. READY_FOR_DEFENSE exige une version finale et un controle de plagiat CLEAR.

Les transitions passent par des RPC securisees, motivees et historisees. Les fonctions sensibles ne sont pas accessibles au role PUBLIC.

## Documents

Le bucket academic-practicum-documents est prive. Le chemin commence par le UUID de l etudiant. Chaque depot cree une version; INTERNSHIP_REPORT et THESIS_FINAL alimentent automatiquement leurs dossiers sources.

## Interfaces

- /degree-programs/practicum : formulaires et six registres institutionnels.
- /degree-programs/my-practicum : vue etudiante stage, suivis, memoire, jalons, soutenance et documents.
- API records, workflow et documents sous /api/degree-programs/practicum.

## Deploiement

Executer 017_degree_programs_internships_theses.sql apres 016, puis 017_degree_programs_internships_theses_test.sql. Aucune migration n est executee automatiquement sur Supabase.