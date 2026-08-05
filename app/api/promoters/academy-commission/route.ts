import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.ACADEMY_COMMISSION_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ message: "Pont Academy non configuré." }, { status: 503 });
  if (request.headers.get("x-academy-webhook-secret") !== secret) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const amount = Number(body.amount || 0);
  const currency = String(body.currency || "USD");
  const reference = String(body.reference || "").trim();
  if (!email || !amount || !reference) return NextResponse.json({ message: "Paramètres invalides." }, { status: 400 });

  const admin = createAdminClient();
  const { data: client } = await admin.from("client_profiles").select("id,referred_by_promoter_id").ilike("email", email).maybeSingle();
  if (!client?.referred_by_promoter_id) return NextResponse.json({ ok: true, skipped: "no_referral" });

  const commission = Number((amount * 0.03).toFixed(2));
  if (commission <= 0) return NextResponse.json({ ok: true, skipped: "zero_amount" });

  const { error } = await admin.from("promoter_ledger").insert({
    promoter_id: client.referred_by_promoter_id,
    client_id: client.id,
    entry_type: "commission",
    source: "academy",
    external_reference: reference,
    description: "Commission 3% - Formation NutVitaGlobalis Academy",
    amount: commission,
    currency,
  });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, skipped: "duplicate" });
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
