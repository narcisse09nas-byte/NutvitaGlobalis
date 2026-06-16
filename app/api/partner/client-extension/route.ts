import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasLocalAdminMode, hasSupabaseConfig } from "@/lib/supabase/config";

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + Math.max(1, months || 3));
  return copy;
}

export async function POST(request: Request) {
  const body = await request.json();
  const clientId = String(body.client_id || "");
  const amount = Number(body.amount || 0);
  const periodMonths = Number(body.period_months || 3);
  const paymentStatus = String(body.payment_status || "paid");
  if (!clientId) return NextResponse.json({ message: "Client requis." }, { status: 400 });

  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    const now = new Date(), expiresAt = addMonths(now, periodMonths);
    return NextResponse.json({ ok: true, local: true, expires_at: expiresAt.toISOString(), payment: { id: crypto.randomUUID(), amount, payment_status: paymentStatus } });
  }

  const session = await createClient(), { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const { data: partner } = await session.from("dietitian_profiles").select("id").eq("candidate_id", user.id).eq("status", "active").maybeSingle();
  if (!partner) return NextResponse.json({ message: "Partenaire actif requis." }, { status: 403 });

  const admin = createAdminClient();
  const { data: client } = await admin.from("client_profiles").select("id,full_name,partner_access_expires_at").eq("id", clientId).or(`created_by_partner_id.eq.${partner.id},assigned_partner_id.eq.${partner.id}`).maybeSingle();
  if (!client) return NextResponse.json({ message: "Client introuvable pour ce partenaire." }, { status: 404 });

  const base = client.partner_access_expires_at && new Date(client.partner_access_expires_at) > new Date() ? new Date(client.partner_access_expires_at) : new Date();
  const expiresAt = addMonths(base, periodMonths);
  const { data: payment, error } = await admin.from("partner_client_payments").insert({
    partner_id: partner.id,
    client_id: clientId,
    amount,
    currency: body.currency || "XOF",
    payment_status: paymentStatus,
    payment_method: body.payment_method || null,
    receipt_path: body.receipt_path || null,
    period_months: periodMonths,
    starts_at: base.toISOString(),
    expires_at: expiresAt.toISOString(),
    notes: body.payment_notes || null,
    created_by: user.id,
  }).select().single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  await admin.from("client_profiles").update({ assigned_partner_id: partner.id, partner_access_expires_at: expiresAt.toISOString(), partner_assignment_status: "active" }).eq("id", clientId);
  if (amount > 0 && ["paid", "partial"].includes(paymentStatus)) {
    await admin.from("partner_ledger").insert({ partner_id: partner.id, entry_type: "earning", description: `Extension client - ${client.full_name}`, amount: Math.round(amount * 0.5), currency: body.currency || "XOF", status: "approved" });
  }
  return NextResponse.json({ ok: true, expires_at: expiresAt.toISOString(), payment });
}
