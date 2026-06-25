import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { NutriTrackProgramNarrative } from '@/nutritrack/ai/flows/generate-program-report-flow';

function wrap(value: string, max = 92) {
  const words = String(value || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderNutriTrackReportPdf({
  organization,
  filters,
  data,
  narrative,
}: {
  organization: string;
  filters: Record<string, any>;
  data: Record<string, any>;
  narrative: NutriTrackProgramNarrative;
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const forest = rgb(0.03, 0.23, 0.2);
  const cyan = rgb(0, 0.55, 0.72);
  let page = pdf.addPage([595, 842]);
  let y = 790;

  const newPage = () => {
    page = pdf.addPage([595, 842]);
    y = 790;
  };
  const text = (value: string, size = 10, font = regular, color = rgb(0.15, 0.2, 0.22), indent = 0) => {
    for (const line of wrap(value, size >= 15 ? 62 : 92 - indent / 4)) {
      if (y < 82) newPage();
      page.drawText(line, { x: 48 + indent, y, size, font, color });
      y -= size + 5;
    }
  };
  const heading = (value: string) => {
    y -= 8;
    text(value, 15, bold, forest);
    y -= 3;
  };
  const bullets = (values: string[]) => values.forEach(value => text(`- ${value}`, 10, regular, rgb(0.15, 0.2, 0.22), 8));

  page.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: forest });
  page.drawText('NutriTrack', { x: 48, y: 805, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Rapport programme assiste par IA', { x: 48, y: 782, size: 11, font: regular, color: rgb(0.82, 0.95, 0.94) });
  y = 730;
  text(organization, 17, bold, forest);
  text(`Genere le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}`, 9);

  heading('Perimetre du rapport');
  const filterLines = [
    ['Periode', `${filters.startDate || 'Debut des donnees'} au ${filters.endDate || 'Aujourd hui'}`],
    ['Pays', (filters.countries || []).join(', ') || 'Tous'],
    ['Regions', (filters.regions || []).join(', ') || 'Toutes'],
    ['Districts', (filters.districts || []).join(', ') || 'Tous'],
    ['Aires de sante', (filters.healthAreas || []).join(', ') || 'Toutes'],
    ['Formations sanitaires', (filters.facilities || []).join(', ') || 'Toutes'],
  ];
  filterLines.forEach(([label, value]) => text(`${label}: ${value}`, 9));

  heading('Resume executif');
  text(narrative.executiveSummary);

  heading('Principaux indicateurs');
  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object') continue;
    const metrics = Object.entries(value as Record<string, unknown>)
      .filter(([, metric]) => typeof metric === 'number')
      .slice(0, 10)
      .map(([metric, count]) => `${metric}: ${count}`)
      .join(' | ');
    if (metrics) text(`${key.toUpperCase()} - ${metrics}`, 9, regular, cyan);
  }

  heading('Constats essentiels');
  bullets(narrative.keyFindings);
  heading('Alertes et points de vigilance');
  bullets(narrative.alerts);
  heading('Limites des donnees');
  bullets(narrative.dataLimitations);
  heading('Recommandations');
  bullets(narrative.recommendations);
  heading('Plan d action prioritaire');
  narrative.actionPlan.forEach((value, index) => text(`${index + 1}. ${value}`, 10, regular, rgb(0.15, 0.2, 0.22), 8));
  heading('Conclusion');
  text(narrative.conclusion);

  for (const [index, current] of pdf.getPages().entries()) {
    current.drawLine({ start: { x: 48, y: 62 }, end: { x: 547, y: 62 }, thickness: 0.5, color: rgb(0.8, 0.84, 0.83) });
    current.drawText(`NutVitaGlobalis - NutriTrack - page ${index + 1}/${pdf.getPageCount()}`, { x: 48, y: 45, size: 8, font: regular, color: rgb(0.45, 0.48, 0.47) });
  }
  return pdf.save();
}
