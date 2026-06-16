import {NextResponse} from "next/server";
import {cookies} from "next/headers";
export async function POST(){const cookieStore=await cookies();cookieStore.delete("nutvita_local_admin");cookieStore.delete("nutvita_local_admin_email");return NextResponse.json({ok:true})}
