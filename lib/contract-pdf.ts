import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNutvitaDocumentBranding } from "@/lib/pdf-branding";

type Contract = Record<string, any>;

const wrap = (text: string, max = 88) => {
  const words = text.split(/\s+/), lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
};

export async function renderContractPdf(supabase: SupabaseClient, contract: Contract) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = await createNutvitaDocumentBranding(pdf);
  const signatures = contract.contract_signatures || [];
  let page = pdf.addPage([595, 842]), y = 670;
  brand(page);

  const addPage = () => {
    page = pdf.addPage([595, 842]);
    brand(page);
    y = 670;
  };
  const text = (value: string, size = 10, font = regular, color = rgb(.16, .23, .22)) => {
    for (const line of wrap(value, size > 16 ? 55 : 88)) {
      if (y < 85) addPage();
      page.drawText(line, { x: 50, y, size, font, color });
      y -= size + 5;
    }
  };

  text(contract.title, 18, bold);
  text(`Contrat no ${contract.contract_number}`, 10, regular, rgb(.35, .4, .4));
  y -= 15;
  text(`Entre NutVitaGlobalis, plateforme de nutrition et sante, et ${contract.party_name}, ci-apres designe(e) "le partenaire / client".`, 11);

  const sections = [
    ["Missions", contract.content?.missions],
    ["Obligations", contract.content?.obligations],
    ["Confidentialite", contract.content?.confidentiality],
    ["Conditions financieres", contract.content?.financial_terms],
    ["Duree", contract.content?.duration],
    ["Resiliation", contract.content?.termination],
  ];
  for (const [title, body] of sections) {
    if (!body) continue;
    y -= 12;
    text(String(title), 13, bold, rgb(.12, .49, .33));
    text(String(body), 10);
  }

  y -= 20;
  text("Signatures", 14, bold);
  for (const signature of signatures) {
    if (y < 190) addPage();
    text(`${signature.signer_role === "nutvita" ? "Pour NutVitaGlobalis" : "Partie contractante"} : ${signature.signer_name}`, 10, bold);
    try {
      const { data } = await supabase.storage.from("document-vault").download(signature.signature_path);
      if (data) {
        const bytes = new Uint8Array(await data.arrayBuffer());
        const image = signature.signature_path.endsWith(".png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        page.drawImage(image, { x: 50, y: y - 70, width: 180, height: 65 });
        y -= 82;
      }
    } catch {}
    text(`Signe electroniquement le ${new Date(signature.signed_at).toLocaleString("fr-FR")} - Empreinte ${signature.signature_hash.slice(0, 20)}...`, 8, regular, rgb(.4, .4, .4));
    y -= 12;
  }
  if (!signatures.length) text("En attente de signature des parties.", 10);

  for (const [index, current] of pdf.getPages().entries()) {
    current.drawText(`NutVitaGlobalis - ${contract.contract_number}`, { x: 50, y: 72, size: 8, font: regular, color: rgb(.45, .45, .45) });
    current.drawText(`${index + 1}/${pdf.getPageCount()}`, { x: 520, y: 72, size: 8, font: regular, color: rgb(.45, .45, .45) });
  }
  return pdf.save();
}

export async function renderCertificatePdf(contract: Contract) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = await createNutvitaDocumentBranding(pdf);
  let page = pdf.addPage([595, 842]), y = 670;
  brand(page);

  page.drawText("Certificat de signature electronique", { x: 50, y, size: 20, font: bold, color: rgb(.07, .24, .19) });
  y -= 35;
  const lines = [
    `Contrat : ${contract.title}`,
    `Numero : ${contract.contract_number}`,
    `Statut : ${contract.status}`,
    `Finalise le : ${contract.completed_at ? new Date(contract.completed_at).toLocaleString("fr-FR") : "-"}`,
  ];
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 11, font: regular });
    y -= 22;
  }
  y -= 15;
  page.drawText("Signatures", { x: 50, y, size: 14, font: bold });
  y -= 28;
  for (const s of contract.contract_signatures || []) {
    for (const line of [
      `${s.signer_name} (${s.signer_role})`,
      `Horodatage : ${new Date(s.signed_at).toISOString()}`,
      `Adresse IP : ${s.ip_address || "non disponible"}`,
      `Empreinte SHA-256 : ${s.signature_hash}`,
    ]) {
      page.drawText(line, { x: 50, y, size: 9, font: regular });
      y -= 16;
    }
    y -= 10;
  }
  page.drawText("Piste d'audit", { x: 50, y, size: 14, font: bold });
  y -= 25;
  for (const event of contract.contract_audit_logs || []) {
    if (y < 85) {
      page = pdf.addPage([595, 842]);
      brand(page);
      y = 670;
    }
    page.drawText(`${new Date(event.created_at).toISOString()} - ${event.event_type}`, { x: 50, y, size: 8, font: regular });
    y -= 14;
  }
  return pdf.save();
}

export async function generateAndStoreContract(supabase: SupabaseClient, contractId: string) {
  const { data: contract, error } = await supabase.from("contracts").select("*, contract_signatures(*), contract_audit_logs(*)").eq("id", contractId).single();
  if (error || !contract) throw error || new Error("Contrat introuvable");
  const bytes = await renderContractPdf(supabase, contract), path = `${contract.party_user_id}/contracts/${contract.id}.pdf`;
  const uploaded = await supabase.storage.from("document-vault").upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (uploaded.error) throw uploaded.error;
  const updates: Record<string, unknown> = { pdf_path: path };
  if (contract.status === "completed") {
    const certificate = await renderCertificatePdf(contract), certificatePath = `${contract.party_user_id}/contracts/${contract.id}-certificate.pdf`;
    const certUpload = await supabase.storage.from("document-vault").upload(certificatePath, certificate, { contentType: "application/pdf", upsert: true });
    if (certUpload.error) throw certUpload.error;
    updates.certificate_path = certificatePath;
    await supabase.from("vault_documents").delete().eq("contract_id", contract.id).eq("document_type", "signature_certificate");
    await supabase.from("vault_documents").insert({ owner_id: contract.party_user_id, client_id: contract.client_id, dietitian_profile_id: contract.dietitian_profile_id, contract_id: contract.id, document_type: "signature_certificate", title: `Certificat ${contract.contract_number}`, file_path: certificatePath, mime_type: "application/pdf", confidential: true, created_by: contract.created_by });
  }
  await supabase.from("contracts").update(updates).eq("id", contract.id);
  await supabase.from("vault_documents").delete().eq("contract_id", contract.id).eq("document_type", "contract");
  await supabase.from("vault_documents").insert({ owner_id: contract.party_user_id, client_id: contract.client_id, dietitian_profile_id: contract.dietitian_profile_id, contract_id: contract.id, document_type: "contract", title: contract.title, file_path: path, mime_type: "application/pdf", confidential: true, created_by: contract.created_by });
  return path;
}
