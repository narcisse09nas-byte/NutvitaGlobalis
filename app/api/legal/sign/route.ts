import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connexion requise pour signer." }, { status: 401 });
  const body = await request.json();
  if (!body.document_id || !body.signer_name || !body.accepted) return NextResponse.json({ message: "Signature incomplete." }, { status: 400 });
  const headers = request.headers;
  const ip = (headers.get("x-forwarded-for") || "").split(",")[0] || headers.get("x-real-ip") || null;
  const userAgent = headers.get("user-agent");
  const payload = {
    legal_document_id: body.document_id,
    document_key: body.document_key,
    user_id: user.id,
    signer_name: body.signer_name,
    signature_type: body.signature_type || "client_contract",
    version: body.version || "1.0",
    signed_at: new Date().toISOString(),
    ip_address: ip,
    user_agent: userAgent,
    signature_hash: await hash(`${user.id}:${body.document_id}:${body.version}:${body.signer_name}:${Date.now()}`),
  };
  const { data, error } = await supabase.from("legal_signatures").insert(payload).select("*").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ signature: data });
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(item => item.toString(16).padStart(2, "0")).join("");
}
