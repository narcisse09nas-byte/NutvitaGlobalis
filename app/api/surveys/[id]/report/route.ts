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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const [{ data: survey }, { data: reports }, { data: team }, { data: clusters }, { data: samples }, { data: forms }, { data: responses }] = await Promise.all([
    supabase.from('survey_projects').select('*').eq('id', id).maybeSingle(),
    supabase.from('survey_analysis_reports').select('*').eq('survey_id', id).order('created_at'),
    supabase.from('survey_team_members').select('*').eq('survey_id', id),
    supabase.from('survey_clusters').select('*').eq('survey_id', id),
    supabase.from('survey_samples').select('*').eq('survey_id', id),
    supabase.from('survey_forms').select('id,title,form_code,version,status').eq('survey_id', id),
    supabase.from('survey_responses').select('*').eq('survey_id', id),
  ]);
  if (!survey) return NextResponse.json({ message: 'Enquete introuvable.' }, { status: 404 });
  const requestedFilters = Object.fromEntries(new URL(request.url).searchParams.entries());
  const selectedReports = (reports || []).filter(report => Object.entries(requestedFilters).every(
    ([key, value]) => !value || String(report.dataset_summary?.filters?.[key] ?? '') === value,
  ));
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 790;
  const addPage = () => { page = pdf.addPage([595, 842]); y = 790; };
  const text = (value: string, size = 10, font = regular, color = rgb(.15, .2, .22), indent = 0) => {
    wrap(value, size > 14 ? 62 : 92 - indent).forEach(line => { if (y < 75) addPage(); page.drawText(line, { x: 48 + indent, y, size, font, color }); y -= size + 5; });
  };
  const heading = (value: string) => { y -= 8; text(value, 15, bold, rgb(.04, .28, .2)); };
  page.drawRectangle({ x: 0, y: 755, width: 595, height: 87, color: rgb(.04, .23, .18) });
  page.drawText('Support Food Security and Nutrition Survey', { x: 48, y: 805, size: 17, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Rapport consolide de l enquete', { x: 48, y: 782, size: 10, font: regular, color: rgb(.8, .95, .9) });
  y = 725; text(survey.title, 19, bold, rgb(.04, .23, .18)); text(`${survey.country || 'Pays non precise'} | ${survey.starts_at || '-'} au ${survey.ends_at || '-'}`, 9);
  heading('Résumé exécutif'); text(survey.description || 'Aucune description renseignee.'); text(`Equipe: ${team?.length || 0} personne(s) | Grappes: ${clusters?.length || 0} | Reponses: ${responses?.length || 0}.`);
  if (Object.keys(requestedFilters).length) text(`Périmètre filtré: ${Object.entries(requestedFilters).map(([key, value]) => `${key}=${value}`).join(' | ')}`);
  heading('1. Introduction'); text('Contexte, justification, objectifs généraux et spécifiques, zone et population couvertes par l’enquête.');
  heading('2. Méthodologie');
  text('Le rapport doit être lu avec le plan de sondage, les probabilités de sélection, les pondérations, la formation des équipes, la standardisation anthropométrique, les procédures de collecte, les règles de gestion des valeurs manquantes et les limites documentées.');
  const totalPopulation = (clusters || []).reduce((sum, cluster) => sum + Number(cluster.population || 0), 0);
  const frameVillages = (clusters || []).reduce((sum, cluster) => sum + (cluster.villages || []).length, 0);
  const selectedVillages = (samples || []).reduce((sum, sample) => sum + (sample.selected_villages || []).length, 0);
  text(`Base de sondage: ${clusters?.length || 0} grappe(s), ${frameVillages} village(s)/ZD et une population renseignée de ${totalPopulation.toLocaleString('fr-FR')}.`);
  text(`Échantillon: ${samples?.length || 0} grappe(s) représentée(s) et ${selectedVillages || 'sélection au niveau grappe'} village(s)/ZD explicitement tiré(s).`);
  text(`Période: ${survey.starts_at || 'N/A'} au ${survey.ends_at || 'N/A'}. Questionnaires validés: ${(forms || []).filter(form => form.status === 'endorsed').length}.`);
  const localResponses = (responses || []).filter(response => response.source_type !== 'imported').length;
  const importedResponses = (responses || []).filter(response => response.source_type === 'imported').length;
  text(`Données: ${responses?.length || 0} réponse(s), dont ${localResponses} collectée(s) localement et ${importedResponses} importée(s).`);
  heading('3. Résultats et analyses sauvegardées');
  for (const report of selectedReports) {
    text(report.title, 12, bold);
    text(`Source: ${report.source_file_name || 'collecte integree'} | Lignes: ${report.dataset_summary?.rows || '-'} | Variables: ${report.dataset_summary?.columns || '-'} | Completude: ${report.quality_report?.completeness || 0}%.`, 9);
    if (report.dataset_summary?.filters && Object.keys(report.dataset_summary.filters).length) text(`Filtres: ${Object.entries(report.dataset_summary.filters).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join(' | ') || 'aucun'}`, 8);
    if (report.ai_interpretation?.summary) text(report.ai_interpretation.summary);
    for (const finding of report.ai_interpretation?.findings || []) text(`- ${finding}`);
    y -= 5;
  }
  heading('4. Discussion');
  text('Interpréter les résultats en regard des objectifs, du contexte, des biais possibles, du plan d’échantillonnage, des données antérieures et des références nationales ou internationales. Une association statistique ne doit pas être présentée comme une causalité.');
  heading('5. Conclusions');
  text('Synthèse de la sévérité de la situation, des populations les plus affectées, de la robustesse des constats et du degré d’urgence.');
  heading('6. Recommandations et priorités');
  text('Présenter des recommandations hiérarchisées, responsables, réalistes et datées : immédiates, à moyen terme et à long terme.');
  heading('7. Références et remerciements');
  text('Documenter les sources secondaires, standards, partenaires, équipes, autorités, bailleurs et personnes ayant contribué à l’enquête.');
  heading('8. Annexes');
  text('Contrôle de plausibilité, assignation des grappes, évaluation des enquêteurs, questionnaires, dictionnaire des variables, syntaxes/formules, résultats statistiques sauvegardés et limites.');
  heading('Annexe A. Équipe de l’enquête');
  for (const member of team || []) {
    text(`${member.member_code || '-'} | ${member.first_name} ${member.last_name} | ${member.role} | ${member.email || member.phone || 'contact non renseigné'}`, 8);
  }
  if (!team?.length) text('Aucun membre d’équipe enregistré.');
  heading('Annexe B. Base de sondage');
  for (const cluster of clusters || []) {
    text(`${cluster.cluster_code} | ${cluster.cluster_name} | Région: ${cluster.region || '-'} | District: ${cluster.district || '-'} | Population: ${Number(cluster.population || 0).toLocaleString('fr-FR')}`, 8, bold);
    for (const village of cluster.villages || []) text(`- ${village.code} | ${village.name} | Population: ${Number(village.population || 0).toLocaleString('fr-FR')}`, 8, regular, rgb(.25, .3, .32), 8);
  }
  heading('Annexe C. Échantillon et villages/ZD couverts');
  for (const sample of samples || []) {
    const cluster = (clusters || []).find(item => item.id === sample.cluster_id);
    text(`${cluster?.cluster_code || '-'} | ${cluster?.cluster_name || 'Grappe'} | Probabilité: ${sample.probability || 'N/A'} | Statut: ${sample.status}`, 8, bold);
    if (sample.selected_villages?.length) for (const village of sample.selected_villages) text(`- ${village.code} | ${village.name}`, 8, regular, rgb(.25, .3, .32), 8);
    else text('- Tirage au niveau de la grappe; villages non détaillés.', 8, regular, rgb(.25, .3, .32), 8);
  }
  heading('Annexe D. Questionnaires et versions');
  for (const form of forms || []) text(`${form.form_code} | ${form.title} | Version ${form.version} | ${form.status}`, 8);
  heading('Annexe E. Traçabilité de la collecte');
  text(`Références locales: G-[grappe]-V-[village/ZD]-E-[enquêteur]-Q-[séquence]. Références importées: IMP-[empreinte du lot]-[ligne source].`);
  for (const response of (responses || []).slice(0, 500)) {
    text(`${response.response_reference || response.cluster_reference || '-'} | ${response.source_type || 'local'} | ${response.village_name || response.village_code || '-'} | ${new Date(response.submitted_at).toLocaleString('fr-FR')}`, 7);
  }
  if ((responses?.length || 0) > 500) text(`${(responses?.length || 0) - 500} référence(s) supplémentaire(s) conservée(s) dans la base mais non listée(s) pour limiter la taille du rapport.`);
  heading('Précautions');
  text('Toute publication doit faire l’objet d’une revue technique, d’une validation des dénominateurs, pondérations et effets de plan, et d’une documentation transparente des limites.');
  pdf.getPages().forEach((current, index) => current.drawText(`NutVitaGlobalis - page ${index + 1}/${pdf.getPageCount()}`, { x: 48, y: 45, size: 8, font: regular, color: rgb(.5, .5, .5) }));
  return new NextResponse(Buffer.from(await pdf.save()), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="rapport-survey-${id}.pdf"` } });
}
