import type {ApplicationStatus} from "./recruitment-data";
const content:Partial<Record<ApplicationStatus,{subject:string;body:string}>>={
  incomplete:{subject:"Complément requis pour votre candidature",body:"Votre dossier nécessite des informations ou documents complémentaires. Consultez votre espace candidat pour prendre connaissance de la demande."},
  preselected:{subject:"Votre candidature est présélectionnée",body:"Votre profil a retenu notre attention. Vous êtes présélectionné pour la suite du processus."},
  invited_to_test:{subject:"Invitation au test écrit NutVitaGlobalis",body:"Vous êtes invité à passer le test écrit en ligne. Connectez-vous à votre espace candidat pour démarrer votre unique tentative."},
  test_completed:{subject:"Confirmation de fin du test écrit",body:"Votre test écrit a bien été enregistré. Les réponses ouvertes seront examinées par notre équipe."},
  invited_to_interview:{subject:"Invitation à un entretien vidéo",body:"Vous êtes invité à un entretien vidéo. Les informations pratiques vous seront communiquées dans votre espace candidat."},
  interview_completed:{subject:"Entretien enregistré",body:"Votre entretien est terminé et votre candidature entre dans sa phase de décision finale."},
  selected:{subject:"Résultat final de votre candidature",body:"Félicitations, votre candidature a été retenue. Notre équipe vous contactera pour préparer votre intégration."},
  rejected:{subject:"Résultat de votre candidature",body:"Après examen, nous ne pouvons pas donner une suite favorable à votre candidature. Nous vous remercions sincèrement pour votre intérêt."},
  integrated:{subject:"Bienvenue dans le réseau NutVitaGlobalis",body:"Votre intégration au réseau est confirmée. Bienvenue parmi les professionnels partenaires NutVitaGlobalis."}
};
export function recruitmentEmail(status:ApplicationStatus,name:string,note?:string){const template=content[status]||{subject:"Mise à jour de votre candidature",body:"Le statut de votre candidature a été mis à jour."};return {subject:template.subject,text:`Bonjour ${name},\n\n${template.body}${note?`\n\nMessage de l’équipe : ${note}`:''}\n\nÉquipe NutVitaGlobalis`}}
