export type HealthAdvice = { icon: string; title: string; title_en: string; text: string; text_en: string };

export type HealthRecordPageSettings = {
  page_title: string;
  page_title_en: string;
  page_intro: string;
  page_intro_en: string;
  guide_title: string;
  guide_title_en: string;
  guide_text: string;
  guide_text_en: string;
  guide_image_url: string;
  objective_title: string;
  objective_title_en: string;
  advice_title: string;
  advice_title_en: string;
  advice: HealthAdvice[];
};

export const defaultHealthRecordPageSettings: HealthRecordPageSettings = {
  page_title: "Mes paramètres de santé",
  page_title_en: "My health parameters",
  page_intro: "Enregistrez vos mesures et suivez l’évolution de vos indicateurs au fil du temps.",
  page_intro_en: "Record your measurements and monitor how your indicators evolve over time.",
  guide_title: "Bon à savoir",
  guide_title_en: "Good to know",
  guide_text: "Enregistrez régulièrement vos mesures pour suivre efficacement vos progrès.",
  guide_text_en: "Record your measurements regularly to monitor your progress effectively.",
  guide_image_url: "/images/health-measurement-guide-v1.png",
  objective_title: "Votre objectif",
  objective_title_en: "Your goal",
  advice_title: "Conseils personnalisés",
  advice_title_en: "Personalized advice",
  advice: [
    { icon: "water", title: "Hydratation", title_en: "Hydration", text: "Buvez 1,5 à 2 L d’eau par jour pour optimiser votre métabolisme.", text_en: "Drink 1.5 to 2 L of water daily to support your metabolism." },
    { icon: "activity", title: "Activité physique", title_en: "Physical activity", text: "Visez 30 minutes d’activité modérée au moins 5 fois par semaine.", text_en: "Aim for 30 minutes of moderate activity at least 5 times a week." },
    { icon: "food", title: "Alimentation", title_en: "Nutrition", text: "Privilégiez les protéines maigres, les fruits et les légumes.", text_en: "Prioritize lean proteins, fruit and vegetables." },
  ],
};
