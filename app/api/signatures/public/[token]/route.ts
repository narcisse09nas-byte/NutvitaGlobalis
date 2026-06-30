import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeSignatureEnvelope, sha256 } from "@/lib/signature-documents";
import { resend } from "@/lib/api";

async function lookup(token: string) {
  const admin = createAdminClient();
  const hash = await sha256(token);
  const { data: recipient } = await admin.from("signature_recipients")
    .select("*,signature_envelopes(*)")
    .eq("access_token_hash", hash)
    .maybeSingle();
  return { admin, recipient };
}

async function signingAvailability(admin: ReturnType<typeof createAdminClient>, recipient: any) {
  const envelope = recipient.signature_envelopes;
  if (envelope.expires_at && new Date(envelope.expires_at).getTime() < Date.now()) return { allowed: false, message: "Cette demande de signature a expire." };
  if (!envelope.signing_order_enabled || recipient.role === "copy") return { allowed: true };
  const { data: prior } = await admin.from("signature_recipients")
    .select("status")
    .eq("envelope_id", recipient.envelope_id)
    .lt("signing_order", recipient.signing_order)
    .neq("role", "copy");
  return (prior || []).every(item => ["signed", "approved"].includes(item.status))
    ? { allowed: true }
    : { allowed: false, message: "Un signataire precedent doit terminer avant vous." };
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { admin, recipient } = await lookup(token);
  if (!recipient || ["cancelled", "expired"].includes(recipient.signature_envelopes?.status)) {
    return NextResponse.json({ message: "Lien invalide ou expire." }, { status: 404 });
  }
  const availability = await signingAvailability(admin, recipient);
  const now = new Date().toISOString();
  if (!recipient.viewed_at) {
    await admin.from("signature_recipients").update({ status: "viewed", viewed_at: now }).eq("id", recipient.id).eq("status", "sent");
    await admin.from("signature_events").insert({ envelope_id: recipient.envelope_id, recipient_id: recipient.id, actor_email: recipient.email, event_type: "viewed" });
  }
  const signed = await admin.storage.from("electronic-signatures").createSignedUrl(recipient.signature_envelopes.original_file_path, 900);
  return NextResponse.json({
    recipient: { id: recipient.id, full_name: recipient.full_name, email: recipient.email, role: recipient.role, status: recipient.status, can_sign: availability.allowed, blocked_message: availability.message },
    envelope: { ...recipient.signature_envelopes, original_url: signed.data?.signedUrl },
  });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { admin, recipient } = await lookup(token);
  if (!recipient || !["sent", "viewed"].includes(recipient.status)) {
    return NextResponse.json({ message: "Cette demande ne peut plus etre signee." }, { status: 409 });
  }
  const availability = await signingAvailability(admin, recipient);
  if (!availability.allowed) return NextResponse.json({ message: availability.message }, { status: 409 });
  const body = await request.json();
  const action = String(body.action || "sign");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  if (action === "decline") {
    await admin.from("signature_recipients").update({ status: "declined", decline_reason: String(body.reason || "") }).eq("id", recipient.id);
    await admin.from("signature_envelopes").update({ status: "declined" }).eq("id", recipient.envelope_id);
    await admin.from("signature_events").insert({ envelope_id: recipient.envelope_id, recipient_id: recipient.id, actor_email: recipient.email, event_type: "declined", ip_address: ip, user_agent: request.headers.get("user-agent"), details: { reason: body.reason } });
    return NextResponse.json({ ok: true });
  }
  if (!body.consent || !String(body.signer_name || "").trim()) {
    return NextResponse.json({ message: "Nom et consentement requis." }, { status: 400 });
  }
  let signaturePath: string | null = null;
  if (recipient.role === "signer") {
    const dataUrl = String(body.signature_data || "");
    const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
    if (!match) return NextResponse.json({ message: "Signature graphique requise." }, { status: 400 });
    const bytes = Uint8Array.from(atob(match[1]), character => character.charCodeAt(0));
    signaturePath = `${recipient.signature_envelopes.sender_id}/signatures/${recipient.envelope_id}-${recipient.id}.png`;
    const upload = await admin.storage.from("electronic-signatures").upload(signaturePath, bytes, { contentType: "image/png", upsert: true });
    if (upload.error) return NextResponse.json({ message: upload.error.message }, { status: 400 });
  }
  const signedAt = new Date().toISOString();
  const signatureHash = await sha256(`${recipient.envelope_id}|${recipient.id}|${recipient.email}|${signedAt}|${recipient.signature_envelopes.original_sha256}`);
  await admin.from("signature_recipients").update({
    status: recipient.role === "approver" ? "approved" : recipient.role === "copy" ? "approved" : "signed",
    signature_path: signaturePath,
    signature_source: recipient.role === "signer" ? "drawn" : null,
    consent_text: "Je reconnais avoir lu le document et accepte de le signer electroniquement.",
    signature_hash: signatureHash,
    signed_at: signedAt,
  }).eq("id", recipient.id);
  await admin.from("signature_events").insert({
    envelope_id: recipient.envelope_id,
    recipient_id: recipient.id,
    actor_email: recipient.email,
    event_type: recipient.role === "signer" ? "signed" : "approved",
    ip_address: ip,
    user_agent: request.headers.get("user-agent"),
    details: { signature_hash: signatureHash },
  });
  const { data: remaining } = await admin.from("signature_recipients").select("id,status,role").eq("envelope_id", recipient.envelope_id).neq("role", "copy");
  const complete = (remaining || []).every(item => ["signed", "approved"].includes(item.id === recipient.id ? (recipient.role === "signer" ? "signed" : "approved") : item.status));
  if (complete) {
    const finalized = await finalizeSignatureEnvelope(admin, recipient.envelope_id);
    if (recipient.signature_envelopes.related_type === "employment_proposal" && recipient.signature_envelopes.related_id) {
      const { data: proposal } = await admin.from("maximus_employment_proposals")
        .update({ status: "accepted", responded_at: signedAt, candidate_response: "Accord confirme par signature electronique." })
        .eq("id", recipient.signature_envelopes.related_id)
        .select("application_id")
        .single();
      if (proposal) {
        const { data: application } = await admin.from("maximus_staff_applications").update({ status: "offer_accepted" }).eq("id", proposal.application_id).select("offer_id,candidate_id").single();
        await admin.from("maximus_recruitment_events").insert({
          process_type: "staff",
          offer_id: application?.offer_id || null,
          staff_application_id: proposal.application_id,
          event_type: "employment_offer_signed",
          from_status: "offer_proposed",
          to_status: "offer_accepted",
          details: { envelope_id: recipient.envelope_id, signature_hash: signatureHash },
          actor_id: application?.candidate_id || null,
          actor_email: recipient.email,
        });
        if (application?.candidate_id) {
          await admin.from("maximus_candidate_notifications").insert({
            candidate_id: application.candidate_id,
            application_id: proposal.application_id,
            title: "Proposition signee",
            message: "Votre accord a ete enregistre et la proposition signee est disponible dans votre espace.",
            action_url: "/signatures",
          });
        }
      }
    }
    const file = await admin.storage.from("electronic-signatures").download(finalized.final_file_path);
    const content = file.data ? Buffer.from(await file.data.arrayBuffer()).toString("base64") : undefined;
    const { data: parties } = await admin.from("signature_recipients").select("email").eq("envelope_id", recipient.envelope_id);
    const sender = await admin.auth.admin.getUserById(recipient.signature_envelopes.sender_id);
    const emails = Array.from(new Set([...(parties || []).map(item => item.email), sender.data.user?.email].filter(Boolean))) as string[];
    await Promise.allSettled(emails.map(email => resend("/emails", {
      from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
      to: [email],
      subject: `Document signe - ${recipient.signature_envelopes.title}`,
      text: "Le processus de signature est termine. Une copie certifiee est jointe et reste disponible sur la plateforme.",
      attachments: content ? [{ filename: `${recipient.signature_envelopes.reference}.pdf`, content }] : undefined,
    })));
  } else {
    await admin.from("signature_envelopes").update({ status: "partially_signed" }).eq("id", recipient.envelope_id);
  }
  return NextResponse.json({ ok: true, completed: complete });
}
