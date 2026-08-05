export type GrowthAdvice = { icon:string; title:string; title_en:string; text:string; text_en:string };
export type ChildGrowthPageSettings = {
  page_title:string; page_title_en:string; page_intro:string; page_intro_en:string;
  chart_title:string; chart_title_en:string; normal_message:string; normal_message_en:string;
  advice_title:string; advice_title_en:string; advice:GrowthAdvice[];
  help_title:string; help_title_en:string; help_text:string; help_text_en:string;
};
export const defaultChildGrowthPageSettings:ChildGrowthPageSettings={
  page_title:"Suivi Promotion Croissance Enfant",page_title_en:"Child Growth Promotion Monitoring",
  page_intro:"Suivez la croissance et le développement de votre enfant en toute simplicité.",page_intro_en:"Monitor your child’s growth and development with ease.",
  chart_title:"Courbes de croissance OMS",chart_title_en:"WHO growth charts",
  normal_message:"La position de votre enfant est interprétée selon les normes OMS et son historique personnel.",normal_message_en:"Your child’s position is interpreted using WHO standards and their personal history.",
  advice_title:"Conseils personnalisés",advice_title_en:"Personalized advice",
  advice:[
    {icon:"food",title:"Alimentation",title_en:"Nutrition",text:"Assurez une alimentation équilibrée, variée et adaptée à l’âge de l’enfant.",text_en:"Provide a balanced, varied diet suited to your child’s age."},
    {icon:"activity",title:"Activité physique",title_en:"Physical activity",text:"Encouragez au moins 60 minutes de jeu actif par jour.",text_en:"Encourage at least 60 minutes of active play each day."},
    {icon:"sleep",title:"Sommeil",title_en:"Sleep",text:"Maintenez des horaires de sommeil réguliers adaptés à son âge.",text_en:"Maintain regular, age-appropriate sleep times."},
    {icon:"water",title:"Hydratation",title_en:"Hydration",text:"Proposez régulièrement de l’eau tout au long de la journée.",text_en:"Offer water regularly throughout the day."}
  ],
  help_title:"Besoin d’aide ?",help_title_en:"Need help?",help_text:"Notre équipe est là pour vous accompagner.",help_text_en:"Our team is here to support you."
};
