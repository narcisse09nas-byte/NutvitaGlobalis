# Lot 5 — Enseignement et LMS académique

Migration à exécuter après 013_degree_programs_registrations.sql :

supabase/migrations/014_degree_programs_teaching_lms.sql

Le lot ajoute les enseignants, affectations cours-semestre, espaces de cours, modules, leçons bilingues, ressources, séances, présences et progression individuelle. Les contenus officiels sont normalisés et les fichiers sont placés dans le bucket privé academic-course-resources.

## Règles structurantes

- une affectation exige un cours réellement rattaché au semestre ;
- une séance exige un enseignant activement affecté ;
- une présence exige une inscription pédagogique active au même cours et semestre ;
- une progression exige la même cohérence cours-semestre-étudiant ;
- un étudiant ne voit que les espaces publiés auxquels il est inscrit ;
- enseignants et agents habilités gèrent uniquement leur périmètre via RLS ;
- les mutations institutionnelles sont auditées.

## Ordre de mise en service

1. Exécuter la migration 014 dans Supabase.
2. Créer les enseignants depuis le registre.
3. Affecter chaque enseignant à un cours et un semestre.
4. Publier un espace, puis ses modules et leçons.
5. Planifier les séances et saisir les présences.
6. Tester avec un compte étudiant activement inscrit au cours.