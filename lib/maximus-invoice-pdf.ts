import "server-only";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { drawNutvitaDocumentBranding } from "@/lib/pdf-branding";

const INK = rgb(0.09, 0.24, 0.19);
const MUTED = rgb(0.4, 0.45, 0.43);
const ACCENT = rgb(0.12, 0.49, 0.33);

const TITLES: Record<string, string> = {
  service: "FACTURE",
  proforma: "FACTURE PROFORMA",
  pos_meals: "FACTURE — POINT DE VENTE PARTENAIRE",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumise — en attente de validation finance",
  endorsed: "Validee — paiement confirme", rejected: "Rejetee", cancelled: "Annulee",
  issued: "Emise",
};

function fmtDate(value?: string | null) { return value ? new Date(value).toLocaleDateString("fr-FR") : "—"; }
function fmtAmount(value: number) { return value.toLocaleString("fr-FR"); }

export async function renderMaximusInvoicePdf(invoice: Record<string, any>, lines: Record<string, any>[], party: { name: string; email?: string | null; phone?: string | null; address?: string | null; extraLine?: string | null }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  await drawNutvitaDocumentBranding(pdf, page);
  let y = 700;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };

  text(TITLES[invoice.invoice_type] || "FACTURE", 18, bold, ACCENT);
  line(22);
  text(invoice.invoice_number, 11, bold);
  line(16);
  text(`Date : ${fmtDate(invoice.created_at)}`, 9.5, regular, MUTED);
  line(14);
  text(`Statut : ${STATUS_LABELS[invoice.status] || invoice.status}`, 9.5, regular, MUTED);
  line(26);

  text(party.name || "—", 12, bold);
  line(15);
  if (party.email) { text(party.email, 9.5, regular, MUTED); line(13); }
  if (party.phone) { text(party.phone, 9.5, regular, MUTED); line(13); }
  if (party.address) { text(party.address, 9.5, regular, MUTED); line(13); }
  if (party.extraLine) { text(party.extraLine, 9.5, regular, MUTED); line(13); }
  line(14);

  page.drawRectangle({ x: 50, y: y - 6, width: 495, height: 26, color: rgb(0.93, 0.96, 0.95) });
  text("Description", 8.5, bold, MUTED, 58);
  text("Qte", 8.5, bold, MUTED, 330);
  text("PU", 8.5, bold, MUTED, 400);
  text("Total", 8.5, bold, MUTED, 480);
  line(28);

  for (const item of lines) {
    text(String(item.description), 9.5, regular, INK, 58);
    text(String(item.quantity), 9.5, regular, INK, 330);
    text(fmtAmount(Number(item.unit_price)), 9.5, regular, INK, 400);
    text(fmtAmount(Number(item.line_total)), 9.5, bold, INK, 480);
    line(18);
  }
  line(10);

  page.drawLine({ start: { x: 300, y: y + 10 }, end: { x: 545, y: y + 10 }, thickness: 0.5, color: rgb(0.85, 0.88, 0.86) });
  line(10);
  text(`Prix hors taxe : ${fmtAmount(Number(invoice.price_excluding_tax))} ${invoice.currency}`, 9.5, regular, INK, 300);
  line(16);
  text(`Taxe (${invoice.tax_rate} %) : ${fmtAmount(Number(invoice.tax_amount))} ${invoice.currency}`, 9.5, regular, INK, 300);
  line(18);
  text(`TOTAL TTC : ${fmtAmount(Number(invoice.total_including_tax))} ${invoice.currency}`, 12, bold, ACCENT, 300);
  line(28);

  if (invoice.invoice_type === "service") {
    if (invoice.payment_method) { text(`Moyen de paiement : ${invoice.payment_method}`, 9.5, regular, MUTED); line(14); }
    if (invoice.endorsed_at) { text(`Paiement confirme le : ${fmtDate(invoice.endorsed_at)}`, 9.5, regular, MUTED); line(14); }
  }
  if (invoice.notes) { line(6); text(`Notes : ${invoice.notes}`, 9, regular, MUTED); }

  text("NutVitaGlobalis vous remercie pour votre confiance.", 9, regular, MUTED, 50);
  page.drawText("", { x: 50, y: 78 });

  // Red, semi-transparent, diagonal "PAYE" stamp — only once finance/admin has confirmed the
  // deposit (status === 'endorsed'). Structurally unreachable for proforma/pos_meals, which are
  // issued directly and never carry this status. Drawn last so it sits visually over the content.
  if (invoice.status === "endorsed") {
    page.drawText("PAYE", {
      x: 130, y: 380, size: 150, font: bold,
      color: rgb(0.75, 0.08, 0.08), opacity: 0.3,
      rotate: degrees(35),
    });
  }

  return pdf.save();
}
