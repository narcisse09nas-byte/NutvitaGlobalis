import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const body = await request.json();
  const { data: payment } = await supabase.from("payments").select("id,status,provider,client_id").eq("id", String(body.payment_id)).eq("client_id", user.id).maybeSingle();
  if (!payment || payment.provider !== "manual") return NextResponse.json({ message: "Paiement introuvable." }, { status: 404 });
  if (payment.status !== "pending") return NextResponse.json({ message: "Ce paiement n est plus en attente." }, { status: 400 });
  const { error } = await supabase.from("payments").update({ proof_path: body.proof_path || null, proof_reference: String(body.proof_reference || ""), proof_notes: String(body.proof_notes || ""), proof_submitted_at: new Date().toISOString() }).eq("id", payment.id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
