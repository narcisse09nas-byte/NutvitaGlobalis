import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasLocalAdminMode, hasSupabaseConfig } from "@/lib/supabase/config";

const clean = (value: string) => String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.]+/g, ".").replace(/^\.+|\.+$/g, "");

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + Math.max(1, months || 3));
  return copy;
}

export async function POST(request: Request) {
  const body = await request.json();
  const amount = Number(body.amount || 0);
  const periodMonths = Number(body.period_months || 3);
  const paymentStatus = String(body.payment_status || (amount > 0 ? "paid" : "waived"));
  const startsAt = body.starts_at ? new Date(String(body.starts_at)) : new Date();
  const expiresAt = addMonths(startsAt, periodMonths);

  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    const id = crypto.randomUUID(), username = clean(body.username || body.full_name) || `client.${id.slice(0, 6)}`, password = body.password || `Nvg-${crypto.randomUUID().slice(0, 8)}!`;
    return NextResponse.json({
      ok: true,
      local: true,
      client: {
        id,
        full_name: body.full_name,
        username,
        email: body.email || null,
        login_email: `${username}@accounts.nutvitaglobalis.local`,
        client_number: `NVG-C-${Date.now().toString().slice(-6)}`,
        phone: body.phone || null,
        whatsapp_phone: body.whatsapp_phone || body.phone || null,
        country: body.country || null,
        city: body.city || null,
        origin: "onsite",
        must_change_password: true,
        partner_access_starts_at: startsAt.toISOString(),
        partner_access_expires_at: expiresAt.toISOString(),
        partner_assignment_status: "active",
      },
      payment: { amount, payment_status: paymentStatus, payment_method: body.payment_method || null, period_months: periodMonths, expires_at: expiresAt.toISOString(), receipt_path: body.receipt_path || null },
      password,
    });
  }

  const session = await createClient(), { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const { data: partner } = await session.from("dietitian_profiles").select("id").eq("candidate_id", user.id).eq("status", "active").maybeSingle();
  if (!partner) return NextResponse.json({ message: "Partenaire actif requis." }, { status: 403 });

  const admin = createAdminClient(), username = clean(body.username || body.full_name), password = String(body.password || `Nvg-${crypto.randomUUID().slice(0, 8)}!`);
  if (username.length < 4) return NextResponse.json({ message: "Le nom utilisateur doit contenir au moins 4 caracteres." }, { status: 400 });

  const loginEmail = `${username}@accounts.nutvitaglobalis.local`;
  const created = await admin.auth.admin.createUser({ email: loginEmail, password, email_confirm: true, user_metadata: { full_name: body.full_name, account_type: "client", username, origin: "onsite" } });
  if (created.error || !created.data.user) return NextResponse.json({ message: created.error?.message || "Creation impossible." }, { status: 400 });

  const clientNumber = `NVG-C-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const { data: client, error } = await admin.from("client_profiles").upsert({
    id: created.data.user.id,
    full_name: body.full_name,
    email: body.email || null,
    login_email: loginEmail,
    username,
    client_number: clientNumber,
    phone: body.phone || null,
    whatsapp_phone: body.whatsapp_phone || body.phone || null,
    country: body.country || null,
    city: body.city || null,
    created_by_partner_id: partner.id,
    assigned_partner_id: partner.id,
    origin: "onsite",
    must_change_password: true,
    partner_access_starts_at: startsAt.toISOString(),
    partner_access_expires_at: expiresAt.toISOString(),
    partner_assignment_status: "active",
  }).select().single();
  if (error) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const { data: payment } = await admin.from("partner_client_payments").insert({
    partner_id: partner.id,
    client_id: client.id,
    amount,
    currency: body.currency || "XOF",
    payment_status: paymentStatus,
    payment_method: body.payment_method || null,
    receipt_path: body.receipt_path || null,
    period_months: periodMonths,
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    notes: body.payment_notes || null,
    created_by: user.id,
  }).select().maybeSingle();

  if (amount > 0 && ["paid", "partial"].includes(paymentStatus)) {
    await admin.from("partner_ledger").insert({
      partner_id: partner.id,
      entry_type: "earning",
      description: `Part partenaire client sur site - ${client.full_name}`,
      amount: Math.round(amount * 0.5),
      currency: body.currency || "XOF",
      status: "approved",
      occurred_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, client, payment, password });
}
