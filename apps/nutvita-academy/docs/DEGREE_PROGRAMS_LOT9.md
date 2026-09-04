# Degree Programs — Lot 9

Le lot 9 livre les jurys semestriels, annuels, de soutenance et de diplomation, avec membres, quorum, signatures, décisions humaines et procès-verbaux.

Le contrôle déterministe d'éligibilité vérifie les crédits, cours obligatoires, semestres, stage, mémoire/soutenance et situation administrative/financière. Les relevés restent structurés en base; le PDF est une représentation publiée. Le diplôme académique demeure distinct du certificat professionnel.

Interfaces :
- /degree-programs/juries : gestion et registres institutionnels.
- /degree-programs/my-official-records : espace privé étudiant.
- /academic/verify/[code] : vérification publique non nominative.

Déploiement : exécuter 018_degree_programs_juries_graduation.sql après 017, puis le test SQL 018. Les PDF officiels sont référencés dans le bucket privé academic-official-documents.
