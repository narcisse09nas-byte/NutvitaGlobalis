import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function POST() { (await cookies()).delete("nutvita_local_client"); return NextResponse.json({ ok: true }); }
