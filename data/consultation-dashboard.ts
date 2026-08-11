export type ConsultationDashboardSettings = Record<string, any>;

export const defaultConsultationDashboard: ConsultationDashboardSettings = {
  id: 1,
  welcome_title: 'Bonjour',
  welcome_title_en: 'Hello',
  welcome_text: 'Bienvenue dans votre espace de consultation nutritionnelle. Votre nutritionniste vous accompagne avant, pendant et après chaque consultation.',
  welcome_text_en: 'Welcome to your nutrition consultation area. Your nutritionist supports you before, during and after every consultation.',
  status_label: 'En cours', status_label_en: 'In progress',
  default_dietitian_name: 'Équipe NutVitaGlobalis',
  default_dietitian_role: 'Nutritionniste-diététicien(ne)',
  default_dietitian_role_en: 'Registered dietitian',
  default_dietitian_image: '/images/nutritionist-avatar-v1.png',
  ai_title: 'NutVita IA — votre assistant santé',
  ai_title_en: 'NutVita AI — your health assistant',
  ai_questions: [], ai_questions_en: [],
  quick_actions: [
    { label: 'Téléconsultation', label_en: 'Teleconsultation', description: 'Consultez votre nutritionniste en ligne', description_en: 'Meet your nutritionist online', href: '/espace-client/appels', icon: 'video' },
    { label: 'Journal alimentaire', label_en: 'Food diary', description: 'Suivez vos repas au quotidien', description_en: 'Track meals every day', href: '/espace-client/journal-alimentaire', icon: 'meal' },
    { label: 'Suivi des symptômes', label_en: 'Symptom monitoring', description: 'Suivez vos symptômes et votre bien-être', description_en: 'Track symptoms and wellbeing', href: '/espace-client/symptomes', icon: 'heart' },
    { label: 'Rappels', label_en: 'Reminders', description: 'Médicaments, rendez-vous et objectifs', description_en: 'Medication, appointments and goals', href: '/espace-client/rappels', icon: 'bell' },
  ],
};
