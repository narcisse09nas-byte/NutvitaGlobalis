export type Article = { id?:string; slug: string; title: string; excerpt: string; category: string; image: string; readTime: string; content?:string; author?:string; seoTitle?:string; seoDescription?:string; accessType?:string };
export const articles: Article[] = [
  { slug: "nutrition-diabete", title: "Mieux manger avec le diabète", excerpt: "Des repères simples pour équilibrer vos repas sans renoncer aux saveurs locales.", category: "Nutrition clinique", readTime: "6 min", image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80" },
  { slug: "prevenir-malnutrition-enfant", title: "Prévenir la malnutrition chez l’enfant", excerpt: "Les signes à surveiller et les gestes essentiels pour favoriser une croissance saine.", category: "Santé infantile", readTime: "8 min", image: "https://images.unsplash.com/photo-1602030028438-4cf153cbae9e?auto=format&fit=crop&w=900&q=80" },
  { slug: "assiette-africaine-equilibree", title: "Composer une assiette africaine équilibrée", excerpt: "Féculents, protéines et légumes: trouvez les bonnes proportions au quotidien.", category: "Bien-être", readTime: "5 min", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80" },
  { slug: "grossesse-alimentation", title: "Bien se nourrir pendant la grossesse", excerpt: "Les nutriments qui comptent vraiment pour la mère et le développement du bébé.", category: "Maternité", readTime: "7 min", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80" },
  { slug: "hygiene-alimentaire-maison", title: "5 règles d’hygiène alimentaire", excerpt: "Réduisez les risques de contamination dans votre cuisine avec des gestes simples.", category: "Sécurité alimentaire", readTime: "4 min", image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80" },
  { slug: "diversification-alimentaire", title: "Réussir la diversification alimentaire", excerpt: "Quand commencer, quels aliments proposer et comment respecter le rythme de bébé.", category: "Nutrition infantile", readTime: "6 min", image: "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=900&q=80" }
];
export const formations = [
  { title: "Malnutrition aiguë", duration: "6 semaines", level: "Intermédiaire", price: "45 000 FCFA", image: articles[1].image },
  { title: "Nutrition du diabétique", duration: "4 semaines", level: "Tous niveaux", price: "35 000 FCFA", image: articles[0].image },
  { title: "Alimentation du nourrisson et du jeune enfant", duration: "8 semaines", level: "Professionnel", price: "55 000 FCFA", image: articles[5].image },
  { title: "Sécurité sanitaire des aliments", duration: "5 semaines", level: "Intermédiaire", price: "40 000 FCFA", image: articles[4].image }
];
