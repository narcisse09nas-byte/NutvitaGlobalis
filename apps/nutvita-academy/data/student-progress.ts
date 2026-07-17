export const studentProgress = {
  studentName: "Paul Narcisse",
  activeCourse: {
    code: "CAMMS",
    title: "Certified Acute Malnutrition Management Specialist",
    subtitle: "Prise en charge communautaire de la malnutrition aiguë",
    progress: 12,
    timeSpent: "04h 20",
    nextModule: "Module 1 Quiz",
    nextHref: "/learn/camms/module-1/quiz",
  },
  stats: [
    { label: "Formation active", value: "1" },
    { label: "Temps d’apprentissage", value: "04h 20" },
    { label: "Progression globale", value: "12%" },
    { label: "Certificats obtenus", value: "0" },
  ],
  modules: [
    {
      title: "Qu’est-ce que la malnutrition aiguë ?",
      status: "En cours",
      progress: 55,
      href: "/learn/camms/module-1",
    },
    {
      title: "Causes et conséquences de la malnutrition aiguë",
      status: "Disponible",
      progress: 0,
      href: "/learn/camms/module-2",
    },
    {
      title: "Dépistage communautaire",
      status: "Verrouillé",
      progress: 0,
      href: "#",
    },
    {
      title: "Anthropométrie : PB/MUAC, poids, taille, œdèmes",
      status: "Verrouillé",
      progress: 0,
      href: "#",
    },
  ],
};