import { NextResponse } from "next/server";
import { renderConsultationDocument } from "@/lib/consultation-record-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const body = await request.json();
  const [{ data: ownDietitian }, { data: admin }] = await Promise.all([
    supabase.from("dietitian_profiles").select("*").eq("candidate_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from("admin_users").select("role").eq("id", user.id).eq("active", true).maybeSingle(),
  ]);
  const adminClient = createAdminClient();
  const { data: supervisedDietitian } = admin?.role === "super_admin" && body.partner_id
    ? await adminClient.from("dietitian_profiles").select("*").eq("id", String(body.partner_id)).eq("status", "active").maybeSingle()
    : { data: null };
  const dietitian = ownDietitian || supervisedDietitian;
  if (!dietitian) return NextResponse.json({ message: "Profil nutritionniste non autorise." }, { status: 403 });

  const { data: client, error: clientError } = await adminClient.from("client_profiles").select("*").eq("id", String(body.client_id)).maybeSingle();
  if (clientError || !client) return NextResponse.json({ message: "Client introuvable." }, { status: 404 });
  const allowed = admin?.role === "super_admin" || client.assigned_partner_id === dietitian.id || client.created_by_partner_id === dietitian.id;
  if (!allowed) return NextResponse.json({ message: "Ce client ne vous est pas affecte." }, { status: 403 });

  const finalizedAt = new Date().toISOString();
  const nextAppointment = body.next_appointment_at ? new Date(body.next_appointment_at).toISOString() : null;
  const profileSnapshot = {
    nom: client.full_name,
    email: client.email,
    telephone: client.phone || client.whatsapp_phone,
    sexe: client.sex,
    naissance: client.birth_date,
    ville: client.city,
    antecedents: client.medical_history,
    allergies: client.allergies,
  };
  const payload = {
    partner_id: dietitian.id,
    client_id: client.id,
    booking_id: body.booking_id || null,
    source: body.source || "online",
    status: "completed",
    scheduled_at: body.scheduled_at ? new Date(body.scheduled_at).toISOString() : finalizedAt,
    started_at: finalizedAt,
    completed_at: finalizedAt,
    finalized_at: finalizedAt,
    reason: body.reason || body.complaint_notes || null,
    summary: body.summary || null,
    objectives: JSON.stringify(body.goals || []),
    recommendations: body.plan?.actions || null,
    meal_plan: body.plan?.meal_plan || null,
    pack_type: body.pack_type || "general",
    child_id: body.child_id || null,
    profile_snapshot: profileSnapshot,
    complaints: body.complaints || [],
    complaint_notes: body.complaint_notes || null,
    goals: body.goals || [],
    care_plan: body.plan || {},
    next_appointment_at: nextAppointment,
    prescription_items: body.prescription_items || [],
    prescription_notes: body.prescription_notes || null,
    clinical_assessments: body.clinical_assessments || {},
    amount: 0,
    payment_status: "waived",
    created_by: user.id,
  };
  const { data: consultation, error } = await adminClient.from("partner_consultations").insert(payload).select("*, client_profiles(*)").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const loginUrl = `${siteUrl}/connexion?identifiant=${encodeURIComponent(client.email || "")}&redirect=${encodeURIComponent("/espace-client/consultations")}`;
  const basePath = `${client.id}/consultations/${consultation.id}`;
  const consultationBytes = await renderConsultationDocument(consultation, client, dietitian, loginUrl);
  const consultationPath = `${basePath}/compte-rendu.pdf`;
  const consultationUpload = await adminClient.storage.from("document-vault").upload(consultationPath, consultationBytes, { contentType: "application/pdf", upsert: true });
  if (consultationUpload.error) return NextResponse.json({ message: consultationUpload.error.message }, { status: 500 });

  let prescriptionPath: string | null = null;
  if (Array.isArray(body.prescription_items) && body.prescription_items.length) {
    const prescriptionBytes = await renderConsultationDocument(consultation, client, dietitian, loginUrl, true);
    prescriptionPath = `${basePath}/ordonnance-examens.pdf`;
    const upload = await adminClient.storage.from("document-vault").upload(prescriptionPath, prescriptionBytes, { contentType: "application/pdf", upsert: true });
    if (upload.error) return NextResponse.json({ message: upload.error.message }, { status: 500 });
  }
  await adminClient.from("partner_consultations").update({ consultation_pdf_path: consultationPath, prescription_pdf_path: prescriptionPath }).eq("id", consultation.id);
  await adminClient.from("vault_documents").insert([
    { owner_id: client.id, client_id: client.id, document_type: "consultation_report", title: `Consultation du ${new Date(finalizedAt).toLocaleDateString("fr-FR")}`, file_path: consultationPath, mime_type: "application/pdf", confidential: true, created_by: user.id },
    ...(prescriptionPath ? [{ owner_id: client.id, client_id: client.id, document_type: "prescription", title: `Ordonnance du ${new Date(finalizedAt).toLocaleDateString("fr-FR")}`, file_path: prescriptionPath, mime_type: "application/pdf", confidential: true, created_by: user.id }] : []),
  ]);

  if (nextAppointment) {
    const roomName = `NutVita-${consultation.id.slice(0, 8)}-${Date.now()}`;
    const { data: conversation } = await adminClient.from("collaboration_conversations").insert({
      title: `Suivi nutritionnel - ${client.full_name || client.email}`,
      conversation_type: "consultation",
      consultation_id: consultation.id,
      created_by: user.id,
    }).select().single();
    if (conversation) {
      await adminClient.from("collaboration_members").upsert([
        { conversation_id: conversation.id, user_id: user.id, member_role: "nutritionist" },
        { conversation_id: conversation.id, user_id: client.id, member_role: "client" },
      ]);
      const { data: call } = await adminClient.from("collaboration_calls").insert({
        conversation_id: conversation.id,
        consultation_id: consultation.id,
        title: `Prochain rendez-vous - ${client.full_name || "Client"}`,
        provider: "jitsi",
        room_name: roomName,
        scheduled_at: nextAppointment,
        duration_minutes: 45,
        status: "scheduled",
        created_by: user.id,
      }).select().single();
      if (call) await adminClient.from("collaboration_call_members").upsert([
        { call_id: call.id, user_id: user.id, invited_by: user.id },
        { call_id: call.id, user_id: client.id, invited_by: user.id },
      ]);
    }
  }

  return NextResponse.json({ ...consultation, consultation_pdf_path: consultationPath, prescription_pdf_path: prescriptionPath });
}
