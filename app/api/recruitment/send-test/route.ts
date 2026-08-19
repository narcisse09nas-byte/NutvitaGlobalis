import {NextResponse} from "next/server";
import {resend} from "@/lib/api";
import {applicationStatuses} from "@/lib/recruitment-data";
import {recruitmentEmail} from "@/lib/recruitment-emails";
import {createClient} from "@/lib/supabase/server";

export async function POST(request:Request){
  const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({message:"Non authentifié."},{status:401});
  const{data:admin}=await supabase.from("admin_users").select("id").eq("id",user.id).eq("active",true).maybeSingle();
  if(!admin)return NextResponse.json({message:"Accès refusé."},{status:403});
  const body=await request.json();
  const assignments=Array.isArray(body.assignments)?body.assignments.map((item:any)=>({id:String(item.id||""),exam_id:String(item.exam_id||"")})).filter((item:any)=>item.id&&item.exam_id):[];
  const ids=assignments.length?assignments.map((item:any)=>item.id):(Array.isArray(body.candidate_ids)?body.candidate_ids.map(String).filter(Boolean):[]);
  if(!ids.length)return NextResponse.json({message:"Sélectionnez au moins un candidat et une épreuve."},{status:400});
  const{data:applications}=await supabase.from("recruitment_applications").select("id,candidate_id,full_name,email,status").in("id",ids);
  const rows=(applications||[]).filter((app:any)=>["submitted","under_review","preselected","invited_to_test","test_completed"].includes(app.status));
  if(!rows.length)return NextResponse.json({message:"Aucun candidat éligible dans la sélection."},{status:400});
  for(const row of rows){
    const assignment=assignments.find((item:any)=>item.id===row.id);
    const{error}=await supabase.from("recruitment_applications").update({status:"invited_to_test",assigned_exam_id:assignment?.exam_id||null}).eq("id",row.id);
    if(error)return NextResponse.json({message:error.message},{status:400});
  }
  await supabase.from("recruitment_history").insert(rows.map((row:any)=>({application_id:row.id,actor_id:user.id,action:`Statut : ${applicationStatuses.invited_to_test}`,from_status:row.status,to_status:"invited_to_test",note:"Épreuve écrite attribuée depuis le registre des tests."})));
  await supabase.from("recruitment_notifications").insert(rows.map((row:any)=>({candidate_id:row.candidate_id,title:applicationStatuses.invited_to_test,message:"Votre épreuve écrite est disponible dans votre espace candidat."})));
  await Promise.all(rows.map(async(row:any)=>{if(!row.email)return;const email=recruitmentEmail("invited_to_test",row.full_name||"Candidat","Votre épreuve écrite est disponible dans votre espace candidat.");try{await resend("/emails",{from:process.env.MAIL_FROM??"NutVitaGlobalis <contact@nutvitaglobalis.com>",to:[row.email],subject:email.subject,text:email.text})}catch(error){console.error("Recruitment test invitation email",error)}}));
  return NextResponse.json({ok:true,count:rows.length});
}
