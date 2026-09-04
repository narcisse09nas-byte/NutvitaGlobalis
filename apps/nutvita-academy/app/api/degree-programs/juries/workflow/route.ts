import{NextResponse}from"next/server";import{z}from"zod";import{getDegreeSession}from"@/lib/degree-programs/access";import{createSupabaseServerClient}from"@/lib/supabase/server";
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("TRANSITION"),id:z.string().uuid(),status:z.enum(["CONVENED","IN_SESSION","DECISIONS_RECORDED","CLOSED","CANCELLED"]),reason:z.string().min(3)}),
 z.object({action:z.literal("SIGN"),id:z.string().uuid(),present:z.boolean(),conflict:z.boolean(),details:z.string().optional()}),
 z.object({action:z.literal("RECORD_MINUTES"),id:z.string().uuid(),storagePath:z.string().min(3),reason:z.string().min(3)}),
 z.object({action:z.literal("APPROVE_DECISION"),id:z.string().uuid(),reason:z.string().min(3)}),
 z.object({action:z.literal("CHECK_ELIGIBILITY"),studentId:z.string().uuid(),programId:z.string().uuid(),reason:z.string().min(3)}),
 z.object({action:z.literal("GENERATE_TRANSCRIPT"),studentId:z.string().uuid(),academicYearId:z.string().uuid().optional(),semesterId:z.string().uuid().optional(),reason:z.string().min(3)}),
 z.object({action:z.literal("PUBLISH_TRANSCRIPT"),id:z.string().uuid(),storagePath:z.string().min(3),reason:z.string().min(3)}),
 z.object({action:z.literal("ISSUE_DEGREE"),id:z.string().uuid(),storagePath:z.string().min(3),reason:z.string().min(3)})
]);
export async function POST(req:Request){const s=await getDegreeSession();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:p.error.flatten()},{status:400});const db=await createSupabaseServerClient(),x=p.data;let name="",args:Record<string,unknown>={};
if(x.action==="TRANSITION"){name="academic_transition_jury";args={p_id:x.id,p_status:x.status,p_reason:x.reason}}
if(x.action==="SIGN"){name="academic_sign_jury_membership";args={p_id:x.id,p_present:x.present,p_conflict:x.conflict,p_details:x.details||null}}
if(x.action==="RECORD_MINUTES"){name="academic_record_jury_minutes";args={p_id:x.id,p_path:x.storagePath,p_reason:x.reason}}
if(x.action==="APPROVE_DECISION"){name="academic_approve_jury_decision";args={p_id:x.id,p_reason:x.reason}}
if(x.action==="CHECK_ELIGIBILITY"){name="academic_evaluate_graduation_eligibility";args={p_student:x.studentId,p_program:x.programId,p_reason:x.reason}}
if(x.action==="GENERATE_TRANSCRIPT"){name="academic_generate_transcript";args={p_student:x.studentId,p_year:x.academicYearId||null,p_semester:x.semesterId||null,p_reason:x.reason}}
if(x.action==="PUBLISH_TRANSCRIPT"){name="academic_publish_transcript";args={p_id:x.id,p_path:x.storagePath,p_reason:x.reason}}
if(x.action==="ISSUE_DEGREE"){name="academic_issue_degree";args={p_id:x.id,p_path:x.storagePath,p_reason:x.reason}}
const{data,error}=await db.rpc(name,args);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({data})}