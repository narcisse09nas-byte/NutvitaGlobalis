import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { createReportQrCode, drawNutvitaDocumentBranding } from "@/lib/pdf-branding";

type Row = Record<string, any>;

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = String(text || "-").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["-"];
}

function listText(value: unknown) {
  if (!Array.isArray(value)) return "-";
  return value.map((item: any) => typeof item === "string" ? item : [item.label || item.name, item.target, item.unit].filter(Boolean).join(" : ")).join("; ") || "-";
}

export async function renderConsultationDocument(
  consultation: Row,
  client: Row,
  dietitian: Row,
  loginUrl: string,
  prescriptionOnly = false,
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const drawQr = await createReportQrCode(pdf, loginUrl);
  let page = pdf.addPage([595, 842]);
  await drawNutvitaDocumentBranding(pdf, page);
  let y = 690;

  const newPage = async () => {
    page = pdf.addPage([595, 842]);
    await drawNutvitaDocumentBranding(pdf, page);
    y = 700;
  };
  const heading = async (text: string) => {
    if (y < 120) await newPage();
    page.drawText(text, { x: 48, y, size: 13, font: bold, color: rgb(.06, .28, .21) });
    y -= 22;
  };
  const paragraph = async (text: string) => {
    for (const line of wrap(text, regular, 9.5, 495)) {
      if (y < 90) await newPage();
      page.drawText(line, { x: 48, y, size: 9.5, font: regular, color: rgb(.18, .23, .22) });
      y -= 14;
    }
    y -= 8;
  };

  page.drawText(prescriptionOnly ? "ORDONNANCE D'EXAMENS" : consultation.document_title || "COMPTE RENDU DE CONSULTATION NUTRITIONNELLE", {
    x: 48, y: 735, size: prescriptionOnly ? 20 : 16, font: bold, color: rgb(.04, .24, .18),
  });
  page.drawText(`Date : ${new Date(consultation.finalized_at || consultation.scheduled_at || Date.now()).toLocaleDateString("fr-FR")}`, { x: 48, y: 712, size: 9, font: regular });
  page.drawText(`Client : ${client.full_name || client.email || consultation.client_id}`, { x: 48, y, size: 10, font: bold }); y -= 17;
  page.drawText(`Nutritionniste : ${dietitian.full_name || "Professionnel NutVitaGlobalis"}`, { x: 48, y, size: 10, font: regular }); y -= 24;

  if (prescriptionOnly) {
    await heading("Examens demandes");
    const items = Array.isArray(consultation.prescription_items) ? consultation.prescription_items : [];
    for (const item of items) await paragraph(`- ${typeof item === "string" ? item : item.label || item.name}`);
    if (consultation.prescription_notes) { await heading("Indications"); await paragraph(consultation.prescription_notes); }
    await paragraph("Les resultats doivent etre interpretes par un professionnel habilite dans leur contexte clinique.");
  } else {
    await heading("Profil du client");
    await paragraph(Object.entries(consultation.profile_snapshot || {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(" | "));
    await heading("Plaintes et motif");
    await paragraph(`${listText(consultation.complaints)}. ${consultation.complaint_notes || consultation.reason || ""}`);
    await heading("Objectifs convenus");
    await paragraph(listText(consultation.goals));
    await heading("Plan d'accompagnement");
    await paragraph(Object.entries(consultation.care_plan || {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join("\n"));
    if (consultation.clinical_assessments && Object.keys(consultation.clinical_assessments).length) {
      await heading("Evaluations nutritionnelles et mode de vie");
      await paragraph(Object.entries(consultation.clinical_assessments).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join("\n"));
    }
    await heading("Prochain rendez-vous");
    await paragraph(consultation.next_appointment_at ? new Date(consultation.next_appointment_at).toLocaleString("fr-FR") : "Non programme");
    if (Array.isArray(consultation.prescription_items) && consultation.prescription_items.length) {
      await heading("Examens demandes");
      await paragraph(listText(consultation.prescription_items));
    }
  }

  drawQr(page, "Acces securise");
  page.drawText("Scannez pour vous connecter et retrouver ce document.", { x: 48, y: 58, size: 8, font: regular, color: rgb(.4, .45, .44) });
  return pdf.save();
}

export async function renderConsultationPreAnalysis(
  analysis: Record<string, any>,
  client: Row,
  dietitian: Row,
  loginUrl: string,
) {
  const consultation = {
    document_title: "ANALYSE IA PREPARATOIRE A LA CONSULTATION",
    finalized_at: new Date().toISOString(),
    profile_snapshot: { nom: client.full_name, email: client.email },
    complaints: analysis.findings || [],
    complaint_notes: analysis.summary,
    goals: (analysis.suggestedObjectives || []).map((label: string) => ({ label })),
    care_plan: {
      points_de_vigilance: (analysis.attentionPoints || []).join("; "),
      donnees_manquantes: (analysis.missingData || []).join("; "),
      questions_a_verifier: (analysis.questionsToVerify || []).join("; "),
      limites: (analysis.limitations || []).join("; "),
    },
    next_appointment_at: null,
    prescription_items: [],
  };
  return renderConsultationDocument(consultation, client, dietitian, loginUrl);
}
