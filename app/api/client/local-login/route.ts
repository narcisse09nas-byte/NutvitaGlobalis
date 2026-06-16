import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hasLocalAdminMode } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (!hasLocalAdminMode()) return NextResponse.json({ message: "Mode local desactive." }, { status: 404 });
  const { email, password } = await request.json();
  const validEmail = process.env.LOCAL_CLIENT_EMAIL || "client@nutvitaglobalis.com";
  const validPassword = process.env.LOCAL_CLIENT_PASSWORD;
  if (!validPassword) return NextResponse.json({ message: "LOCAL_CLIENT_PASSWORD manque dans .env.local." }, { status: 500 });
  if (![validEmail.toLowerCase(),"client.demo"].includes(String(email).trim().toLowerCase()) || password !== validPassword) return NextResponse.json({ message: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  (await cookies()).set("nutvita_local_client", "1", { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 60 * 60 * 12 });
  return NextResponse.json({ ok: true, email: validEmail });
}
