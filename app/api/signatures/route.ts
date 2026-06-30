import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmail, resend } from "@/lib/api";
import { sha256 } from "@/lib/signature-documents";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const email = user.email || "";
  const admin = createAdminClient();
  const [sent, received, profile] = await Promise.all([
    admin.from("signature_envelopes").select("*,signature_recipients(*)").eq("sender_id", user.id).order("created_at", { ascending: false }),
    supabase.from("signature_recipients").select("*,signature_envelopes(*)").or(`user_id.eq.${user.id},email.ilike.${email}`).order("created_at", { ascending: false }),
    supabase.from("signature_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const receivedRows = await Promise.all((received.data || []).map(async item => {
    const path = item.signature_envelopes?.final_file_path;
    const final = path ? await admin.storage.from("electronic-signatures").createSignedUrl(path, 900) : null;
    return { ...item, signing_url: item.access_token ? `/signature/${item.access_token}` : null, final_url: final?.data?.signedUrl || null };
  }));
  const sentRows = await Promise.all((sent.data || []).map(async item => {
    const final = item.final_file_path ? await admin.storage.from("electronic-signatures").createSignedUrl(item.final_file_path, 900) : null;
    return { ...item, final_url: final?.data?.signedUrl || null };
  }));
  return NextResponse.json({ sent: sentRows, received: receivedRows, profile: profile.data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const body = await request.json();
  const title = String(body.title || "").trim();
  const path = String(body.original_file_path || "");
  const mimeType = String(body.original_mime_type || "");
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  if (!title || !path.startsWith(`${user.id}/`) || !recipients.length) {
    return NextResponse.json({ message: "Document, titre et destinataires sont requis." }, { status: 400 });
  }
  if (mimeType !== "application/pdf") {
    return NextResponse.json({ message: "Le format PDF est requis pour garantir une copie finale certifiee contenant le document original." }, { status: 400 });
  }
  if (recipients.some((item: any) => !isEmail(String(item.email || "")))) {
    return NextResponse.json({ message: "Une adresse email de destinataire est invalide." }, { status: 400 });
  }
  const download = await supabase.storage.from("electronic-signatures").download(path);
  if (download.error) return NextResponse.json({ message: download.error.message }, { status: 400 });
  const originalHash = await sha256(await download.data.arrayBuffer());
  const admin = createAdminClient();
  const reference = `ES${new Date().getFullYear()}${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const { data: envelope, error } = await admin.from("signature_envelopes").insert({
    reference,
    sender_id: user.id,
    title,
    message: String(body.message || "").trim() || null,
    original_file_path: path,
    original_file_name: String(body.original_file_name || "document.pdf"),
    original_mime_type: mimeType,
    original_sha256: originalHash,
    signing_order_enabled: Boolean(body.signing_order_enabled),
    status: "sent",
    related_type: body.related_type || null,
    related_id: body.related_id || null,
    expires_at: body.expires_at || null,
    sent_at: new Date().toISOString(),
  }).select("*").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  const rawTokens = recipients.map(() => crypto.randomUUID() + crypto.randomUUID());
  const rows = await Promise.all(recipients.map(async (item: any, index: number) => ({
    envelope_id: envelope.id,
    email: String(item.email).trim().toLowerCase(),
    full_name: String(item.full_name || item.email).trim(),
    role: ["signer", "approver", "copy"].includes(item.role) ? item.role : "signer",
    signing_order: Number(item.signing_order || index + 1),
    access_token: rawTokens[index],
    access_token_hash: await sha256(rawTokens[index]),
    status: "sent",
    sent_at: new Date().toISOString(),
  })));
  const inserted = await admin.from("signature_recipients").insert(rows).select("*");
  if (inserted.error) {
    await admin.from("signature_envelopes").delete().eq("id", envelope.id);
    return NextResponse.json({ message: inserted.error.message }, { status: 400 });
  }
  await admin.from("signature_events").insert({
    envelope_id: envelope.id,
    actor_id: user.id,
    actor_email: user.email,
    event_type: "sent",
    details: { recipient_count: rows.length, original_sha256: originalHash },
  });
  await Promise.allSettled(rows.map((recipient, index) => resend("/emails", {
    from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
    to: [recipient.email],
    subject: `Signature requise - ${title}`,
    text: `Bonjour ${recipient.full_name},\n\nUn document vous a ete envoye pour consultation et signature electronique.\n\n${body.message || ""}\n\nOuvrir le document : ${siteUrl}/signature/${rawTokens[index]}\n\nCe lien est personnel et ne doit pas etre partage.\n\nNutVitaGlobalis`,
  })));
  return NextResponse.json({ envelope: { ...envelope, signature_recipients: inserted.data } });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const body = await request.json();
  const admin = createAdminClient();
  if (body.action === "profile") {
    const displayName = String(body.display_name || "").trim();
    const initials = String(body.initials || "").trim().slice(0, 8).toUpperCase();
    if (!displayName || !initials) return NextResponse.json({ message: "Nom et initiales requis." }, { status: 400 });
    const result = await admin.from("signature_profiles").upsert({
      user_id: user.id,
      display_name: displayName,
      initials,
      signature_path: body.signature_path || null,
      updated_at: new Date().toISOString(),
    }).select("*").single();
    return result.error ? NextResponse.json({ message: result.error.message }, { status: 400 }) : NextResponse.json({ profile: result.data });
  }
  if (body.action === "cancel") {
    const result = await admin.from("signature_envelopes").update({ status: "cancelled" }).eq("id", body.envelope_id).eq("sender_id", user.id).in("status", ["draft", "sent", "viewed", "partially_signed"]);
    return result.error ? NextResponse.json({ message: result.error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  return NextResponse.json({ message: "Action inconnue." }, { status: 400 });
}
