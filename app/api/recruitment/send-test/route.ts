import {NextResponse} from "next/server";
import {resend} from "@/lib/api";
import {applicationStatuses} from "@/lib/recruitment-data";
import {recruitmentEmail} from "@/lib/recruitment-emails";
import {createClient} from "@/lib/supabase/server";

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({message:"Non authentifie."},{status:401});
  const {data:admin}=await supabase.from("admin_users").select("id").eq("id",user.id).eq("active",true).maybeSingle();
  if(!admin)return NextResponse.json({message:"Acces refuse."},{status:403});

  const body=await request.json();
  const ids=Array.isArray(body.candidate_ids)?body.candidate_ids.map(String).filter(Boolean):[];
  if(!ids.length)return NextResponse.json({message:"Selectionnez au moins un candidat."},{status:400});

  const [{data:settings},{data:questions},{data:applications}]=await Promise.all([
    supabase.from("recruitment_test_settings").select("*").eq("id",1).maybeSingle(),
    supabase.from("recruitment_test_questions").select("id").eq("active",true).limit(1),
    supabase.from("recruitment_applications").select("id,candidate_id,full_name,email,status").in("id",ids),
  ]);
  if(!settings?.active)return NextResponse.json({message:"Le test doit etre actif avant l'envoi."},{status:400});
  if(!questions?.length)return NextResponse.json({message:"Ajoutez au moins une question active avant l'envoi."},{status:400});
  const rows=(applications||[]).filter((app:any)=>["submitted","under_review","preselected","invited_to_test"].includes(app.status));
  if(!rows.length)return NextResponse.json({message:"Aucun candidat eligible dans la selection."},{status:400});

  const targetStatus="invited_to_test";
  const {error}=await supabase.from("recruitment_applications").update({status:targetStatus}).in("id",rows.map((row:any)=>row.id));
  if(error)return NextResponse.json({message:error.message},{status:400});

  await supabase.from("recruitment_history").insert(rows.map((row:any)=>({
    application_id:row.id,
    actor_id:user.id,
    action:`Statut : ${applicationStatuses[targetStatus]}`,
    from_status:row.status,
    to_status:targetStatus,
    note:"Test ecrit envoye depuis la configuration du test candidat.",
  })));
  await supabase.from("recruitment_notifications").insert(rows.map((row:any)=>({
    candidate_id:row.candidate_id,
    title:applicationStatuses[targetStatus],
    message:"Votre test ecrit NutVitaGlobalis est maintenant disponible dans votre espace candidat.",
  })));

  await Promise.all(rows.map(async(row:any)=>{
    if(!row.email)return;
    const email=recruitmentEmail(targetStatus,row.full_name||"Candidat","Votre test ecrit est disponible dans votre espace candidat.");
    try{
      await resend("/emails",{from:process.env.MAIL_FROM??"NutVitaGlobalis <contact@nutvitaglobalis.com>",to:[row.email],subject:email.subject,text:email.text});
    }catch(error){
      console.error("Recruitment test invitation email",error);
    }
  }));

  return NextResponse.json({ok:true,count:rows.length});
}
