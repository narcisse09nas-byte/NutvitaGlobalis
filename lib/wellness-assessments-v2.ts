export type AssessmentKind = "nutrition" | "activity" | "lifestyle";
export type AssessmentAnswer = Record<string, number>;
export type AssessmentQuestion = { id: string; title: string; help: string; options: Array<{ label: string; score: number }> };
const opts = (labels: string[], scores = [0, 1, 2, 3, 4]) => labels.map((label, index) => ({ label, score: scores[index] }));
const positive = ["0 jour", "1 à 2 jours", "3 à 4 jours", "5 à 6 jours", "7 jours"];
const negative = ["7 jours", "5 à 6 jours", "3 à 4 jours", "1 à 2 jours", "Aucun jour"];

export const assessmentQuestions: Record<AssessmentKind, AssessmentQuestion[]> = {
  nutrition: [
    { id:"regular_meals",title:"Jours avec trois repas principaux",help:"Comptez uniquement les journées avec petit-déjeuner, déjeuner et dîner.",options:opts(["0 à 1 jour","2 à 3 jours","4 à 5 jours","6 jours","7 jours"]) },
    { id:"fruit",title:"Jours avec au moins 2 portions de fruits",help:"Une portion correspond à un fruit moyen ou environ 80 g.",options:opts(positive) },
    { id:"vegetables",title:"Jours avec au moins 3 portions de légumes",help:"Une portion correspond à environ 1/2 tasse cuite ou 1 tasse crue.",options:opts(positive) },
    { id:"diversity",title:"Jours réunissant les cinq groupes alimentaires",help:"Féculents, fruits/légumes, protéines, laitages et bonnes matières grasses.",options:opts(positive) },
    { id:"hydration",title:"Jours avec au moins 1,5 à 2 litres d’eau",help:"Comptez principalement l’eau et respectez toute restriction hydrique prescrite.",options:opts(["0 à 1 jour","2 à 3 jours","4 à 5 jours","6 jours","7 jours"]) },
    { id:"sugary_drinks",title:"Jours avec boissons sucrées",help:"Incluez sodas, jus industriels, boissons énergétiques et boissons très sucrées.",options:opts(negative) },
    { id:"ultra_processed",title:"Jours avec aliments ultra-transformés",help:"Exemples : chips, biscuits industriels, fast-food, charcuteries et nouilles instantanées.",options:opts(negative) },
    { id:"fried_food",title:"Jours avec aliments frits",help:"Incluez les aliments frits à domicile, au restaurant ou prêts à consommer.",options:opts(negative) },
    { id:"portion_size",title:"Taille habituelle des portions",help:"Choisissez l’option décrivant la majorité de vos repas selon la faim et la satiété.",options:opts(["Très excessives","Plutôt excessives","Adaptées à ma faim","Plutôt insuffisantes","Très insuffisantes"],[0,2,4,2,0]) },
    { id:"balanced_breakfast",title:"Jours avec petit-déjeuner équilibré",help:"Au moins trois éléments : féculent complet/tubercule, laitage, fruit ou protéine.",options:opts(positive) },
    { id:"protein_sources",title:"Jours avec une source protéique de qualité au moins deux fois",help:"Exemples : poisson, viande, œufs, haricots, soja, lait ou yaourt.",options:opts(positive) },
    { id:"snacking",title:"Jours avec grignotage hors collation planifiée",help:"Comptez les prises répétées entre les repas, hors collation planifiée.",options:opts(negative) },
  ],
  activity: [
    { id:"planned_sessions",title:"Séances planifiées d’au moins 30 minutes",help:"Une séance est une activité physique ou sportive volontaire d’au moins 30 minutes.",options:opts(["0","1","2","3 à 4","5 ou plus"]) },
    { id:"weekly_minutes",title:"Minutes modérées ou intenses cette semaine",help:"Additionnez toutes les minutes d’activité modérée et vigoureuse des 7 derniers jours.",options:opts(["Moins de 30","30–74","75–149","150–299","300 ou plus"]) },
    { id:"intensity",title:"Intensité habituelle",help:"Faible : marche lente ; modérée : marche rapide ; vigoureuse : course, football ou HIIT.",options:opts(["Aucune","Faible","Modérée","Vigoureuse","Alternance modérée/vigoureuse"],[0,1,3,4,4]) },
    { id:"strength_days",title:"Jours de renforcement musculaire",help:"Exemples : pompes, haltères, gainage, musculation ou bandes élastiques.",options:opts(["Aucun","1 jour","2 jours","3 jours","4 jours ou plus"]) },
    { id:"sitting_time",title:"Temps assis moyen par jour",help:"Incluez travail, transports, télévision et loisirs numériques ; excluez le sommeil.",options:opts(["Plus de 8 h","6–8 h","4–6 h","2–4 h","Moins de 4 h"]) },
    { id:"daily_walking",title:"Marche quotidienne hors sport",help:"Comptez les déplacements, courses et marche au travail, hors séances sportives.",options:opts(["Moins de 10 min","10–29 min","30–59 min","60–89 min","90 min ou plus"]) },
    { id:"stairs",title:"Utilisation des escaliers",help:"Répondez selon votre comportement habituel lorsque les escaliers sont accessibles.",options:opts(["Jamais","Rarement","Parfois","Souvent","Toujours"]) },
    { id:"regularity",title:"Ancienneté de l’habitude sportive",help:"Indiquez depuis combien de temps cette routine est globalement maintenue.",options:opts(["Aucune habitude","Moins de 1 mois","1–3 mois","3–6 mois","Plus de 6 mois"]) },
    { id:"interruptions",title:"Semaines sans activité durant les 30 derniers jours",help:"Comptez les semaines entièrement sans activité physique.",options:opts(["4 semaines","3 semaines","2 semaines","1 semaine","Aucune"]) },
    { id:"functional_capacity",title:"Après avoir monté deux étages",help:"Répondez selon votre état habituel, sans vous mettre volontairement en difficulté.",options:opts(["Obligé de m’arrêter","Très essoufflé","Modérément essoufflé","Légèrement essoufflé","Pas essoufflé"]) },
  ],
  lifestyle: [
    { id:"sleep_duration",title:"Nuits avec 7 à 9 heures de sommeil",help:"Comptez les nuits avec une durée totale de sommeil comprise entre 7 et 9 heures.",options:opts(positive) },
    { id:"rested",title:"Jours avec réveil reposé",help:"Comptez les réveils où vous vous sentiez reposé et prêt à commencer la journée.",options:opts(positive) },
    { id:"stress",title:"Jours de stress, anxiété ou dépassement",help:"Comptez les jours où ces sensations ont réellement affecté votre bien-être.",options:opts(negative) },
    { id:"recreational_screen",title:"Temps d’écran récréatif quotidien",help:"Excluez le travail et les études ; incluez réseaux sociaux, jeux et télévision.",options:opts(["Plus de 6 h","4 à 6 h","2 à 4 h","1 à 2 h","Moins d’une heure"]) },
    { id:"alcohol",title:"Jours avec consommation d’alcool",help:"Comptez tout jour avec au moins une boisson alcoolisée, quelle que soit la quantité.",options:opts(negative) },
    { id:"nicotine",title:"Jours avec tabac ou nicotine",help:"Incluez cigarette, cigare, chicha, cigarette électronique et tabac à chiquer.",options:opts(negative) },
    { id:"emotional_wellbeing",title:"Jours de bonne humeur et satisfaction",help:"Comptez les jours où votre humeur et votre satisfaction globale étaient positives.",options:opts(positive) },
    { id:"social_connections",title:"Jours avec échanges sociaux agréables",help:"Incluez les échanges en personne, par téléphone ou en visioconférence.",options:opts(positive) },
    { id:"relaxation",title:"Jours avec au moins 30 minutes de détente",help:"Exemples : lecture, musique, prière, méditation, promenade ou jardinage.",options:opts(positive) },
    { id:"life_balance",title:"Équilibre travail/études, vie personnelle et repos",help:"Évaluez l’équilibre global entre obligations, vie personnelle et récupération.",options:opts(["Jamais","Rarement","Parfois","Souvent","Toujours"]) },
  ],
};

