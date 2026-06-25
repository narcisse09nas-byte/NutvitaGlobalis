import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@/lib/supabase/server';

function wrap(value: string, max = 92) {
  const words = String(value || '').replace(/\s+/g, ' ').split(' ');
  const lines: string[] = []; let line = '';
  words.forEach(word => {
    if (`${line} ${word}`.trim().length > max && line) { lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  });
  if (line) lines.push(line);
  return lines;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const [{ data: survey }, { data: reports }, { data: team }, { data: clusters }, { data: responses }] = await Promise.all([
    supabase.from('survey_projects').select('*').eq('id', id).maybeSingle(),
    supabase.from('survey_analysis_reports').select('*').eq('survey_id', id).order('created_at'),
    supabase.from('survey_team_members').select('*').eq('survey_id', id),
    supabase.from('survey_clusters').select('*').eq('survey_id', id),
    supabase.from('survey_responses').select('id').eq('survey_id', id),
  ]);
  if (!survey) return NextResponse.json({ message: 'Enquete introuvable.' }, { status: 404 });
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 790;
  const addPage = () => { page = pdf.addPage([595, 842]); y = 790; };
  const text = (value: string, size = 10, font = regular, color = rgb(.15, .2, .22)) => {
    wrap(value, size > 14 ? 62 : 92).forEach(line => { if (y < 75) addPage(); page.drawText(line, { x: 48, y, size, font, color }); y -= size + 5; });
  };
  const heading = (value: string) => { y -= 8; text(value, 15, bold, rgb(.04, .28, .2)); };
  page.drawRectangle({ x: 0, y: 755, width: 595, height: 87, color: rgb(.04, .23, .18) });
  page.drawText('Support Food Security and Nutrition Survey', { x: 48, y: 805, size: 17, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Rapport consolide de l enquete', { x: 48, y: 782, size: 10, font: regular, color: rgb(.8, .95, .9) });
  y = 725; text(survey.title, 19, bold, rgb(.04, .23, .18)); text(`${survey.country || 'Pays non precise'} | ${survey.starts_at || '-'} au ${survey.ends_at || '-'}`, 9);
  heading('1. Vue generale'); text(survey.description || 'Aucune description renseignee.'); text(`Equipe: ${team?.length || 0} personne(s) | Grappes: ${clusters?.length || 0} | Reponses: ${responses?.length || 0}.`);
  heading('2. Methodologie'); text('Le rapport doit etre lu avec le plan de sondage, les probabilites de selection, les ponderations, les procedures de controle qualite et les limites documentees par l equipe.');
  heading('3. Analyses sauvegardees');
  for (const report of reports || []) {
    text(report.title, 12, bold);
    text(`Source: ${report.source_file_name || 'collecte integree'} | Lignes: ${report.dataset_summary?.rows || '-'} | Variables: ${report.dataset_summary?.columns || '-'} | Completude: ${report.quality_report?.completeness || 0}%.`, 9);
    if (report.ai_interpretation?.summary) text(report.ai_interpretation.summary);
    for (const finding of report.ai_interpretation?.findings || []) text(`- ${finding}`);
    y -= 5;
  }
  heading('4. Conclusion et precautions'); text('Toute publication doit faire l objet d une revue technique, d une validation des denominateurs et ponderations, et d une documentation transparente des limites.');
  pdf.getPages().forEach((current, index) => current.drawText(`NutVitaGlobalis - page ${index + 1}/${pdf.getPageCount()}`, { x: 48, y: 45, size: 8, font: regular, color: rgb(.5, .5, .5) }));
  return new NextResponse(Buffer.from(await pdf.save()), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="rapport-survey-${id}.pdf"` } });
}
