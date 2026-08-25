import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const INK = rgb(0.09, 0.24, 0.19);
const MUTED = rgb(0.4, 0.45, 0.43);
const ACCENT = rgb(0.12, 0.49, 0.33);

function fmtDate(value?: string | null) { return value ? new Date(value).toLocaleDateString("fr-FR") : "—"; }

// Deliberately lean, matching lib/ppm/evm-pdf.ts's approach (internal operational document, not
// client-facing/branded) — printable distribution plan: operation header, one row per site line,
// with its product needs listed underneath.
export async function renderDistributionPlanReport({ operationName, planCode, periodStart, periodEnd, siteLines }: {
  operationName: string; planCode: string; periodStart: string; periodEnd: string;
  siteLines: {
    siteName: string; targetBeneficiaries: number; rationDays: number;
    periodStart: string; periodEnd: string; distributionStart?: string | null; distributionEnd?: string | null;
    products: { productName: string; quantityNeeded: number; unit: string }[];
  }[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };
  const newPageIfNeeded = () => { if (y < 80) { page = pdf.addPage([595, 842]); y = 780; } };

  text("Plan de distribution", 18, bold, ACCENT);
  line(24);
  text(operationName, 13, bold);
  line(18);
  text(`Plan ${planCode} — periode du ${fmtDate(periodStart)} au ${fmtDate(periodEnd)}`, 10, regular, MUTED);
  line(30);

  for (const siteLine of siteLines) {
    newPageIfNeeded();
    text(siteLine.siteName, 12, bold, ACCENT);
    line(16);
    text(`BNF cible : ${siteLine.targetBeneficiaries}    Jours de ration : ${siteLine.rationDays}`, 9.5, regular, MUTED);
    line(14);
    text(`Periode : ${fmtDate(siteLine.periodStart)} → ${fmtDate(siteLine.periodEnd)}    Distribution : ${fmtDate(siteLine.distributionStart)} → ${fmtDate(siteLine.distributionEnd)}`, 9.5, regular, MUTED);
    line(18);
    if (siteLine.products.length) {
      text("Produit", 8.5, bold, MUTED, 60);
      text("Besoin", 8.5, bold, MUTED, 300);
      line(14);
      for (const product of siteLine.products) {
        newPageIfNeeded();
        text(product.productName, 9, regular, INK, 60);
        text(`${product.quantityNeeded} ${product.unit}`, 9, regular, INK, 300);
        line(14);
      }
    } else {
      text("Aucun produit renseigne.", 9, regular, MUTED, 60);
      line(14);
    }
    line(14);
  }

  return pdf.save();
}

// Printable need (requisition) — non-SF/HGSF path.
export async function renderNeedReport({ needCode, periodStart, periodEnd, siteLines }: {
  needCode: string; periodStart: string; periodEnd: string;
  siteLines: {
    siteName: string; targetBeneficiaries: number; rationDays: number; desiredStartDate: string;
    products: { productName: string; onSiteStock: number; quantityRequired: number; quantityNeeded: number }[];
  }[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };
  const newPageIfNeeded = () => { if (y < 80) { page = pdf.addPage([595, 842]); y = 780; } };

  text(`Besoin ${needCode}`, 18, bold, ACCENT);
  line(24);
  text(`Periode du ${fmtDate(periodStart)} au ${fmtDate(periodEnd)}`, 10, regular, MUTED);
  line(30);

  for (const siteLine of siteLines) {
    newPageIfNeeded();
    text(siteLine.siteName, 12, bold, ACCENT);
    line(16);
    text(`BNF cible : ${siteLine.targetBeneficiaries}    Jours de ration : ${siteLine.rationDays}    Debut souhaite : ${fmtDate(siteLine.desiredStartDate)}`, 9.5, regular, MUTED);
    line(18);
    text("Produit", 8.5, bold, MUTED, 60);
    text("Stock sur site", 8.5, bold, MUTED, 260);
    text("Requis", 8.5, bold, MUTED, 370);
    text("Besoin", 8.5, bold, MUTED, 450);
    line(14);
    for (const product of siteLine.products) {
      newPageIfNeeded();
      text(product.productName, 9, regular, INK, 60);
      text(String(product.onSiteStock), 9, regular, INK, 260);
      text(String(product.quantityRequired), 9, regular, INK, 370);
      text(String(product.quantityNeeded), 9, bold, ACCENT, 450);
      line(14);
    }
    line(14);
  }

  return pdf.save();
}

// Printable purchase order (SF/HGSF path) — school/cooperative header, days covered, generated
// ingredient table with totals.
export async function renderPurchaseOrderReport({ poNumber, siteName, cooperativeName, cooperativeAddress, cooperativePhone, cooperativeEmail, periodStart, periodEnd, status, days, ingredients }: {
  poNumber: string; siteName: string; cooperativeName: string; cooperativeAddress?: string; cooperativePhone?: string; cooperativeEmail?: string;
  periodStart: string; periodEnd: string; status: string;
  days: { date: string; menuName: string; studentCount: number }[];
  ingredients: { productName: string; quantityMt: number; unitPrice: number; totalPrice: number }[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };
  const newPageIfNeeded = () => { if (y < 80) { page = pdf.addPage([595, 842]); y = 780; } };

  text(`Bon de commande ${poNumber}`, 16, bold, ACCENT);
  line(22);
  text(`Ecole : ${siteName}`, 11, bold);
  line(16);
  text(`Cooperative : ${cooperativeName}${cooperativeAddress ? " — " + cooperativeAddress : ""}`, 9.5, regular, MUTED);
  line(13);
  if (cooperativePhone || cooperativeEmail) { text(`${cooperativePhone || ""}${cooperativePhone && cooperativeEmail ? " · " : ""}${cooperativeEmail || ""}`, 9.5, regular, MUTED); line(13); }
  text(`Periode : ${fmtDate(periodStart)} → ${fmtDate(periodEnd)}    Statut : ${status}`, 9.5, regular, MUTED);
  line(26);

  text("Jours couverts", 12, bold, ACCENT);
  line(18);
  for (const day of days) {
    newPageIfNeeded();
    text(`${fmtDate(day.date)} — ${day.menuName} (${day.studentCount} eleves)`, 9, regular, INK, 60);
    line(14);
  }
  line(14);

  newPageIfNeeded();
  text("Ingredients", 12, bold, ACCENT);
  line(18);
  text("Ingredient", 8.5, bold, MUTED, 50);
  text("Qte (MT)", 8.5, bold, MUTED, 280);
  text("Prix/Kg", 8.5, bold, MUTED, 370);
  text("Prix total", 8.5, bold, MUTED, 460);
  line(14);
  let total = 0;
  for (const ingredient of ingredients) {
    newPageIfNeeded();
    text(ingredient.productName, 9, regular, INK, 50);
    text(ingredient.quantityMt.toFixed(4), 9, regular, INK, 280);
    text(ingredient.unitPrice.toLocaleString("fr-FR"), 9, regular, INK, 370);
    text(ingredient.totalPrice.toLocaleString("fr-FR"), 9, regular, INK, 460);
    total += ingredient.totalPrice;
    line(14);
  }
  newPageIfNeeded();
  text("Total", 10, bold, ACCENT, 50);
  text(total.toLocaleString("fr-FR"), 10, bold, ACCENT, 460);

  return pdf.save();
}

// Printable delivery note — both paths (non-SF via need_id, SF/HGSF via po_id).
export async function renderDeliveryNoteReport({ deliveryCode, parentReference, siteName, deliveryDate, deliveredByName, status, receivers, lines }: {
  deliveryCode: string; parentReference: string; siteName: string; deliveryDate: string; deliveredByName: string; status: string; receivers: string[];
  lines: { productName: string; quantityOrdered: number; quantityReceived: number | null; rejectedQuantity: number; conformity: string | null }[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };
  const newPageIfNeeded = () => { if (y < 80) { page = pdf.addPage([595, 842]); y = 780; } };

  text(`Bon de livraison ${deliveryCode}`, 16, bold, ACCENT);
  line(22);
  text(`Site : ${siteName}    Reference : ${parentReference}`, 10, regular);
  line(15);
  text(`Date : ${fmtDate(deliveryDate)}    Livre par : ${deliveredByName}    Statut : ${status}`, 9.5, regular, MUTED);
  line(15);
  if (receivers.length) { text(`Receptionne par : ${receivers.join(", ")}`, 9.5, regular, MUTED); line(15); }
  line(20);

  text("Produit", 8.5, bold, MUTED, 50);
  text("Commande", 8.5, bold, MUTED, 250);
  text("Recu", 8.5, bold, MUTED, 340);
  text("Rejete", 8.5, bold, MUTED, 410);
  text("Conformite", 8.5, bold, MUTED, 480);
  line(14);
  for (const item of lines) {
    newPageIfNeeded();
    text(item.productName, 9, regular, INK, 50);
    text(String(item.quantityOrdered), 9, regular, INK, 250);
    text(item.quantityReceived == null ? "—" : String(item.quantityReceived), 9, regular, INK, 340);
    text(String(item.rejectedQuantity), 9, regular, INK, 410);
    text(item.conformity || "—", 9, regular, INK, 480);
    line(14);
  }

  return pdf.save();
}

// Printable distribution activity report — product movement + beneficiary breakdown + amount
// distributed in figures and words.
export async function renderActivityReportReport({ reportCode, siteName, periodStart, periodEnd, rationDaysProvided, amountFigures, amountWords, currency, comment, products, beneficiaries }: {
  reportCode: string; siteName: string; periodStart: string; periodEnd: string; rationDaysProvided?: number | null;
  amountFigures?: number | null; amountWords?: string | null; currency?: string | null; comment?: string | null;
  products: { productName: string; startQty: number | null; receivedQty: number | null; distributedQty: number | null; damagedQty: number | null; returnedQty: number | null; remainingQty: number | null }[];
  beneficiaries: { label: string; male: number; female: number }[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };
  const newPageIfNeeded = () => { if (y < 80) { page = pdf.addPage([595, 842]); y = 780; } };
  const dash = (value: number | null | undefined) => value == null ? "—" : String(value);

  text(`Rapport de distribution ${reportCode}`, 16, bold, ACCENT);
  line(22);
  text(`Site : ${siteName}`, 11, bold);
  line(16);
  text(`Periode du ${fmtDate(periodStart)} au ${fmtDate(periodEnd)}${rationDaysProvided != null ? `    Jours de ration fournis : ${rationDaysProvided}` : ""}`, 9.5, regular, MUTED);
  line(26);

  text("Produits", 12, bold, ACCENT);
  line(18);
  text("Produit", 8, bold, MUTED, 50); text("Debut", 8, bold, MUTED, 190); text("Recu", 8, bold, MUTED, 250); text("Distribue", 8, bold, MUTED, 310); text("Endommage", 8, bold, MUTED, 380); text("Retourne", 8, bold, MUTED, 450); text("Restant", 8, bold, MUTED, 510);
  line(14);
  for (const product of products) {
    newPageIfNeeded();
    text(product.productName, 8.5, regular, INK, 50);
    text(dash(product.startQty), 8.5, regular, INK, 190);
    text(dash(product.receivedQty), 8.5, regular, INK, 250);
    text(dash(product.distributedQty), 8.5, regular, INK, 310);
    text(dash(product.damagedQty), 8.5, regular, INK, 380);
    text(dash(product.returnedQty), 8.5, regular, INK, 450);
    text(dash(product.remainingQty), 8.5, regular, INK, 510);
    line(13);
  }
  line(16);

  newPageIfNeeded();
  text("Beneficiaires couverts", 12, bold, ACCENT);
  line(18);
  text("Groupe d'age", 8.5, bold, MUTED, 50); text("Homme", 8.5, bold, MUTED, 300); text("Femme", 8.5, bold, MUTED, 400);
  line(14);
  for (const group of beneficiaries) {
    newPageIfNeeded();
    text(group.label, 9, regular, INK, 50);
    text(String(group.male), 9, regular, INK, 300);
    text(String(group.female), 9, regular, INK, 400);
    line(13);
  }
  line(20);

  newPageIfNeeded();
  if (amountFigures != null) {
    text(`Montant distribue : ${amountFigures.toLocaleString("fr-FR")} ${currency || ""}`, 10, bold, ACCENT);
    line(15);
    if (amountWords) { text(`(${amountWords})`, 9, regular, MUTED); line(15); }
  }
  if (comment) { text(`Commentaire : ${comment}`, 9, regular, MUTED); line(15); }

  return pdf.save();
}

// Printable invoice — same core details as the delivery note, plus the delivery-note ID,
// computed amount (figures + words), and payment account.
export async function renderInvoiceReport({ invoiceNumber, siteName, cooperativeName, deliveryCode, status, totalTonnage, costPerTonne, amountFigures, amountWords, currency, paymentAccountType, paymentAccountName, paymentAccountNumber }: {
  invoiceNumber: string; siteName: string; cooperativeName?: string; deliveryCode: string; status: string;
  totalTonnage?: number | null; costPerTonne?: number | null; amountFigures: number; amountWords: string; currency: string;
  paymentAccountType?: string | null; paymentAccountName?: string | null; paymentAccountNumber?: string | null;
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  let y = 780;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };

  text(invoiceNumber, 16, bold, ACCENT);
  line(24);
  text(`Ecole : ${siteName}${cooperativeName ? `    Cooperative : ${cooperativeName}` : ""}`, 10, regular);
  line(15);
  text(`Bon de livraison : ${deliveryCode}    Statut : ${status}`, 9.5, regular, MUTED);
  line(20);
  if (totalTonnage != null) { text(`Tonnage total : ${totalTonnage}`, 9.5, regular, MUTED); line(15); }
  if (costPerTonne != null) { text(`Cout a la tonne : ${costPerTonne.toLocaleString("fr-FR")} ${currency}`, 9.5, regular, MUTED); line(15); }
  line(10);

  text(`Montant : ${amountFigures.toLocaleString("fr-FR")} ${currency}`, 13, bold, ACCENT);
  line(18);
  text(`(${amountWords})`, 9.5, regular, MUTED);
  line(24);

  if (paymentAccountNumber) {
    text("Compte de paiement", 11, bold, ACCENT);
    line(16);
    text(`${paymentAccountType || ""} — ${paymentAccountName || ""} — ${paymentAccountNumber}`, 9.5, regular, MUTED);
    line(16);
  }

  return pdf.save();
}

// Printable per-day menu/target-children grid for one school within a plan (SF/HGSF).
export async function renderDailyMenuPlanReport({ siteName, periodStart, periodEnd, days }: {
  siteName: string; periodStart: string; periodEnd: string;
  days: { date: string; menuName: string; targetChildren: number }[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };

  text("Plan journalier — menus", 18, bold, ACCENT);
  line(24);
  text(siteName, 13, bold);
  line(18);
  text(`Periode du ${fmtDate(periodStart)} au ${fmtDate(periodEnd)}`, 10, regular, MUTED);
  line(30);

  text("Date", 8.5, bold, MUTED, 50);
  text("Menu", 8.5, bold, MUTED, 180);
  text("Enfants cibles", 8.5, bold, MUTED, 400);
  line(16);
  page.drawLine({ start: { x: 50, y: y + 6 }, end: { x: 545, y: y + 6 }, thickness: 0.5, color: rgb(0.85, 0.88, 0.86) });

  for (const day of days) {
    if (y < 60) { page = pdf.addPage([595, 842]); y = 780; }
    text(fmtDate(day.date), 9, regular, INK, 50);
    text(day.menuName, 9, regular, INK, 180);
    text(String(day.targetChildren), 9, regular, INK, 400);
    line(15);
  }

  return pdf.save();
}

// Printable donor synthesis file — closing-out summary of every invoice in the period, with its
// payment-tracking dates, for the funding partner's records.
export async function renderDonorSynthesisReport({ operationName, periodStart, periodEnd, preparedByName, approvedByName, rows }: {
  operationName: string; periodStart: string; periodEnd: string; preparedByName?: string | null; approvedByName?: string | null;
  rows: {
    siteName: string; invoiceId: string; amountFigures: number; currency: string; status: string;
    paidToSchoolAt?: string | null; paidToCooperativeAt?: string | null;
  }[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };
  const newPageIfNeeded = () => { if (y < 80) { page = pdf.addPage([595, 842]); y = 780; } };

  text("Fichier de synthese bailleur", 18, bold, ACCENT);
  line(24);
  text(operationName, 13, bold);
  line(18);
  text(`Periode du ${fmtDate(periodStart)} au ${fmtDate(periodEnd)}`, 10, regular, MUTED);
  line(16);
  if (preparedByName || approvedByName) { text(`Prepare par : ${preparedByName || "—"}    Approuve par : ${approvedByName || "—"}`, 9.5, regular, MUTED); line(16); }
  line(14);

  text("Ecole", 8, bold, MUTED, 50);
  text("Facture", 8, bold, MUTED, 190);
  text("Montant", 8, bold, MUTED, 300);
  text("Statut", 8, bold, MUTED, 380);
  text("Payee ecole", 8, bold, MUTED, 450);
  text("Payee coop.", 8, bold, MUTED, 520);
  line(14);
  let total = 0;
  for (const row of rows) {
    newPageIfNeeded();
    text(row.siteName, 8.5, regular, INK, 50);
    text(row.invoiceId, 8, regular, INK, 190);
    text(`${row.amountFigures.toLocaleString("fr-FR")} ${row.currency}`, 8.5, regular, INK, 300);
    text(row.status, 8, regular, INK, 380);
    text(fmtDate(row.paidToSchoolAt), 8, regular, INK, 450);
    text(fmtDate(row.paidToCooperativeAt), 8, regular, INK, 520);
    total += row.amountFigures;
    line(13);
  }
  line(10);
  newPageIfNeeded();
  text("Total", 10, bold, ACCENT, 50);
  text(total.toLocaleString("fr-FR"), 10, bold, ACCENT, 300);

  return pdf.save();
}
