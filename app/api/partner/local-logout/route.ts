import {NextResponse} from "next/server";import {cookies} from "next/headers";export async function POST(){(await cookies()).delete("nutvita_local_partner");return NextResponse.json({ok:true})}
