import {NextResponse} from "next/server";
import {z} from "zod";
import {getDegreeSession} from "@/lib/degree-programs/access";
import {createSupabaseServerClient} from "@/lib/supabase/server";

const requestSchema=z.object({entity:z.enum(["instructor","assignment","space","module","lesson","resource","session"]),data:z.record(z.string(),z.unknown())});
const schemas={
 instructor:z.object({userId:z.uuid(),reference:z.string().min(2),academicTitle:z.string().min(2),specialtyFr:z.string().min(2),specialtyEn:z.string().min(2),status:z.enum(["ACTIVE","INACTIVE","SUSPENDED","ARCHIVED"]).default("ACTIVE")}),
 assignment:z.object({courseId:z.uuid(),semesterId:z.uuid(),instructorId:z.uuid(),role:z.enum(["LEAD","LECTURER","TUTOR","PRACTICAL_SUPERVISOR"]),hoursAssigned:z.coerce.number().min(0).default(0)}),
 space:z.object({courseId:z.uuid(),semesterId:z.uuid(),titleFr:z.string().min(2),titleEn:z.string().min(2),welcomeFr:z.string().optional(),welcomeEn:z.string().optional(),status:z.enum(["DRAFT","PUBLISHED","ARCHIVED"]).default("DRAFT")}),
 module:z.object({spaceId:z.uuid(),code:z.string().min(1),titleFr:z.string().min(2),titleEn:z.string().min(2),descriptionFr:z.string().optional(),descriptionEn:z.string().optional(),position:z.coerce.number().int().positive(),status:z.enum(["DRAFT","PUBLISHED","ARCHIVED"]).default("DRAFT")}),
 lesson:z.object({moduleId:z.uuid(),code:z.string().min(1),titleFr:z.string().min(2),titleEn:z.string().min(2),lessonType:z.enum(["READING","VIDEO","AUDIO","LIVE","PRACTICAL","ASSIGNMENT","QUIZ","DISCUSSION"]),bodyFr:z.string().optional(),bodyEn:z.string().optional(),externalUrl:z.string().url().or(z.literal("")).optional(),position:z.coerce.number().int().positive(),durationMinutes:z.coerce.number().int().min(0),required:z.boolean().default(true),status:z.enum(["DRAFT","PUBLISHED","ARCHIVED"]).default("DRAFT")}),
 resource:z.object({lessonId:z.uuid(),resourceType:z.string().min(2),titleFr:z.string().min(2),titleEn:z.string().min(2),storagePath:z.string().optional(),externalUrl:z.string().url().or(z.literal("")).optional(),mimeType:z.string().optional(),fileSizeBytes:z.coerce.number().int().min(0).optional(),position:z.coerce.number().int().positive(),downloadable:z.boolean().default(true)}).refine(v=>v.storagePath||v.externalUrl,{message:"A file or URL is required"}),
 session:z.object({courseId:z.uuid(),semesterId:z.uuid(),spaceId:z.uuid().or(z.literal("")).optional(),instructorId:z.uuid(),sessionType:z.enum(["LECTURE","TUTORIAL","PRACTICAL","ONLINE","SEMINAR","EXAM","DEFENSE"]),sessionDate:z.string(),startTime:z.string(),endTime:z.string(),roomOrLink:z.string().min(2),topicFr:z.string().optional(),topicEn:z.string().optional()})
};
export async function POST(request:Request){
 const session=await getDegreeSession();if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!session.organizationId)return NextResponse.json({error:"Organization required"},{status:400});
 const body=requestSchema.safeParse(await request.json());if(!body.success)return NextResponse.json({error:"Invalid payload"},{status:400});
 const contentEntities=["module","lesson","resource"];const allowed=session.isSuperAdmin||session.permissions.includes("teaching.manage")||(contentEntities.includes(body.data.entity)&&session.permissions.includes("teaching.content"));
 if(!allowed)return NextResponse.json({error:"Forbidden"},{status:403});
 const parsed=schemas[body.data.entity].safeParse(body.data.data);if(!parsed.success)return NextResponse.json({error:"Invalid fields",details:parsed.error.flatten()},{status:400});
 const d=parsed.data as Record<string,unknown>;let table="";let values:Record<string,unknown>={organization_id:session.organizationId,created_by:session.userId};
 switch(body.data.entity){
  case"instructor":table="academic_instructors";values={...values,user_id:d.userId,employee_or_partner_id:d.reference,academic_title:d.academicTitle,specialty_fr:d.specialtyFr,specialty_en:d.specialtyEn,status:d.status,updated_by:session.userId};break;
  case"assignment":table="academic_course_instructors";values={...values,course_id:d.courseId,semester_id:d.semesterId,instructor_id:d.instructorId,role:d.role,hours_assigned:d.hoursAssigned,assigned_by:session.userId};break;
  case"space":table="academic_course_spaces";values={...values,course_id:d.courseId,semester_id:d.semesterId,title_fr:d.titleFr,title_en:d.titleEn,welcome_fr:d.welcomeFr||null,welcome_en:d.welcomeEn||null,status:d.status,published_at:d.status==="PUBLISHED"?new Date().toISOString():null,updated_by:session.userId};break;
  case"module":table="academic_course_modules";values={...values,course_space_id:d.spaceId,code:d.code,title_fr:d.titleFr,title_en:d.titleEn,description_fr:d.descriptionFr||null,description_en:d.descriptionEn||null,position:d.position,status:d.status,updated_by:session.userId};break;
  case"lesson":table="academic_course_lessons";values={...values,module_id:d.moduleId,code:d.code,title_fr:d.titleFr,title_en:d.titleEn,lesson_type:d.lessonType,body_fr:d.bodyFr||null,body_en:d.bodyEn||null,external_url:d.externalUrl||null,position:d.position,duration_minutes:d.durationMinutes,required:d.required,status:d.status,updated_by:session.userId};break;
  case"resource":table="academic_course_resources";values={...values,lesson_id:d.lessonId,resource_type:d.resourceType,title_fr:d.titleFr,title_en:d.titleEn,storage_bucket:d.storagePath?"academic-course-resources":null,storage_path:d.storagePath||null,external_url:d.externalUrl||null,mime_type:d.mimeType||null,file_size_bytes:d.fileSizeBytes||null,position:d.position,downloadable:d.downloadable};break;
  default:table="academic_class_sessions";values={...values,course_id:d.courseId,semester_id:d.semesterId,course_space_id:d.spaceId||null,instructor_id:d.instructorId,session_type:d.sessionType,session_date:d.sessionDate,start_time:d.startTime,end_time:d.endTime,room_or_link:d.roomOrLink,topic_fr:d.topicFr||null,topic_en:d.topicEn||null,updated_by:session.userId};
 }
 const supabase=await createSupabaseServerClient();const{data,error}=await supabase.from(table).insert(values).select("id").single();
 if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({id:data.id},{status:201});
}