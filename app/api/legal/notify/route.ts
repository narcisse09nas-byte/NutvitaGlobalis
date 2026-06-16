import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendSystemEmail } from "@/lib/system-email";

export async function POST(request: Request) {
  const { supabase } = await requireAdmin();
  const body = await request.json();
  const { data: clients } = await supabase.from("client_profiles").select("email,preferred_language").not("email", "is", null).limit(500);
  const recipients = clients || [];
  await Promise.allSettled(recipients.map((client: any) => sendSystemEmail(supabase as any, "legal_document_updated", client.email, {
    name: "",
    document_title: body.title || body.document_key,
    version: body.version || "1.0",
    locale: client.preferred_language || body.locale || "fr",
  }, { locale: client.preferred_language || body.locale || "fr", document_key: body.document_key })));
  return NextResponse.json({ queued: recipients.length });
}
