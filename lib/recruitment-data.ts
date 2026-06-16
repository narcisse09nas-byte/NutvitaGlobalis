export const applicationStatuses = {
  started:"Dossier commencé",submitted:"Dossier soumis",under_review:"En cours d’analyse",incomplete:"Dossier incomplet",preselected:"Présélectionné",invited_to_test:"Invité au test écrit",test_completed:"Test écrit terminé",invited_to_interview:"Invité à l’entretien",interview_completed:"Entretien terminé",selected:"Retenu",rejected:"Non retenu",integrated:"Intégré au réseau"
} as const;
export type ApplicationStatus=keyof typeof applicationStatuses;
export const specialties=["Diabète","Obésité","Nutrition infantile","Nutrition maternelle","Nutrition clinique","Hypertension","Santé publique nutritionnelle"];
export const documentFields=[["cv","CV"],["degrees","Diplômes"],["certificates","Attestations ou certificats"],["identity","Pièce d’identité"],["photo","Photo professionnelle"],["motivation","Lettre de motivation"],["references","Références professionnelles"]] as const;
