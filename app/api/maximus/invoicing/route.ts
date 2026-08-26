import { NextResponse } from "next/server";
import { requireMaximusApi } from "@/lib/maximus-api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail } from "@/lib/system-email";
import { generateTemporaryPassword } from "@/lib/temp-password";
import { computeInvoiceTotals } from "@/lib/maximus-invoice";

const MODULE = "finance/invoicing";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "invoices";
  const ctx = await requireMaximusApi(MODULE, "viewer");
  if ("error" in ctx) return ctx.error;
  const admin = createAdminClient();

  if (resource === "invoices") {
    const type = url.searchParams.get("type") || "service";
    const result = await admin.from("maximus_invoices").select("*, maximus_invoice_lines(*)").eq("invoice_type", type).order("created_at", { ascending: false });
    if (result.error) return NextResponse.json({ message: result.error.message }, { status: 400 });
    const canEndorse = ctx.isSuperAdmin || !!ctx.access?.functions?.includes("validator");
    return NextResponse.json({ items: result.data || [], canEndorse });
  }
  if (resource === "clients") {
    const query = String(url.searchParams.get("query") || "").trim().replace(/[,%]/g, "");
    let builder = admin.from("client_profiles").select("id, full_name, email, phone").order("full_name").limit(20);
    if (query) builder = builder.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
    const result = await builder;
    return NextResponse.json({ items: result.data || [] });
  }
  if (resource === "pos-partners") {
    const result = await admin.from("partner_vendor_registry").select("*").eq("partner_type", "point_de_vente").order("full_name");
    return NextResponse.json({ items: result.data || [] });
  }
  if (resource === "specialists") {
    const kind = url.searchParams.get("kind") || "medical";
    if (kind === "dietetic") {
      const result = await admin.from("dietitian_profiles").select("id, full_name").eq("status", "active").order("full_name");
      return NextResponse.json({ items: result.data || [] });
    }
    const result = await admin.from("medical_specialists").select("id, full_name, specialty").eq("active", true).order("full_name");
    return NextResponse.json({ items: result.data || [] });
  }
  if (resource === "financial-accounts") {
    const result = await admin.from("maximus_financial_accounts").select("*").eq("active", true).order("name");
    return NextResponse.json({ items: result.data || [] });
  }
  return NextResponse.json({ message: "Ressource invalide." }, { status: 400 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "create-pos-partner") {
    const ctx = await requireMaximusApi(MODULE, "creator");
    if ("error" in ctx) return ctx.error;
    const fullName = String(body.full_name || "").trim();
    if (!fullName) return NextResponse.json({ message: "Nom du point de vente requis." }, { status: 400 });
    const admin = createAdminClient();
    const result = await admin.from("partner_vendor_registry").insert({
      partner_type: "point_de_vente", full_name: fullName,
      email: String(body.email || "").trim() || null, phone: String(body.phone || "").trim() || null,
      country: String(body.country || "").trim() || null, city: String(body.city || "").trim() || null,
      status: "active",
    }).select("*").single();
    if (result.error) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json({ item: result.data });
  }

  if (action === "create") {
    const ctx = await requireMaximusApi(MODULE, "creator");
    if ("error" in ctx) return ctx.error;
    const admin = createAdminClient();

    const invoiceType = String(body.invoice_type || "service") as "service" | "proforma" | "pos_meals";
    const purchaseType = body.purchase_type ? String(body.purchase_type) : null;
    const linesInput = (Array.isArray(body.lines) ? body.lines : [])
      .map((entry: Record<string, unknown>) => ({ description: String(entry.description || "").trim(), quantity: Number(entry.quantity || 0), unit_price: Number(entry.unit_price || 0) }))
      .filter((entry: { description: string; quantity: number }) => entry.description && entry.quantity > 0);
    if (!linesInput.length) return NextResponse.json({ message: "Au moins une ligne (quantite > 0) est requise." }, { status: 400 });

    const taxRate = Number(body.tax_rate || 0);
    const { computedLines, priceExcludingTax, taxAmount, totalIncludingTax } = computeInvoiceTotals(linesInput, taxRate);

    let clientId: string | null = body.existing_client_id ? String(body.existing_client_id) : null;
    let clientName = String(body.client_name || "").trim() || null;
    let clientEmail = String(body.client_email || "").trim().toLowerCase() || null;
    const clientPhone = String(body.client_phone || "").trim() || null;
    let newClientTempPasswordSent = false;
    let createdClientId: string | null = null;

    if (!clientId && invoiceType !== "pos_meals" && body.new_client) {
      const newClient = body.new_client as Record<string, unknown>;
      const fullName = String(newClient.full_name || "").trim();
      const email = String(newClient.email || "").trim().toLowerCase();
      if (!fullName || !email) return NextResponse.json({ message: "Nom et email du nouveau client sont requis." }, { status: 400 });
      const temporaryPassword = generateTemporaryPassword();
      const created = await admin.auth.admin.createUser({
        email, password: temporaryPassword, email_confirm: true,
        user_metadata: { full_name: fullName, account_type: "client", origin: "maximus_invoicing" },
      });
      if (created.error || !created.data.user) return NextResponse.json({ message: created.error?.message || "Creation du compte client impossible." }, { status: 400 });
      const profileResult = await admin.from("client_profiles").upsert({
        id: created.data.user.id, full_name: fullName, email, phone: newClient.phone || null,
        country: newClient.country || null, city: newClient.city || null, state_region: newClient.state_region || null,
        birth_date: newClient.birth_date || null, sex: newClient.sex || null,
        must_change_password: true, origin: "onsite",
      }).select("*").single();
      if (profileResult.error) {
        await admin.auth.admin.deleteUser(created.data.user.id);
        return NextResponse.json({ message: profileResult.error.message }, { status: 400 });
      }
      createdClientId = created.data.user.id;
      clientId = created.data.user.id;
      clientName = fullName;
      clientEmail = email;
      await sendSystemEmail(admin, "maximus_invoice_client_credentials", email, { name: fullName, username: email, password: temporaryPassword });
      newClientTempPasswordSent = true;
    }

    const partnerVendorId = invoiceType === "pos_meals" ? (body.partner_vendor_id ? String(body.partner_vendor_id) : null) : null;
    if (invoiceType === "pos_meals" && !partnerVendorId) return NextResponse.json({ message: "Point de vente requis." }, { status: 400 });

    const submitImmediately = invoiceType === "service" && !!body.submit_immediately;
    const now = new Date().toISOString();

    const invoiceInsert = await admin.from("maximus_invoices").insert({
      invoice_type: invoiceType,
      status: invoiceType === "service" ? (submitImmediately ? "submitted" : "draft") : "issued",
      submitted_at: submitImmediately ? now : null,
      submitted_by: submitImmediately ? ctx.user.id : null,
      purchase_type: purchaseType,
      client_id: clientId, client_name: clientName, client_email: clientEmail, client_phone: clientPhone,
      client_address: String(body.client_address || "").trim() || null,
      partner_vendor_id: partnerVendorId,
      currency: String(body.currency || "XOF"),
      price_excluding_tax: priceExcludingTax, tax_rate: taxRate, tax_amount: taxAmount, total_including_tax: totalIncludingTax,
      payment_method: invoiceType === "service" ? (String(body.payment_method || "").trim() || null) : null,
      period_months: body.period_months ? Number(body.period_months) : null,
      notes: String(body.notes || "").trim() || null,
      new_client_temp_password_sent: newClientTempPasswordSent,
      created_by: ctx.user.id,
    }).select("*").single();
    if (invoiceInsert.error) return NextResponse.json({ message: invoiceInsert.error.message }, { status: 400 });
    const invoice = invoiceInsert.data;

    const linesResult = await admin.from("maximus_invoice_lines").insert(
      computedLines.map(entry => ({ invoice_id: invoice.id, position: entry.position, description: entry.description, quantity: entry.quantity, unit_price: entry.unit_price, line_total: entry.line_total })),
    ).select("*");
    if (linesResult.error) return NextResponse.json({ message: linesResult.error.message }, { status: 400 });

    // Consultation / waiting-room wiring happens immediately regardless of the invoice's own
    // draft/submitted/endorsed status — the client is physically present and shouldn't wait on a
    // back-office financial reconciliation step.
    let consultationId: string | null = null;
    let waitingRoomId: string | null = null;
    let assignedType: string | null = null;
    let assignedId: string | null = null;

    if (purchaseType === "medical_consultation" && clientId) {
      const assignment = (body.consultation_assignment || {}) as Record<string, unknown>;
      const direct = assignment.mode === "direct" && assignment.specialist_id;
      const consultationInsert = await admin.from("medical_consultations").insert({
        specialist_id: direct ? String(assignment.specialist_id) : null,
        client_id: clientId,
        status: direct ? "scheduled" : "pending_assignment",
        chief_complaint: String(body.chief_complaint || "").trim() || null,
      }).select("*").single();
      if (consultationInsert.error) return NextResponse.json({ message: consultationInsert.error.message }, { status: 400 });
      consultationId = consultationInsert.data.id;
      if (direct) { assignedType = "medical_specialist"; assignedId = String(assignment.specialist_id); }
    } else if (purchaseType === "dietetic_consultation" && clientId) {
      const assignment = (body.consultation_assignment || {}) as Record<string, unknown>;
      const direct = assignment.mode === "direct" && assignment.specialist_id;
      const waitingRoomInsert = await admin.from("consultation_waiting_room").insert({
        client_id: clientId,
        selected_partner_id: direct ? String(assignment.specialist_id) : null,
        status: direct ? "assigned_pending_partner" : "waiting",
        reason: String(body.chief_complaint || "").trim() || null,
      }).select("*").single();
      if (waitingRoomInsert.error) return NextResponse.json({ message: waitingRoomInsert.error.message }, { status: 400 });
      waitingRoomId = waitingRoomInsert.data.id;
      if (direct) { assignedType = "dietitian"; assignedId = String(assignment.specialist_id); }
    }

    if (consultationId || waitingRoomId) {
      await admin.from("maximus_invoices").update({
        consultation_id: consultationId, dietetic_waiting_room_id: waitingRoomId,
        assigned_specialist_type: assignedType, assigned_specialist_id: assignedId,
        sent_to_waiting_room: !assignedType,
      }).eq("id", invoice.id);
    }

    return NextResponse.json({ item: { ...invoice, maximus_invoice_lines: linesResult.data || [] }, created_client_id: createdClientId });
  }

  if (action === "submit") {
    const ctx = await requireMaximusApi(MODULE, "creator");
    if ("error" in ctx) return ctx.error;
    const invoiceId = String(body.invoice_id || "");
    if (!invoiceId) return NextResponse.json({ message: "Facture manquante." }, { status: 400 });
    const admin = createAdminClient();
    const result = await admin.from("maximus_invoices")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), submitted_by: ctx.user.id })
      .eq("id", invoiceId).eq("status", "draft").select("*").single();
    if (result.error) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json({ item: result.data });
  }

  if (action === "endorse") {
    const ctx = await requireMaximusApi(MODULE, "validator");
    if ("error" in ctx) return ctx.error;
    const invoiceId = String(body.invoice_id || "");
    const accountId = String(body.account_id || "");
    const reference = String(body.reference || "").trim();
    if (!invoiceId || !accountId) return NextResponse.json({ message: "Facture et compte de reception sont requis." }, { status: 400 });
    const admin = createAdminClient();
    const result = await admin.rpc("endorse_maximus_invoice", { p_invoice_id: invoiceId, p_account_id: accountId, p_reference: reference, p_actor: ctx.user.id });
    if (result.error) return NextResponse.json({ message: result.error.message }, { status: 400 });
    const invoice = result.data as Record<string, any>;

    if (invoice.purchase_type === "subscription" && invoice.client_id) {
      const periodMonths = Math.max(1, Number(invoice.period_months || 3));
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + periodMonths);
      await admin.from("platform_service_access").upsert({
        user_id: invoice.client_id, service_key: "teleconsultation", roles: ["client"], active: true,
        granted_by: ctx.user.id, expires_at: expiresAt.toISOString(),
      }, { onConflict: "user_id,service_key" });
    }
    return NextResponse.json({ item: invoice });
  }

  if (action === "reject") {
    const ctx = await requireMaximusApi(MODULE, "validator");
    if ("error" in ctx) return ctx.error;
    const invoiceId = String(body.invoice_id || "");
    if (!invoiceId) return NextResponse.json({ message: "Facture manquante." }, { status: 400 });
    const admin = createAdminClient();
    const result = await admin.from("maximus_invoices")
      .update({ status: "rejected", rejected_at: new Date().toISOString(), rejected_by: ctx.user.id, rejection_reason: String(body.reason || "").trim() || null })
      .eq("id", invoiceId).eq("status", "submitted").select("*").single();
    if (result.error) return NextResponse.json({ message: result.error.message }, { status: 400 });
    return NextResponse.json({ item: result.data });
  }

  return NextResponse.json({ message: "Action invalide." }, { status: 400 });
}
