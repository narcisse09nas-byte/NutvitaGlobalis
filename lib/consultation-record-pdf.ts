import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { createReportQrCode, drawNutvitaDocumentBranding } from '@/lib/pdf-branding';

type Row = Record<string, any>;

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = String(text || '-').replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
}

function listText(value: unknown) {
  if (!Array.isArray(value)) return '-';
  return value.map((item: any) => typeof item === 'string'
    ? item
    : [item.label || item.name, item.target, item.unit].filter(Boolean).join(' : ')).join('; ') || '-';
}

export async function renderConsultationDocument(
  consultation: Row,
  client: Row,
  dietitian: Row,
  loginUrl: string,
  prescriptionOnly = false,
  signature?: { displayName?: string; bytes?: Uint8Array; mimeType?: string },
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const drawQr = await createReportQrCode(pdf, loginUrl);
  let page = pdf.addPage([595, 842]);
  await drawNutvitaDocumentBranding(pdf, page);
  let y = 590;

  const newPage = async () => {
    page = pdf.addPage([595, 842]);
    await drawNutvitaDocumentBranding(pdf, page);
    y = 690;
  };
  const heading = async (text: string) => {
    if (y < 140) await newPage();
    page.drawText(text, { x: 48, y, size: 13, font: bold, color: rgb(.06, .28, .21) });
    y -= 22;
  };
  const paragraph = async (text: string, x = 48, width = 495) => {
    for (const line of wrap(text, regular, 9.5, width)) {
      if (y < 95) await newPage();
      page.drawText(line, { x, y, size: 9.5, font: regular, color: rgb(.18, .23, .22) });
      y -= 14;
    }
    y -= 7;
  };

  const prescriptionType = String(consultation.prescription_type || 'exams');
  const prescriptionTypeLabel = String(consultation.prescription_type_label || '').trim();
  const prescriptionTitles: Record<string, string> = {
    exams: 'ORDONNANCE DE DEMANDE D’EXAMENS',
    medication: 'ORDONNANCE MÉDICALE',
    other: prescriptionTypeLabel ? `ORDONNANCE — ${prescriptionTypeLabel.toUpperCase()}` : 'ORDONNANCE',
  };
  const title = prescriptionOnly
    ? prescriptionTitles[prescriptionType] || prescriptionTitles.other
    : consultation.document_title || 'COMPTE RENDU DE CONSULTATION NUTRITIONNELLE';
  page.drawText(title, { x: 48, y: 570, size: prescriptionOnly ? 17 : 16, font: bold, color: rgb(.04, .24, .18) });
  const dateText = `Date : ${new Date(consultation.finalized_at || consultation.scheduled_at || Date.now()).toLocaleDateString('fr-FR')}`;
  page.drawText(dateText, { x: 547 - regular.widthOfTextAtSize(dateText, 9), y: 544, size: 9, font: regular });
  y = 512;
  page.drawText(`Client : ${client.full_name || client.email || consultation.client_id}`, { x: 48, y, size: 10, font: bold });
  y -= 17;
  page.drawText(`Traitant : ${dietitian.full_name || 'Professionnel NutVitaGlobalis'}`, { x: 48, y, size: 10, font: regular });
  y -= 26;

  if (prescriptionOnly) {
    const itemHeading = prescriptionType === 'medication'
      ? 'Médicaments prescrits'
      : prescriptionType === 'other'
        ? (prescriptionTypeLabel || 'Prescription')
        : 'Examens demandés';
    await heading(itemHeading);
    const items = Array.isArray(consultation.prescription_items) ? consultation.prescription_items : [];
    for (const item of items) await paragraph(`• ${typeof item === 'string' ? item : item.label || item.name}`, 48, 350);
    if (consultation.prescription_notes) {
      await heading('Indications');
      await paragraph(consultation.prescription_notes, 48, 350);
    }
    if (prescriptionType === 'exams') {
      await paragraph('Les résultats doivent être interprétés par un professionnel habilité dans leur contexte clinique.', 48, 350);
    }

    drawQr(page, '', { x: 455, y: 455, labelX: 455, labelY: 448 });
    page.drawText('Scannez pour vous connecter et', { x: 398, y: 442, size: 6.5, font: regular, color: rgb(.35, .4, .39) });
    page.drawText('retrouver ce document.', { x: 432, y: 433, size: 6.5, font: regular, color: rgb(.35, .4, .39) });

    const signer = signature?.displayName || dietitian.full_name || 'Professionnel NutVitaGlobalis';
    const signerWidth = bold.widthOfTextAtSize(signer, 10);
    page.drawText(signer, { x: Math.max(355, 535 - signerWidth), y: 182, size: 10, font: bold, color: rgb(.04, .24, .18) });
    page.drawText('Signature du traitant', { x: 425, y: 166, size: 8, font: regular, color: rgb(.35, .4, .39) });
    if (signature?.bytes?.length) {
      try {
        const image = signature.mimeType === 'image/jpeg'
          ? await pdf.embedJpg(signature.bytes)
          : await pdf.embedPng(signature.bytes);
        const scale = Math.min(130 / image.width, 62 / image.height);
        page.drawImage(image, { x: 405, y: 94, width: image.width * scale, height: image.height * scale });
      } catch {}
    } else {
      page.drawText('Signature non téléversée', { x: 410, y: 130, size: 7, font: regular, color: rgb(.55, .58, .57) });
    }
  } else {
    await heading('Profil du client');
    await paragraph(Object.entries(consultation.profile_snapshot || {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(' | '));
    await heading('Plaintes et motif');
    await paragraph(`${listText(consultation.complaints)}. ${consultation.complaint_notes || consultation.reason || ''}`);
    await heading('Objectifs convenus');
    await paragraph(listText(consultation.goals));
    await heading('Plan d’accompagnement');
    await paragraph(Object.entries(consultation.care_plan || {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(' | '));
    if (consultation.clinical_assessments && Object.keys(consultation.clinical_assessments).length) {
      await heading('Évaluations nutritionnelles et mode de vie');
      await paragraph(Object.entries(consultation.clinical_assessments).map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`).join(' | '));
    }
    await heading('Prochain rendez-vous');
    await paragraph(consultation.next_appointment_at ? new Date(consultation.next_appointment_at).toLocaleString('fr-FR') : 'Non programmé');
    drawQr(page, 'Accès sécurisé', { x: 455, y: 95, labelX: 460, labelY: 84 });
  }
  return pdf.save();
}

export async function renderConsultationPreAnalysis(analysis: Record<string, any>, client: Row, dietitian: Row, loginUrl: string) {
  return renderConsultationDocument({
    document_title: 'ANALYSE IA PRÉPARATOIRE À LA CONSULTATION',
    finalized_at: new Date().toISOString(),
    profile_snapshot: { nom: client.full_name, email: client.email },
    complaints: analysis.findings || [],
    complaint_notes: analysis.summary,
    goals: (analysis.suggestedObjectives || []).map((label: string) => ({ label })),
    care_plan: {
      points_de_vigilance: (analysis.attentionPoints || []).join('; '),
      donnees_manquantes: (analysis.missingData || []).join('; '),
      questions_a_verifier: (analysis.questionsToVerify || []).join('; '),
      limites: (analysis.limitations || []).join('; '),
    },
    next_appointment_at: null,
    prescription_items: [],
  }, client, dietitian, loginUrl);
}
