import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const medicalCopy = {
  fr:{badge:"NOS SERVICES",title:"Consultations médicales spécialisées",lead:"Une prise en charge médicale coordonnée des pathologies métaboliques, nutritionnelles et associées, assurée par des professionnels de santé qualifiés et légalement habilités.",find:"Trouver un spécialiste",join:"Rejoindre le réseau",how:"Comment ça marche ?",specialtiesTitle:"Des spécialités pour une prise en charge complète",journeyTitle:"Un parcours de soins intégré",legal:"Des professionnels de santé légalement habilités"},
  en:{badge:"OUR SERVICES",title:"Specialist medical consultations",lead:"Coordinated medical care for metabolic, nutrition-related and associated conditions, delivered by qualified and legally licensed healthcare professionals.",find:"Find a specialist",join:"Join the network",how:"How does it work?",specialtiesTitle:"Specialties for comprehensive care",journeyTitle:"An integrated care pathway",legal:"Legally licensed healthcare professionals"},
};
export { medicalSpecialties } from "@/lib/medical-specialty-data";
export async function getMedicalSettings(){if(!hasSupabaseConfig())return null;const{data}=await(await createClient()).from("medical_specialist_page_settings").select("*").eq("id",1).maybeSingle();return data;}
export async function getActiveMedicalSpecialists(){if(!hasSupabaseConfig())return[];const{data}=await(await createClient()).from("medical_specialists").select("*").eq("active",true).order("full_name");return data||[];}
