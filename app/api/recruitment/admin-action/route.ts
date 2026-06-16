import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {resend} from "@/lib/api";
import {applicationStatuses,type ApplicationStatus} from "@/lib/recruitment-data";
import {recruitmentEmail} from "@/lib/recruitment-emails";
import {generateAndStoreContract} from "@/lib/contract-pdf";

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({message:'Non authentifié.'},{status:401});
  const {data:admin}=await supabase.from('admin_users').select('id').eq('id',user.id).eq('active',true).maybeSingle();
  if(!admin)return NextResponse.json({message:'Accès refusé.'},{status:403});
  const body=await request.json();
  const id=String(body.id||''),status=String(body.status||'') as ApplicationStatus,note=String(body.note||'').trim();
  if(!id||!(status in applicationStatuses))return NextResponse.json({message:'Action invalide.'},{status:400});
  const {data:app}=await supabase.from('recruitment_applications').select('*').eq('id',id).single();
  if(!app)return NextResponse.json({message:'Candidature introuvable.'},{status:404});
  const {error}=await supabase.from('recruitment_applications').update({status,internal_comments:body.internal_comments??app.internal_comments,administrative_score:body.administrative_score??app.administrative_score}).eq('id',id);
  if(error)return NextResponse.json({message:error.message},{status:400});
  if(body.manual_score!==undefined)await supabase.from('recruitment_test_attempts').update({manual_score:body.manual_score,reviewer_comments:body.reviewer_comments||null,status:'graded'}).eq('application_id',id);
  await supabase.from('recruitment_history').insert({application_id:id,actor_id:user.id,action:body.notify===false?'Évaluation interne enregistrée':`Statut : ${applicationStatuses[status]}`,from_status:app.status,to_status:status,note});
  if(body.notify!==false){
    await supabase.from('recruitment_notifications').insert({candidate_id:app.candidate_id,title:applicationStatuses[status],message:note||recruitmentEmail(status,app.full_name).text.split('\n\n')[1]});
    const email=recruitmentEmail(status,app.full_name||'Candidat',note);
    try{await resend('/emails',{from:process.env.MAIL_FROM??'NutVitaGlobalis <contact@nutvitaglobalis.com>',to:[app.email],subject:email.subject,text:email.text})}catch(error){console.error('Recruitment status email',error)}
  }
  if(status==='selected'||status==='integrated'){
    await supabase.rpc('create_dietitian_from_application',{p_application_id:id});
    await supabase.from('dietitian_profiles').update({status:status==='integrated'?'active':'inactive'}).eq('application_id',id);
    const {data:contractId}=await supabase.rpc('create_partner_contract',{p_application_id:id,p_created_by:user.id});
    if(contractId)await generateAndStoreContract(supabase,contractId);
  }
  return NextResponse.json({ok:true});
}
