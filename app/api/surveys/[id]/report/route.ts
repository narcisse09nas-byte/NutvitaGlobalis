import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@/lib/supabase/server';
import { createReportQrCode } from '@/lib/pdf-branding';

type Row = Record<string, any>;

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

function prevalence(count: number, total: number) {
  if (!total) return { count, total, percentage: 0, low: 0, high: 0 };
  const proportion = count / total;
  const z = 1.96;
  const denominator = 1 + z ** 2 / total;
  const centre = (proportion + z ** 2 / (2 * total)) / denominator;
  const margin = z * Math.sqrt((proportion * (1 - proportion) + z ** 2 / (4 * total)) / total) / denominator;
  return {
    count,
    total,
    percentage: proportion * 100,
    low: Math.max(0, centre - margin) * 100,
    high: Math.min(1, centre + margin) * 100,
  };
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
  const loginUrl = `${new URL(request.url).origin}/connexion?identifiant=${encodeURIComponent(user.email || '')}&redirect=${encodeURIComponent(`/surveys/${id}`)}`;
  const drawQr = await createReportQrCode(pdf, loginUrl);
  const latestPlausibility = [...selectedReports].reverse().find(report => report.report_type === 'plausibility');
  const plausibility = latestPlausibility?.analysis_results?.result || null;
  const observations = (plausibility?.observations || []) as Array<Record<string, any>>;
  let page = pdf.addPage([595, 842]); let y = 790;
  const addPage = () => { page = pdf.addPage([595, 842]); y = 790; };
  const text = (value: string, size = 10, font = regular, color = rgb(.15, .2, .22), indent = 0) => {
    wrap(value, size > 14 ? 62 : 92 - indent).forEach(line => { if (y < 75) addPage(); page.drawText(line, { x: 48 + indent, y, size, font, color }); y -= size + 5; });
  };
  const heading = (value: string) => { y -= 8; text(value, 15, bold, rgb(.04, .28, .2)); };
  const table = (headers: string[], rows: Array<Array<string | number>>, widths?: number[]) => {
    const available = 499;
    const cellWidths = widths || headers.map(() => available / headers.length);
    const drawRow = (cells: Array<string | number>, header = false) => {
      if (y < 90) addPage();
      const rowHeight = 22;
      let x = 48;
      cells.forEach((cell, index) => {
        const width = cellWidths[index] || available / cells.length;
        page.drawRectangle({ x, y: y - 5, width, height: rowHeight, color: header ? rgb(.88, .94, .92) : rgb(1, 1, 1), borderColor: rgb(.78, .82, .82), borderWidth: .5 });
        const value = String(cell ?? '-');
        page.drawText(value.length > Math.max(7, Math.floor(width / 5.5)) ? `${value.slice(0, Math.max(4, Math.floor(width / 5.5) - 1))}…` : value, { x: x + 3, y: y + 3, size: header ? 7 : 7.5, font: header ? bold : regular, color: rgb(.12, .18, .18) });
        x += width;
      });
      y -= rowHeight;
    };
    drawRow(headers, true);
    rows.forEach(row => drawRow(row));
    y -= 8;
  };
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
  if (observations.length) {
    text('3.1 Résultats anthropométriques selon les standards OMS 2006', 12, bold);
    text('Les estimations ci-dessous sont recalculées à partir du dernier contrôle anthropométrique sauvegardé. Les intervalles affichés sont des IC 95 % de Wilson non pondérés. Lorsque le plan est complexe, la publication finale doit utiliser les poids, strates, grappes et effets de plan validés.', 8);
    const ageBands = [
      ['6-17', 6, 17],
      ['18-29', 18, 29],
      ['30-41', 30, 41],
      ['42-53', 42, 53],
      ['54-59', 54, 59],
    ] as const;
    table(
      ['Âge (mois)', 'Garçons n', 'Filles n', 'Total n', '% échantillon', 'Ratio G/F'],
      ageBands.map(([label, minimum, maximum]) => {
        const group = observations.filter(item => item.age >= minimum && item.age <= maximum);
        const boys = group.filter(item => item.sex === 'male').length;
        const girls = group.filter(item => item.sex === 'female').length;
        return [label, boys, girls, group.length, `${(group.length * 100 / observations.length).toFixed(1)} %`, girls ? (boys / girls).toFixed(2) : 'N/A'];
      }),
      [68, 70, 70, 70, 100, 80],
    );
    if (y < 285) addPage();
    text('Figure 3.1. Pyramide âge-sexe de l’échantillon', 10, bold);
    const pyramidTop = y - 8;
    const pyramidCentre = 297;
    const pyramidMaximum = Math.max(1, ...ageBands.flatMap(([, minimum, maximum]) => {
      const group = observations.filter(item => item.age >= minimum && item.age <= maximum);
      return [group.filter(item => item.sex === 'male').length, group.filter(item => item.sex === 'female').length];
    }));
    ageBands.forEach(([label, minimum, maximum], index) => {
      const group = observations.filter(item => item.age >= minimum && item.age <= maximum);
      const boys = group.filter(item => item.sex === 'male').length;
      const girls = group.filter(item => item.sex === 'female').length;
      const rowY = pyramidTop - index * 27;
      const boyWidth = boys * 180 / pyramidMaximum;
      const girlWidth = girls * 180 / pyramidMaximum;
      page.drawRectangle({ x: pyramidCentre - boyWidth, y: rowY, width: boyWidth, height: 16, color: rgb(.08, .45, .34) });
      page.drawRectangle({ x: pyramidCentre, y: rowY, width: girlWidth, height: 16, color: rgb(.93, .38, .12) });
      page.drawText(label, { x: pyramidCentre - 13, y: rowY + 4, size: 6, font: bold, color: rgb(1, 1, 1) });
      page.drawText(String(boys), { x: Math.max(49, pyramidCentre - boyWidth - 20), y: rowY + 4, size: 7, font: regular });
      page.drawText(String(girls), { x: Math.min(535, pyramidCentre + girlWidth + 4), y: rowY + 4, size: 7, font: regular });
    });
    page.drawText('Garçons', { x: 105, y: pyramidTop + 21, size: 8, font: bold, color: rgb(.08, .45, .34) });
    page.drawText('Filles', { x: 445, y: pyramidTop + 21, size: 8, font: bold, color: rgb(.93, .38, .12) });
    y = pyramidTop - ageBands.length * 27 - 12;
    const groups = [
      ['Tous', observations],
      ['Garçons', observations.filter(item => item.sex === 'male')],
      ['Filles', observations.filter(item => item.sex === 'female')],
    ] as const;
    const indicatorRows = (kind: 'gam' | 'mam' | 'sam' | 'underweight' | 'stunting' | 'overweight') => groups.map(([label, group]) => {
      const valid = group.filter(item => {
        if (kind === 'underweight') return Number.isFinite(item.waz);
        if (kind === 'stunting') return Number.isFinite(item.haz);
        return Number.isFinite(item.whz) || item.oedema === true;
      });
      const cases = valid.filter(item => {
        if (kind === 'gam') return item.whz < -2 || item.oedema === true;
        if (kind === 'mam') return item.whz >= -3 && item.whz < -2 && item.oedema !== true;
        if (kind === 'sam') return item.whz < -3 || item.oedema === true;
        if (kind === 'underweight') return item.waz < -2;
        if (kind === 'stunting') return item.haz < -2;
        return item.whz > 2 && item.oedema !== true;
      }).length;
      const result = prevalence(cases, valid.length);
      return [label, result.total, result.count, `${result.percentage.toFixed(1)} %`, `${result.low.toFixed(1)}–${result.high.toFixed(1)} %`];
    });
    text('Tableau 3.2. Prévalence de la malnutrition aiguë par sexe', 10, bold);
    table(['Groupe', 'n valide', 'Cas', 'Prévalence', 'IC 95 %'], indicatorRows('gam'), [90, 75, 65, 115, 154]);
    text('Tableau 3.3. Malnutrition aiguë modérée par sexe', 10, bold);
    table(['Groupe', 'n valide', 'Cas', 'Prévalence', 'IC 95 %'], indicatorRows('mam'), [90, 75, 65, 115, 154]);
    text('Tableau 3.4. Malnutrition aiguë sévère par sexe', 10, bold);
    table(['Groupe', 'n valide', 'Cas', 'Prévalence', 'IC 95 %'], indicatorRows('sam'), [90, 75, 65, 115, 154]);
    if (observations.some(item => Number.isFinite(item.muac))) {
      const muacRows = groups.map(([label, group]) => {
        const valid = group.filter(item => Number.isFinite(item.muac));
        const muacMillimetres = (value: number) => value < 50 ? value * 10 : value;
        const gam = valid.filter(item => muacMillimetres(item.muac) < 125 || item.oedema === true).length;
        const sam = valid.filter(item => muacMillimetres(item.muac) < 115 || item.oedema === true).length;
        const gamResult = prevalence(gam, valid.length);
        const samResult = prevalence(sam, valid.length);
        return [label, valid.length, `${gamResult.percentage.toFixed(1)} %`, `${samResult.percentage.toFixed(1)} %`];
      });
      text('Tableau 3.5. Malnutrition aiguë selon le PB/MUAC et/ou œdèmes', 10, bold);
      table(['Groupe', 'n valide', 'GAM MUAC', 'SAM MUAC'], muacRows, [110, 95, 145, 149]);
    }
    text('Tableau 3.6. Insuffisance pondérale, retard de croissance et surpoids', 10, bold);
    table(['Indicateur', 'Groupe', 'n valide', 'Cas', 'Prévalence', 'IC 95 %'], [
      ...indicatorRows('underweight').map(row => ['P/A < -2', ...row]),
      ...indicatorRows('stunting').map(row => ['T/A < -2', ...row]),
      ...indicatorRows('overweight').map(row => ['P/T > +2', ...row]),
    ], [70, 70, 65, 55, 105, 134]);
    if (plausibility?.distributions) {
      text('Tableau 3.7. Moyennes, écarts-types et exclusions', 10, bold);
      table(['Indice', 'n', 'Moyenne', 'Écart-type', 'Asymétrie', 'Aplatissement'], ['whz', 'waz', 'haz'].map(key => {
        const summary = plausibility.distributions[key] || {};
        return [key.toUpperCase(), summary.count || 0, summary.mean?.toFixed?.(2) ?? 'N/A', summary.standardDeviation?.toFixed?.(2) ?? 'N/A', summary.skewness?.toFixed?.(2) ?? 'N/A', summary.kurtosis?.toFixed?.(2) ?? 'N/A'];
      }), [70, 60, 90, 90, 95, 94]);
    }
    if (y < 300) addPage();
    text('Figure 3.2. Allure des distributions des z-scores', 10, bold);
    const chartX = 58;
    const chartY = y - 180;
    const chartWidth = 475;
    const chartHeight = 150;
    const bins = Array.from({ length: 17 }, (_, index) => -4 + index * .5);
    const series = [
      { key: 'whz', color: rgb(.08, .45, .34) },
      { key: 'haz', color: rgb(.93, .38, .12) },
      { key: 'waz', color: rgb(.12, .35, .75) },
    ] as const;
    const binCounts = series.map(item => bins.map(start => observations.filter(observation => Number.isFinite(observation[item.key]) && observation[item.key] >= start && observation[item.key] < start + .5).length));
    const maximumBin = Math.max(1, ...binCounts.flat());
    page.drawLine({ start: { x: chartX, y: chartY }, end: { x: chartX + chartWidth, y: chartY }, thickness: .7, color: rgb(.35, .4, .4) });
    page.drawLine({ start: { x: chartX, y: chartY }, end: { x: chartX, y: chartY + chartHeight }, thickness: .7, color: rgb(.35, .4, .4) });
    series.forEach((item, seriesIndex) => {
      const points = binCounts[seriesIndex].map((count, index) => ({
        x: chartX + index * chartWidth / (bins.length - 1),
        y: chartY + count * chartHeight / maximumBin,
      }));
      points.slice(1).forEach((point, index) => page.drawLine({ start: points[index], end: point, thickness: 1.5, color: item.color }));
      page.drawText(item.key.toUpperCase(), { x: chartX + seriesIndex * 55, y: chartY + chartHeight + 10, size: 7, font: bold, color: item.color });
    });
    bins.filter((_, index) => index % 2 === 0).forEach((bin, index) => page.drawText(String(bin), { x: chartX + index * 2 * chartWidth / (bins.length - 1) - 4, y: chartY - 12, size: 6, font: regular }));
    y = chartY - 28;
    const oedema = prevalence(observations.filter(item => item.oedema === true).length, observations.length);
    text(`Prévalence des œdèmes bilatéraux : ${oedema.count}/${oedema.total}, soit ${oedema.percentage.toFixed(1)} % (IC 95 % ${oedema.low.toFixed(1)}–${oedema.high.toFixed(1)} %).`, 8);
  } else {
    text('Aucun résultat anthropométrique sauvegardé. Exécutez puis conservez le contrôle ENA/SMART depuis la page Analyse anthropométrique.', 9, bold, rgb(.65, .25, .1));
  }
  for (const report of selectedReports) {
    text(report.title, 12, bold);
    text(`Source: ${report.source_file_name || 'collecte integree'} | Lignes: ${report.dataset_summary?.rows || '-'} | Variables: ${report.dataset_summary?.columns || '-'} | Completude: ${report.quality_report?.completeness || 0}%.`, 9);
    if (report.dataset_summary?.filters && Object.keys(report.dataset_summary.filters).length) text(`Filtres: ${Object.entries(report.dataset_summary.filters).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join(' | ') || 'aucun'}`, 8);
    const result = report.analysis_results?.result;
    if (result?.type === 'frequencies' && result.tables?.[0]) {
      table(['Modalité', 'Effectif', '%'], result.tables[0].categories.slice(0, 30).map((item: Row) => [item.value, item.count, `${Number(item.percentage).toFixed(1)} %`]), [260, 110, 129]);
    } else if (result?.type === 'descriptives') {
      table(['Variable', 'n', 'Moyenne', 'ET', 'Médiane', 'Min–Max'], result.variables.map((item: Row) => [item.variable, item.n, Number(item.mean).toFixed(2), Number(item.standardDeviation).toFixed(2), item.median == null ? 'N/A' : Number(item.median).toFixed(2), `${item.minimum ?? '-'}–${item.maximum ?? '-'}`]), [120, 50, 80, 70, 80, 99]);
    } else if (result?.type === 'crosstab') {
      text(`Khi-deux=${Number(result.statistic).toFixed(3)} | ddl=${result.degreesOfFreedom} | p=${Number(result.pValue).toFixed(4)} | V de Cramér=${result.cramersV == null ? 'N/A' : Number(result.cramersV).toFixed(3)}.`, 8);
    } else if (['binary_logistic', 'cox_regression'].includes(result?.type)) {
      table(['Variable', 'Coefficient', 'ET', 'p', result.type === 'binary_logistic' ? 'Odds ratio' : 'Hazard ratio', 'IC 95 %'], (result.parameters || []).map((item: Row) => [item.variable, Number(item.coefficient).toFixed(3), Number(item.standardError).toFixed(3), Number(item.pValue).toFixed(4), Number(item.oddsRatio ?? item.hazardRatio).toFixed(3), `${Number(item.confidenceInterval95?.[0]).toFixed(3)}–${Number(item.confidenceInterval95?.[1]).toFixed(3)}`]), [100, 75, 60, 65, 90, 109]);
    } else if (result?.type === 'linear_regression') {
      text(`R²=${result.rSquared == null ? 'N/A' : Number(result.rSquared).toFixed(3)} | R² ajusté=${result.adjustedRSquared == null ? 'N/A' : Number(result.adjustedRSquared).toFixed(3)}.`, 8);
      table(['Variable', 'Coefficient'], (result.coefficients || []).map((item: Row) => [item.variable, Number(item.coefficient).toFixed(4)]), [280, 219]);
    } else if (result?.type === 'kaplan_meier') {
      table(['Groupe', 'n', 'Événements', 'Censurés', 'Médiane'], (result.curves || []).map((item: Row) => [item.group, item.n, item.events, item.censored, item.medianSurvival ?? 'Non atteinte']), [160, 70, 90, 90, 89]);
    }
    if (report.report_type === 'advanced_module') {
      text(`Module spécialisé: ${report.dataset_summary?.module || report.analysis_results?.module || 'N/A'}. ${report.analysis_results?.calculated_rows?.length || 0} ligne(s) enrichie(s) conservée(s).`, 8, bold);
    }
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
  if (y < 155) addPage();
  drawQr(page, 'Accès sécurisé au dossier source', { x: 493, y: y - 62, labelX: 442, labelY: y - 70 });
  y -= 82;
  pdf.getPages().forEach((current, index) => current.drawText(`NutVitaGlobalis - page ${index + 1}/${pdf.getPageCount()}`, { x: 48, y: 45, size: 8, font: regular, color: rgb(.5, .5, .5) }));
  return new NextResponse(Buffer.from(await pdf.save()), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="rapport-survey-${id}.pdf"` } });
}