export type AssessmentResult = { score:number; rawScore:number; maxScore:number; level:"very_low"|"low"|"moderate"|"good"|"excellent"; levelLabel:string; interpretation:string; completed:boolean; keySignals:Array<{id:string;reference:string;question:string;score:number}> };
export type WellnessAssessmentBundle = { nutrition:AssessmentResult; activity:AssessmentResult; lifestyle:AssessmentResult; answers:Record<AssessmentKind,AssessmentAnswer> };
const descriptions: Record<AssessmentKind,Record<AssessmentResult["level"],[string,string]>> = {
  nutrition:{very_low:["Très faible","Habitudes alimentaires très défavorables à la santé. Une amélioration rapide est recommandée."],low:["Faible","Plusieurs habitudes alimentaires doivent être corrigées pour réduire les risques nutritionnels."],moderate:["Modérée","Alimentation acceptable, mais plusieurs aspects peuvent être améliorés pour atteindre les recommandations."],good:["Bonne","Habitudes alimentaires globalement équilibrées avec quelques points d’amélioration."],excellent:["Excellente","Alimentation variée, équilibrée et conforme aux principales recommandations nutritionnelles."]},
  activity:{very_low:["Très faible","Mode de vie très sédentaire. Aucun programme sportif régulier."],low:["Faible","Activité insuffisante pour maintenir une bonne santé."],moderate:["Modérée","Niveau acceptable mais en dessous des recommandations optimales."],good:["Bonne","Habitudes sportives satisfaisantes, conformes aux recommandations de l’OMS."],excellent:["Excellente","Mode de vie très actif avec une excellente régularité et un faible niveau de sédentarité."]},
  lifestyle:{very_low:["Très faible","Plusieurs habitudes de vie sont défavorables à la santé. Une amélioration est fortement recommandée."],low:["Faible","Des changements dans plusieurs domaines, notamment le sommeil, le stress et l’équilibre de vie, sont nécessaires."],moderate:["Modéré","Les habitudes de vie sont acceptables, mais plusieurs aspects peuvent être optimisés."],good:["Bon","Le mode de vie est globalement favorable à la santé avec quelques points d’amélioration."],excellent:["Excellent","Les habitudes de vie sont très favorables au bien-être physique, mental et social."]},
};
export function assessmentInterpretation(kind:AssessmentKind,level:AssessmentResult["level"]){const [label,interpretation]=descriptions[kind][level];return{label,interpretation}}
export function scoreAssessment(kind:AssessmentKind,answers:AssessmentAnswer):AssessmentResult{const questions=assessmentQuestions[kind],values=questions.map(q=>answers[q.id]).filter(Number.isFinite),rawScore=values.reduce((a,b)=>a+b,0),maxScore=questions.length*4,score=Math.round(rawScore/maxScore*100),level=score<=20?"very_low":score<=40?"low":score<=60?"moderate":score<=80?"good":"excellent",d=assessmentInterpretation(kind,level);return{score,rawScore,maxScore,level,levelLabel:d.label,interpretation:d.interpretation,completed:values.length===questions.length,keySignals:questions.map((q,index)=>({id:q.id,reference:questionReference(kind,index),question:q.title,score:answers[q.id]})).filter(x=>Number.isFinite(x.score)&&x.score<=1)}}
export function buildAssessmentBundle(answers:Record<AssessmentKind,AssessmentAnswer>):WellnessAssessmentBundle{return{nutrition:scoreAssessment("nutrition",answers.nutrition),activity:scoreAssessment("activity",answers.activity),lifestyle:scoreAssessment("lifestyle",answers.lifestyle),answers}}
const questionPrefixes:Record<AssessmentKind,string>={nutrition:"N",activity:"A",lifestyle:"MV"};
export function questionReference(kind:AssessmentKind,index:number){return `${questionPrefixes[kind]}-Q${index+1}`;}
export function buildAssessmentSnapshot(answers:Record<AssessmentKind,AssessmentAnswer>){return Object.fromEntries((Object.keys(assessmentQuestions) as AssessmentKind[]).map(kind=>[kind,assessmentQuestions[kind].map((q,index)=>{const score=answers[kind]?.[q.id];return{id:q.id,number:index+1,reference:questionReference(kind,index),question:q.title,answer:q.options.find(o=>o.score===score)?.label??null,score:Number.isFinite(score)?score:null}})]))}
export function scoreToLegacyLevel(score:number){return score<=20?1:score<=40?2:score<=60?3:score<=80?4:5}
export const assessmentGuides=Object.fromEntries((Object.keys(assessmentQuestions) as AssessmentKind[]).map(kind=>[kind,Object.fromEntries(assessmentQuestions[kind].map(q=>[q.id,q.help]))])) as Record<AssessmentKind,Record<string,string>>;
