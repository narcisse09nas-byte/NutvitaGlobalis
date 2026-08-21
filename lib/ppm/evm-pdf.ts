import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { EvmMetrics } from "./types";

const INK = rgb(0.09, 0.24, 0.19);
const MUTED = rgb(0.4, 0.45, 0.43);
const ACCENT = rgb(0.12, 0.49, 0.33);

function fmt(value: number | null | undefined) { return value == null ? "—" : Math.round(value).toLocaleString("fr-FR"); }
function fmtRatio(value: number | null | undefined) { return value == null ? "—" : value.toFixed(2); }

// Deliberately lean compared to lib/health-report-pdf.ts (no branding/QR — this is an internal
// EVM export, not a client-facing document): project header, KPI table, Work Package breakdown.
export async function renderEvmReport({ projectName, statusDate, project, workPackages }: {
  projectName: string; statusDate: string; project: EvmMetrics; workPackages: { title: string; metrics: EvmMetrics }[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;

  const text = (value: string, size = 10, font = regular, color = INK, x = 50) => { page.drawText(value, { x, y, size, font, color }); };
  const line = (delta = 16) => { y -= delta; };

  text("Earned Value Performance", 18, bold, ACCENT);
  line(24);
  text(projectName, 13, bold);
  line(18);
  text(`Status Date : ${new Date(statusDate).toLocaleDateString("fr-FR")}`, 10, regular, MUTED);
  line(30);

  text("Indicateurs projet", 12, bold, ACCENT);
  line(20);
  const kpis: [string, string][] = [
    ["BAC", fmt(project.bac)], ["PV", fmt(project.pv)], ["EV", fmt(project.ev)], ["AC", fmt(project.ac)],
    ["SV", fmt(project.sv)], ["CV", fmt(project.cv)], ["SPI", fmtRatio(project.spi)], ["CPI", fmtRatio(project.cpi)],
  ];
  const startY = y;
  kpis.forEach(([label, value], index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = 50 + column * 130;
    const rowY = startY - row * 40;
    page.drawText(label, { x, y: rowY, size: 9, font: regular, color: MUTED });
    page.drawText(value, { x, y: rowY - 14, size: 12, font: bold, color: INK });
  });
  y = startY - Math.ceil(kpis.length / 4) * 40 - 20;

  text("Repartition par Work Package", 12, bold, ACCENT, 50);
  line(20);
  const headers = ["Work Package", "BAC", "EV", "AC", "SPI", "CPI"];
  const widths = [190, 75, 75, 75, 45, 45];
  let x = 50;
  headers.forEach((header, index) => { text(header, 8.5, bold, MUTED, x); x += widths[index]; });
  line(14);
  page.drawLine({ start: { x: 50, y: y + 6 }, end: { x: 545, y: y + 6 }, thickness: 0.5, color: rgb(0.85, 0.88, 0.86) });

  for (const wp of workPackages) {
    if (y < 60) { page = pdf.addPage([595, 842]); y = 780; }
    x = 50;
    const cells = [wp.title.slice(0, 34), fmt(wp.metrics.bac), fmt(wp.metrics.ev), fmt(wp.metrics.ac), fmtRatio(wp.metrics.spi), fmtRatio(wp.metrics.cpi)];
    cells.forEach((cell, index) => { text(cell, 8.5, regular, INK, x); x += widths[index]; });
    line(15);
  }

  return pdf.save();
}
