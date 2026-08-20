import { NextResponse } from "next/server";
import { resend } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RequestType = "dietetic" | "medical";

function text(value: unknown, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function validDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isFinite(date.getTime()) ? date : null;
}

async function email(to: string | null | undefined, subject: string, content: string, actionUrl?: string) {
  if (!to) return;
  try {
    await resend("/emails", {
      from: process.env.RESEND_FROM_EMAIL || "NutVitaGlobalis <contact@nutvitaglobalis.com>",
      to,
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#123b31"><h2>${subject}</h2><p>${content}</p>${actionUrl ? `<p><a href="${actionUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#087a52;color:white;text-decoration:none;font-weight:700">Ouvrir NutVitaGlobalis</a></p>` : ""}</div>`,
    });
  } catch (error) {
    console.error("Care request email failed", error);
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !user.email) return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  const admin = createAdminClient();
  const body = await request.json();
  const action = text(body.action, 40) || "create";
  const requestType = text(body.request_type, 20) as RequestType;
  if (!(["dietetic", "medical"] as string[]).includes(requestType)) return NextResponse.json({ message: "Type de consultation invalide." }, { status: 400 });

  if (action === "create") {
    const professionalId = text(body.professional_id, 80) || null;
    const requestedStart = validDate(body.requested_start);
    const duration = Math.max(15, Math.min(240, Number(body.duration_minutes || 45)));
    if (!requestedStart || requestedStart.getTime() < Date.now() - 60_000) return NextResponse.json({ message: "Choisissez un créneau futur valide." }, { status: 400 });
    const requestedEnd = new Date(requestedStart.getTime() + duration * 60_000);
    const careNeed = text(body.care_need, 240);
    const reason = text(body.reason, 3000);
    if (!careNeed || !reason) return NextResponse.json({ message: "Précisez votre besoin et le motif de consultation." }, { status: 400 });

    const { data: currentProfile } = await admin.from("client_profiles").select("id,full_name,email,country,city,preferred_language").eq("id", user.id).maybeSingle();
    const profile = currentProfile || (await admin.from("client_profiles").upsert({
      id: user.id,
      full_name: text(user.user_metadata?.full_name, 180) || user.email,
      email: user.email,
    }, { onConflict: "id" }).select("id,full_name,email,country,city,preferred_language").single()).data;
    if (!profile) return NextResponse.json({ message: "Profil client indisponible." }, { status: 400 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    if (requestType === "dietetic") {
      const { data: service } = await admin.from("teleconseils").select("id").eq("status", "active").order("created_at").limit(1).maybeSingle();
      if (!service) return NextResponse.json({ message: "Le service de consultation nutritionnelle doit être activé par l’administration." }, { status: 409 });
      let professional: any = null;
      if (professionalId) {
        const result = await admin.from("dietitian_profiles").select("id,candidate_id,full_name,status").eq("id", professionalId).eq("status", "active").maybeSingle();
        professional = result.data;
        if (!professional) return NextResponse.json({ message: "Nutritionniste indisponible." }, { status: 404 });
      }
      const { data: row, error } = await admin.from("consultation_waiting_room").insert({
        client_id: user.id,
        teleconseil_id: service.id,
        reason,
        care_need: careNeed,
        other_care_need: text(body.other_care_need, 500) || null,
        allow_alternative: body.allow_alternative !== false,
        requested_start: requestedStart.toISOString(),
        requested_end: requestedEnd.toISOString(),
        consultation_mode: text(body.consultation_mode, 30) || "video",
        preferred_language: text(body.locale, 5) || profile.preferred_language || "fr",
        country: profile.country || null,
        city: profile.city || null,
        selected_partner_id: professional?.id || null,
        status: professional ? "assigned_pending_partner" : "waiting",
      }).select("id,request_code").single();
      if (error || !row) return NextResponse.json({ message: error?.message || "Demande impossible." }, { status: 400 });
      if (professional?.candidate_id) {
        await admin.from("care_request_notifications").insert({
          user_id: professional.candidate_id, request_type: "dietetic", request_id: row.id,
          title_fr: "Nouvelle demande de consultation", title_en: "New consultation request",
          message_fr: `${profile.full_name || "Un client"} vous propose un rendez-vous.`,
          message_en: `${profile.full_name || "A client"} requested an appointment with you.`,
          link_url: "/partenaire/salle-attente",
        });
        const professionalUser = await admin.auth.admin.getUserById(professional.candidate_id);
        await email(professionalUser.data.user?.email, "Nouvelle demande de consultation NutVitaGlobalis", `${profile.full_name || "Un client"} vous a sélectionné. Consultez la demande et confirmez ou ajustez le créneau.`, `${siteUrl}/partenaire/salle-attente`);
      }
      return NextResponse.json({ ok: true, request_id: row.id, code: row.request_code });
    }

    if (!professionalId) return NextResponse.json({ message: "Sélectionnez un médecin spécialiste." }, { status: 400 });
    const { data: specialist } = await admin.from("medical_specialists").select("id,user_id,email,full_name").eq("id", professionalId).eq("active", true).maybeSingle();
    if (!specialist) return NextResponse.json({ message: "Médecin spécialiste indisponible." }, { status: 404 });
    const { data: row, error } = await admin.from("medical_consultations").insert({
      specialist_id: specialist.id,
      client_id: user.id,
      scheduled_at: requestedStart.toISOString(),
      requested_start: requestedStart.toISOString(),
      requested_end: requestedEnd.toISOString(),
      consultation_mode: text(body.consultation_mode, 30) || "video",
      chief_complaint: reason,
      care_need: careNeed,
      other_care_need: text(body.other_care_need, 500) || null,
      allow_alternative: body.allow_alternative !== false,
      status: "requested",
    }).select("id,consultation_code").single();
    if (error || !row) return NextResponse.json({ message: error?.message || "Demande impossible." }, { status: 400 });
    await admin.from("care_request_notifications").insert({
      user_id: specialist.user_id, request_type: "medical", request_id: row.id,
      title_fr: "Nouvelle demande de consultation médicale", title_en: "New medical consultation request",
      message_fr: `${profile.full_name || "Un client"} vous propose un rendez-vous.`,
      message_en: `${profile.full_name || "A client"} requested an appointment with you.`,
      link_url: "/medecin-specialiste",
    });
    await email(specialist.email, "Nouvelle demande de consultation médicale", `${profile.full_name || "Un client"} vous a sélectionné. Consultez la demande et confirmez ou ajustez le créneau.`, `${siteUrl}/medecin-specialiste`);
    return NextResponse.json({ ok: true, request_id: row.id, code: row.consultation_code });
  }

  if (action === "accept") {
    const requestId = text(body.request_id, 80);
    const proposedStart = validDate(body.proposed_start);
    const duration = Math.max(15, Math.min(240, Number(body.duration_minutes || 45)));
    if (!requestId || !proposedStart) return NextResponse.json({ message: "Demande et horaire requis." }, { status: 400 });
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60_000);
    const now = new Date().toISOString();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    let clientId = "", clientEmail = "", clientName = "", paymentPath = "";

    if (requestType === "dietetic") {
      const { data: partner } = await admin.from("dietitian_profiles").select("id,candidate_id,full_name").eq("candidate_id", user.id).eq("status", "active").maybeSingle();
      if (!partner) return NextResponse.json({ message: "Profil nutritionniste requis." }, { status: 403 });
      const { data: row } = await admin.from("consultation_waiting_room").select("id,client_id,selected_partner_id").eq("id", requestId).maybeSingle();
      if (!row || (row.selected_partner_id && row.selected_partner_id !== partner.id)) return NextResponse.json({ message: "Demande inaccessible." }, { status: 403 });
      const update = await admin.from("consultation_waiting_room").update({ selected_partner_id: partner.id, status: "accepted_pending_payment", proposed_start: proposedStart.toISOString(), proposed_end: proposedEnd.toISOString(), accepted_at: now, payment_ready_at: now, partner_endorsed_at: now }).eq("id", requestId);
      if (update.error) return NextResponse.json({ message: update.error.message }, { status: 400 });
      clientId = row.client_id;
      paymentPath = `/espace-client/paiement-consultation?type=dietetic&request=${requestId}`;
    } else {
      const { data: specialist } = await admin.from("medical_specialists").select("id,user_id,full_name").eq("user_id", user.id).eq("active", true).maybeSingle();
      if (!specialist) return NextResponse.json({ message: "Profil médecin requis." }, { status: 403 });
      const { data: row } = await admin.from("medical_consultations").select("id,client_id,specialist_id").eq("id", requestId).eq("specialist_id", specialist.id).maybeSingle();
      if (!row) return NextResponse.json({ message: "Demande inaccessible." }, { status: 403 });
      const update = await admin.from("medical_consultations").update({ status: "accepted_pending_payment", scheduled_at: proposedStart.toISOString(), proposed_start: proposedStart.toISOString(), proposed_end: proposedEnd.toISOString(), accepted_at: now, payment_ready_at: now }).eq("id", requestId);
      if (update.error) return NextResponse.json({ message: update.error.message }, { status: 400 });
      clientId = row.client_id;
      paymentPath = `/espace-client/paiement-consultation?type=medical&request=${requestId}`;
    }

    const { data: client } = await admin.from("client_profiles").select("full_name,email,preferred_language").eq("id", clientId).maybeSingle();
    clientEmail = client?.email || "";
    clientName = client?.full_name || "Client";
    const clientEnglish = client?.preferred_language === "en";
    const dateLabel = proposedStart.toLocaleString(clientEnglish ? "en-GB" : "fr-FR", { dateStyle: "long", timeStyle: "short" });
    const notificationTitle = clientEnglish ? "Appointment accepted — payment required" : "Rendez-vous accepté — paiement requis";
    const notificationMessage = clientEnglish
      ? `Your professional confirmed the appointment on ${dateLabel}. Choose your payment method to activate the consultation.`
      : `Votre professionnel a confirmé le rendez-vous du ${dateLabel}. Choisissez votre moyen de paiement pour activer la consultation.`;
    await admin.from("client_notifications").insert({
      client_id: clientId,
      title: notificationTitle,
      message: notificationMessage,
      link_url: paymentPath,
    });
    await email(clientEmail, clientEnglish ? "Your NutVitaGlobalis appointment was accepted" : "Votre rendez-vous NutVitaGlobalis est accepté", clientEnglish ? `Hello ${clientName}, your appointment on ${dateLabel} is confirmed subject to payment. You may pay by bank transfer, credit card or Mobile Money.` : `Bonjour ${clientName}, votre rendez-vous du ${dateLabel} est confirmé sous réserve du paiement. Vous pouvez choisir le virement bancaire, la carte ou le Mobile Money.`, `${siteUrl}${paymentPath}`);
    return NextResponse.json({ ok: true, payment_url: paymentPath });
  }

  return NextResponse.json({ message: "Action invalide." }, { status: 400 });
}
