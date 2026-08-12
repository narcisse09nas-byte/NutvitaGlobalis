import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/admin";
import {createAdminClient} from "@/lib/supabase/admin";
export async function GET(request:Request){await requireAdmin();const path=new URL(request.url).searchParams.get("path");if(!path||!path.startsWith("medical-specialists/"))return NextResponse.json({message:"Chemin invalide"},{status:400});const{data,error}=await createAdminClient().storage.from("document-vault").createSignedUrl(path,300);if(error||!data)return NextResponse.json({message:"Document introuvable"},{status:404});return NextResponse.redirect(data.signedUrl)}
