import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const medicalCopy = {
  fr:{badge:"NOS SERVICES",title:"Consultations médicales spécialisées",lead:"Une prise en charge médicale coordonnée des pathologies métaboliques, nutritionnelles et associées, assurée par des professionnels de santé qualifiés et légalement habilités.",find:"Trouver un spécialiste",how:"Comment ça marche ?",specialtiesTitle:"Des spécialités pour une prise en charge complète",journeyTitle:"Un parcours de soins intégré",legal:"Des professionnels de santé légalement habilités"},
  en:{badge:"OUR SERVICES",title:"Specialist medical consultations",lead:"Coordinated medical care for metabolic, nutrition-related and associated conditions, delivered by qualified and legally licensed healthcare professionals.",find:"Find a specialist",how:"How does it work?",specialtiesTitle:"Specialties for comprehensive care",journeyTitle:"An integrated care pathway",legal:"Legally licensed healthcare professionals"},
};
export const medicalSpecialties=[
 {fr:"Diabétologie & Endocrinologie",en:"Diabetology & Endocrinology",textFr:"Diabète, prédiabète, troubles métaboliques et hormonaux.",textEn:"Diabetes, prediabetes, metabolic and hormonal disorders."},
 {fr:"Cardiologie & Risque métabolique",en:"Cardiology & Metabolic Risk",textFr:"Hypertension, cholestérol et prévention cardiovasculaire.",textEn:"Hypertension, cholesterol and cardiovascular prevention."},
 {fr:"Gastro-entérologie & Hépatologie",en:"Gastroenterology & Hepatology",textFr:"Pathologies digestives et hépatiques liées à la nutrition.",textEn:"Digestive and liver conditions linked to nutrition."},
 {fr:"Pédiatrie nutritionnelle",en:"Nutritional Pediatrics",textFr:"Croissance, nutrition et troubles nutritionnels de l'enfant.",textEn:"Growth, nutrition and childhood nutrition disorders."},
 {fr:"Médecine interne",en:"Internal Medicine",textFr:"Prise en charge globale des pathologies métaboliques complexes.",textEn:"Comprehensive care for complex metabolic conditions."},
];

export async function getMedicalSettings(){
 if(!hasSupabaseConfig()) return null;
 const {data}=await (await createClient()).from("medical_specialist_page_settings").select("*").eq("id",1).maybeSingle();
 return data;
}

export async function getActiveMedicalSpecialists(){
 if(!hasSupabaseConfig()) return [];
 const {data}=await (await createClient()).from("medical_specialists").select("*").eq("active",true).order("full_name");
 return data||[];
}
