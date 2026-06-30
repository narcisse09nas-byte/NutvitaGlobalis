import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resend } from "@/lib/api";

type Envelope = Record<string, any>;

function wrap(value: string, width = 88) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
}

export async function finalizeSignatureEnvelope(supabase: SupabaseClient, envelopeId: string) {
  const { data: envelope, error } = await supabase
    .from("signature_envelopes")
    .select("*,signature_recipients(*),signature_events(*)")
    .eq("id", envelopeId)
    .single();
  if (error || !envelope) throw error || new Error("Enveloppe introuvable.");

  const download = await supabase.storage.from("electronic-signatures").download(envelope.original_file_path);
  if (download.error) throw download.error;
  const original = new Uint8Array(await download.data.arrayBuffer());
  const pdf = envelope.original_mime_type === "application/pdf"
    ? await PDFDocument.load(original)
    : await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 790;
  page.drawText("Certificat de signature electronique", { x: 45, y, size: 18, font: bold, color: rgb(.07, .24, .19) });
  y -= 30;
  for (const value of [
    `Reference : ${envelope.reference}`,
    `Document : ${envelope.original_file_name}`,
    `Empreinte originale SHA-256 : ${envelope.original_sha256}`,
    `Finalise le : ${new Date().toISOString()}`,
  ]) {
    for (const line of wrap(value)) {
      page.drawText(line, { x: 45, y, size: 9, font: regular });
      y -= 14;
    }
  }
  for (const recipient of envelope.signature_recipients || []) {
    y -= 14;
    page.drawText(`${recipient.full_name} (${recipient.email})`, { x: 45, y, size: 11, font: bold });
    y -= 16;
    page.drawText(`Statut : ${recipient.status} - Date : ${recipient.signed_at || "N/A"}`, { x: 45, y, size: 9, font: regular });
    y -= 14;
    page.drawText(`Empreinte : ${recipient.signature_hash || "N/A"}`, { x: 45, y, size: 8, font: regular });
    y -= 14;
  }
  page.drawText("La piste d audit complete est conservee par NutVitaGlobalis.", { x: 45, y: 45, size: 8, font: regular, color: rgb(.4, .4, .4) });

  const finalBytes = await pdf.save();
  const finalPath = `${envelope.sender_id}/completed/${envelope.id}.pdf`;
  const upload = await supabase.storage.from("electronic-signatures").upload(finalPath, finalBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upload.error) throw upload.error;
  await supabase.from("signature_envelopes").update({
    final_file_path: finalPath,
    certificate_file_path: finalPath,
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", envelope.id);
  return { ...envelope, final_file_path: finalPath };
}

export async function sha256(value: ArrayBuffer | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(item => item.toString(16).padStart(2, "0")).join("");
}

export async function createEmploymentProposalPdf(input: {
  candidateName: string;
  position: string;
  contractType: string;
  startDate?: string | null;
  salary?: number | null;
  currency: string;
  terms: string;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 785;
  page.drawText("NUTVITAGLOBALIS", { x: 45, y, size: 18, font: bold, color: rgb(.07, .24, .19) });
  y -= 38;
  page.drawText("Proposition d embauche", { x: 45, y, size: 20, font: bold });
  y -= 35;
  const sections = [
    `Candidat : ${input.candidateName}`,
    `Poste : ${input.position}`,
    `Type de contrat : ${input.contractType || "A definir"}`,
    `Date de prise de fonction : ${input.startDate || "A convenir"}`,
    `Remuneration proposee : ${input.salary ? `${input.salary.toLocaleString("fr-FR")} ${input.currency}` : "Selon les termes convenus"}`,
    "",
    "Termes de la proposition :",
    input.terms,
  ];
  for (const value of sections) {
    for (const line of wrap(value, 82)) {
      page.drawText(line || " ", { x: 45, y, size: 11, font: value === "Termes de la proposition :" ? bold : regular });
      y -= 17;
      if (y < 80) y = 785;
    }
  }
  page.drawText("La signature electronique vaut confirmation de lecture et accord du candidat.", { x: 45, y: 55, size: 8, font: regular, color: rgb(.4, .4, .4) });
  return pdf.save();
}

export async function createSignatureEnvelope(input: {
  supabase: SupabaseClient;
  senderId: string;
  senderEmail?: string;
  title: string;
  message?: string;
  fileBytes: Uint8Array;
  fileName: string;
  recipientName: string;
  recipientEmail: string;
  recipientUserId?: string | null;
  relatedType?: string;
  relatedId?: string;
}) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const reference = `ES${new Date().getFullYear()}${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const originalPath = `${input.senderId}/originals/${reference}.pdf`;
  const upload = await input.supabase.storage.from("electronic-signatures").upload(originalPath, input.fileBytes, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw upload.error;
  const originalHash = await sha256(input.fileBytes.buffer as ArrayBuffer);
  const { data: envelope, error } = await input.supabase.from("signature_envelopes").insert({
    reference,
    sender_id: input.senderId,
    title: input.title,
    message: input.message || null,
    original_file_path: originalPath,
    original_file_name: input.fileName,
    original_mime_type: "application/pdf",
    original_sha256: originalHash,
    status: "sent",
    related_type: input.relatedType || null,
    related_id: input.relatedId || null,
    sent_at: new Date().toISOString(),
  }).select("*").single();
  if (error) throw error;
  const recipient = await input.supabase.from("signature_recipients").insert({
    envelope_id: envelope.id,
    user_id: input.recipientUserId || null,
    email: input.recipientEmail.toLowerCase(),
    full_name: input.recipientName,
    role: "signer",
    access_token: token,
    access_token_hash: await sha256(token),
    status: "sent",
    sent_at: new Date().toISOString(),
  });
  if (recipient.error) throw recipient.error;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/signature/${token}`;
  await resend("/emails", {
    from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
    to: [input.recipientEmail],
    subject: `Signature requise - ${input.title}`,
    text: `Bonjour ${input.recipientName},\n\n${input.message || "Un document vous attend pour signature."}\n\nConsulter et signer : ${url}\n\nNutVitaGlobalis`,
    attachments: [{ filename: input.fileName, content: Buffer.from(input.fileBytes).toString("base64") }],
  }).catch(() => undefined);
  return envelope;
}
