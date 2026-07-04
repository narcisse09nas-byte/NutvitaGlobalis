import {NextResponse} from "next/server";
import {generateStructured} from "@/lib/ai-narrative";
import {renderConsultationPreAnalysis} from "@/lib/consultation-record-pdf";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

type Analysis={
  summary:string;
  findings:string[];
  attentionPoints:string[];
  missingData:string[];
  suggestedObjectives:string[];
  questionsToVerify:string[];
  limitations:string[];
};

const schema={
  type:"object",additionalProperties:false,
  properties:{
    summary:{type:"string"},
    findings:{type:"array",items:{type:"string"}},
    attentionPoints:{type:"array",items:{type:"string"}},
    missingData:{type:"array",items:{type:"string"}},
    suggestedObjectives:{type:"array",items:{type:"string"}},
    questionsToVerify:{type:"array",items:{type:"string"}},
    limitations:{type:"array",items:{type:"string"}},
  },
  required:["summary","findings","attentionPoints","missingData","suggestedObjectives","questionsToVerify","limitations"],
};

function localAnalysis(input:any):Analysis{
  const assessment=input.clinical_assessments||{},findings:string[]=[],attentionPoints:string[]=[],missingData:string[]=[];
  const dietary=assessment.dietary?.result;
  if(dietary) findings.push(`Diversite alimentaire: ${dietary.score??dietary.mddScore??"non calculee"} groupe(s); seuil ${dietary.met??dietary.mddMet?"atteint":"non atteint"}.`);
  else missingData.push("Evaluation de la diversite alimentaire.");
  const calories=assessment.calorie;
  if(calories?.estimated_intake_kcal) findings.push(`Apport rapporte estime: ${calories.estimated_intake_kcal} kcal/j pour un besoin saisi de ${calories.estimated_need_kcal||"non renseigne"} kcal/j.`);
  else missingData.push("Estimation des apports energetiques sur 24 heures.");
  const activity=assessment.physical_activity;
  if(activity) { findings.push(`Activite estimee: ${activity.met_minutes_week||0} MET-min/semaine; temps assis ${activity.sitting_minutes_day||0} min/j.`); if((activity.sitting_minutes_day||0)>=480)attentionPoints.push("Temps sedentaires declares eleves, a contextualiser."); }
  const lifestyle=assessment.lifestyle;
  if(lifestyle?.sleep_hours&&lifestyle.sleep_hours<7)attentionPoints.push("Duree de sommeil declaree inferieure a 7 heures.");
  if(lifestyle?.stress_level>=7)attentionPoints.push("Stress percu eleve.");
  return{summary:"Analyse preparatoire fondee sur les donnees saisies. Elle aide a structurer la consultation mais ne constitue ni un diagnostic ni une prescription.",findings,attentionPoints,missingData,suggestedObjectives:["Prioriser un objectif alimentaire mesurable","Definir un objectif d activite adapte","Planifier une mesure de controle"],questionsToVerify:["Verifier la precision des portions et des durees declarees","Comparer avec les mesures anterieures disponibles"],limitations:["Donnees auto-declarees","Absence possible d examen clinique et de bilan biologique complet"]};
}

export async function POST(request:Request){
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({message:"Non authentifie."},{status:401});
  const body=await request.json(),admin=createAdminClient();
  const [{data:ownDietitian},{data:actorAdmin}]=await Promise.all([supabase.from("dietitian_profiles").select("*").eq("candidate_id",user.id).eq("status","active").maybeSingle(),supabase.from("admin_users").select("role").eq("id",user.id).eq("active",true).maybeSingle()]);
  const {data:supervised}=actorAdmin?.role==="super_admin"&&body.partner_id?await admin.from("dietitian_profiles").select("*").eq("id",String(body.partner_id)).eq("status","active").maybeSingle():{data:null};
  const dietitian=ownDietitian||supervised;if(!dietitian)return NextResponse.json({message:"Nutritionniste non autorise."},{status:403});
  const {data:client}=await admin.from("client_profiles").select("*").eq("id",String(body.client_id)).maybeSingle();if(!client)return NextResponse.json({message:"Client introuvable."},{status:404});
  if(actorAdmin?.role!=="super_admin"&&client.assigned_partner_id!==dietitian.id&&client.created_by_partner_id!==dietitian.id)return NextResponse.json({message:"Client non affecte."},{status:403});
  const deterministic=localAnalysis(body),generated=await generateStructured<Analysis>("consultation_pre_analysis","Analyse les informations de consultation avant la definition des objectifs. Ne pose aucun diagnostic, ne prescris rien, distingue faits, hypotheses, vigilances, donnees manquantes et limites. Propose uniquement des pistes d objectifs mesurables a valider par le nutritionniste.",{profile:body.profile,pack_type:body.pack_type,reason:body.reason,complaints:body.complaints,complaint_notes:body.complaint_notes,clinical_assessments:body.clinical_assessments,deterministic},schema),analysis=generated.data||deterministic;
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin,loginUrl=`${siteUrl}/connexion?identifiant=${encodeURIComponent(client.email||"")}&redirect=${encodeURIComponent("/espace-client/consultations")}`,id=crypto.randomUUID(),path=`${client.id}/consultation-analyses/${id}.pdf`;
  try{const bytes=await renderConsultationPreAnalysis(analysis,client,dietitian,loginUrl),upload=await admin.storage.from("document-vault").upload(path,bytes,{contentType:"application/pdf",upsert:false});if(upload.error)throw upload.error;await admin.from("vault_documents").insert({owner_id:client.id,client_id:client.id,document_type:"consultation_pre_analysis",title:`Analyse preparatoire - ${new Date().toLocaleDateString("fr-FR")}`,file_path:path,mime_type:"application/pdf",confidential:true,created_by:user.id});return NextResponse.json({analysis,pdf_path:path,provider:generated.provider||"local",warning:"Aide a la decision. Validation humaine obligatoire."})}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Analyse impossible."},{status:500})}
}
