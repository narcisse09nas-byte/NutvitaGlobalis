import { nutritionPrograms } from "./nutrition-programs";

export const nutritionProgramSitePages=nutritionPrograms.map(program=>({
 page_key:`programme-${program.slug}`,label:`Programme · ${program.titleFr}`,path:`/programmes-nutritionnels/${program.slug}`,
 eyebrow:program.taglineFr,title:program.titleFr,description:program.descriptionFr,cta_label:"Commencer maintenant",cta_url:`/rendez-vous?programme=${program.slug}`,secondary_cta_label:"En savoir plus",secondary_cta_url:"#benefices",
 eyebrow_en:program.taglineEn,title_en:program.titleEn,description_en:program.descriptionEn,cta_label_en:"Start now",secondary_cta_label_en:"Learn more",hero_image_url:"image" in program?program.image:undefined,
 sections:[{title:"Accompagnement",items:[...program.featuresFr]},{title:"Bénéfices",items:[...program.benefitsFr]},{title:"Garanties",items:["Approche fondée sur les preuves","Suivi personnalisé","Données sécurisées","Experts en nutrition"]}],
 sections_en:[{title:"Support",items:[...program.featuresEn]},{title:"Benefits",items:[...program.benefitsEn]},{title:"Standards",items:["Evidence-based approach","Personalized follow-up","Secure data","Nutrition experts"]}]
}));
