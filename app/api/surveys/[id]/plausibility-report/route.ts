import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { createClient } from '@/lib/supabase/server';
import { createReportQrCode } from '@/lib/pdf-branding';

type Row = Record<string, any>;

function wrap(value: unknown, max = 92) {
  const words = String(value ?? '').replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach(word => {
    if (`${line} ${word}`.trim().length > max && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  });
  if (line) lines.push(line);
  return lines;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const { data: survey } = await supabase.from('survey_projects').select('*').eq('id', id).maybeSingle();
  if (!survey) return NextResponse.json({ message: 'Enquête introuvable.' }, { status: 404 });
  const body = await request.json();
  const report: Row = body.plausibility || {};
  const filters: Row = body.filters || {};

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  const addPage = () => { page = pdf.addPage([595, 842]); y = 790; };
  const ensure = (height = 30) => { if (y - height < 65) addPage(); };
  const text = (value: unknown, size = 9, font: PDFFont = regular, color = rgb(.16, .2, .23), indent = 0) => {
    wrap(value, size >= 14 ? 62 : 96 - indent).forEach(line => {
      ensure(size + 6);
      page.drawText(line, { x: 45 + indent, y, size, font, color });
      y -= size + 5;
    });
  };
  const heading = (value: string) => {
    ensure(38);
    y -= 8;
    page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 24, color: rgb(.91, .96, .94) });
    page.drawText(value, { x: 47, y: y + 3, size: 12, font: bold, color: rgb(.03, .28, .19) });
    y -= 31;
  };
  const metric = (label: string, value: unknown) => text(`${label}: ${value ?? 'N/A'}`);
  const table = (headers: string[], rows: unknown[][], widths?: number[]) => {
    const available = 505;
    const columnWidths = widths || headers.map(() => available / headers.length);
    const drawRow = (values: unknown[], header = false) => {
      const lineSets = values.map((value, index) => wrap(value, Math.max(8, Math.floor(columnWidths[index] / 5.2))));
      const rowHeight = Math.max(18, ...lineSets.map(lines => lines.length * 10 + 6));
      ensure(rowHeight + 2);
      page.drawRectangle({ x: 45, y: y - rowHeight + 6, width: available, height: rowHeight, color: header ? rgb(.05, .32, .23) : rgb(.97, .98, .98), borderColor: rgb(.82, .85, .84), borderWidth: .4 });
      let x = 48;
      lineSets.forEach((lines, columnIndex) => {
        lines.forEach((line, lineIndex) => page.drawText(line, { x, y: y - lineIndex * 10, size: 7, font: header ? bold : regular, color: header ? rgb(1, 1, 1) : rgb(.12, .16, .18) }));
        x += columnWidths[columnIndex];
      });
      y -= rowHeight;
    };
    drawRow(headers, true);
    rows.forEach(row => drawRow(row));
    y -= 6;
  };
  const chart = (title: string, data: Row[], keys: string[]) => {
    ensure(220);
    text(title, 10, bold);
    const x = 55;
    const chartY = y - 165;
    const width = 480;
    const height = 145;
    page.drawLine({ start: { x, y: chartY }, end: { x: x + width, y: chartY }, thickness: 1, color: rgb(.55, .6, .6) });
    page.drawLine({ start: { x, y: chartY }, end: { x, y: chartY + height }, thickness: 1, color: rgb(.55, .6, .6) });
    const maximum = Math.max(1, ...data.flatMap(item => keys.map(key => Number(item[key] || 0))));
    const colors = [rgb(.05, .48, .3), rgb(.9, .3, .08), rgb(.12, .38, .72)];
    keys.forEach((key, keyIndex) => {
      const points = data.map((item, index) => ({
        x: x + (data.length <= 1 ? 0 : index * width / (data.length - 1)),
        y: chartY + Number(item[key] || 0) * height / maximum,
      }));
      points.slice(1).forEach((point, index) => page.drawLine({ start: points[index], end: point, thickness: 1.5, color: colors[keyIndex] }));
      page.drawText(key.toUpperCase(), { x: x + keyIndex * 75, y: chartY - 18, size: 7, font: bold, color: colors[keyIndex] });
    });
    y = chartY - 32;
  };

  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: rgb(.03, .25, .19) });
  page.drawText('NUTVITAGLOBALIS - MAXIMUS SURVEY', { x: 45, y: 808, size: 11, font: bold, color: rgb(.95, .75, .25) });
  page.drawText('Rapport de controle de plausibilite', { x: 45, y: 780, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Canevas inspire d ENA for SMART', { x: 45, y: 758, size: 10, font: regular, color: rgb(.82, .94, .89) });
  y = 715;
  text(survey.title, 16, bold, rgb(.03, .25, .19));
  text(`Généré le ${new Date().toLocaleString('fr-FR')} | Référence OMS 2006`);
  text(`Filtres: ${Object.entries(filters).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join(' | ') || 'Ensemble des données'}`);
  text('Ce contrôle automatisé soutient la revue technique. Il ne remplace ni ENA for SMART ni la validation d’un statisticien/nutritionniste qualifié.', 8, bold, rgb(.65, .25, .05));

  heading('1. Qualité globale des données');
  table(
    ['Critère', 'Valeur', 'Score'],
    (report.qualityCriteria || []).map((item: Row) => [item.criterion, typeof item.value === 'number' ? item.value.toFixed(3) : 'N/A', item.score]),
    [310, 115, 80],
  );
  text(`SCORE GLOBAL: ${report.qualityScore ?? 'N/A'} - Classification: ${report.qualityClassification || 'non évaluable'}.`, 11, bold, report.qualityClassification === 'problematique' ? rgb(.7, .1, .05) : rgb(.03, .35, .2));
  table(
    ['Population analysée', 'n / valeur'],
    [
      ['Observations totales', report.total],
      ['Observations sans signalement', report.included],
      ['Observations signalées', `${report.excluded ?? 0} (${report.flagPercentage ?? 0} %)`],
      ['Sexe-ratio garçons/filles', `${report.ratios?.sexRatio ?? 'N/A'} (p=${report.ratios?.sexPValue?.toFixed?.(3) ?? 'N/A'})`],
      ['Ratio 6-29 / 30-59 mois', `${report.ratios?.ageRatio ?? 'N/A'} (p=${report.ratios?.ageDistributionPValue?.toFixed?.(3) ?? 'N/A'})`],
    ],
    [350, 155],
  );

  heading('2. Doublons, données manquantes et valeurs hors normes');
  table(['Variable', 'Manquants'], Object.entries(report.missing || {}).map(([key, value]) => [key.toUpperCase(), value ?? 'Non associée']), [350, 155]);
  if (report.duplicateIds?.length) report.duplicateIds.forEach((item: Row) => text(`- ID ${item.id}: lignes ${item.lines.join(', ')}`));
  else text('Aucun doublon d’identifiant détecté.');
  table(
    ['Indice', 'Flags OMS', '%'],
    (['whz', 'haz', 'waz'] as const).map(key => [key.toUpperCase(), report.flagByIndicator?.[key] ?? 0, report.total ? `${((report.flagByIndicator?.[key] || 0) * 100 / report.total).toFixed(1)} %` : 'N/A']),
    [200, 150, 155],
  );
  if (report.flags?.length) report.flags.slice(0, 150).forEach((item: Row) => text(`- Ligne ${item.row}${item.id ? ` / ID ${item.id}` : ''}: ${item.reasons.join(', ')}`));
  else text('Aucune valeur hors norme détectée.');
  if ((report.flags?.length || 0) > 150) text(`... ${report.flags.length - 150} signalement(s) supplémentaire(s) conservé(s) dans les résultats numériques.`);

  heading('3. Distribution de l’âge et ratios âge-sexe');
  chart('Effectifs par mois d’âge (6-59 mois)', report.ageHistogram || [], ['count']);
  table(
    ['Classe d’âge', 'Garçons', 'Filles', 'Total', 'Ratio G/F'],
    (report.ageBands || []).map((item: Row) => [item.label, item.boys, item.girls, item.boys + item.girls, item.girls ? (item.boys / item.girls).toFixed(2) : 'N/A']),
    [145, 90, 90, 90, 90],
  );
  text(`Test de répartition par âge: p=${report.ratios?.ageDistributionPValue?.toFixed?.(3) ?? 'N/A'}. Test du sexe-ratio global: p=${report.ratios?.sexPValue?.toFixed?.(3) ?? 'N/A'}. Une p-value inférieure à 0,05 appelle une revue de la sélection, des absences et de l’enregistrement de l’âge.`);

  heading('4. Préférence numérique des mesures');
  ['weight', 'height', 'muac'].forEach(key => {
    const item = report.digitPreference?.[key] || {};
    text(key === 'weight' ? 'Poids' : key === 'height' ? 'Taille / longueur' : 'PB / MUAC', 10, bold);
    table(
      ['Chiffre final', ...Array.from({ length: 10 }, (_, index) => String(index))],
      [['Effectif', ...(item.counts || Array(10).fill(0))]],
      [75, ...Array(10).fill(43)],
    );
    text(`Score=${item.score ?? 'N/A'} (${item.classification ?? 'non évaluable'}); test d’uniformité p=${item.pValue?.toFixed?.(3) ?? 'N/A'}. Seuils SMART: 0-7 excellent, 8-12 bon, 13-20 acceptable, >20 problématique.`);
  });

  heading('5. Écart-type, normalité, asymétrie et aplatissement');
  (['whz', 'haz', 'waz'] as const).forEach(indicator => {
    const detail = report.distributionsByExclusion?.[indicator] || {};
    text(indicator.toUpperCase(), 11, bold);
    table(
      ['Procédure', 'n', 'Moyenne', 'ET', 'p normalité', 'Asymétrie', 'Aplatissement', 'Prév. <-2'],
      [
        ['Sans exclusion', detail.modes?.none, detail.prevalence?.none],
        ['Exclusion OMS', detail.modes?.who, detail.prevalence?.who],
        ['Exclusion SMART', detail.modes?.smart, detail.prevalence?.smart],
      ].map(([label, summary, prevalence]: any[]) => [
        label,
        summary?.count ?? 0,
        summary?.mean?.toFixed?.(2) ?? 'N/A',
        summary?.standardDeviation?.toFixed?.(2) ?? 'N/A',
        summary?.normalityPValue?.toFixed?.(3) ?? 'N/A',
        summary?.skewness?.toFixed?.(2) ?? 'N/A',
        summary?.kurtosis?.toFixed?.(2) ?? 'N/A',
        prevalence?.observed == null ? 'N/A' : `${prevalence.observed.toFixed(1)} %`,
      ]),
      [90, 35, 55, 45, 65, 65, 75, 75],
    );
    const smartPrevalence = detail.prevalence?.smart;
    if (smartPrevalence) text(`Après exclusion SMART: prévalence observée ${smartPrevalence.observed?.toFixed?.(1) ?? 'N/A'} %, ajustée avec l’ET actuel ${smartPrevalence.fittedCurrentSd?.toFixed?.(1) ?? 'N/A'} %, ajustée avec ET=1 ${smartPrevalence.fittedSdOne?.toFixed?.(1) ?? 'N/A'} %.`, 8);
  });
  const bins = Array.from({ length: 17 }, (_, index) => -4 + index * .5).map(start => ({
    z: start,
    whz: (report.observations || []).filter((item: Row) => item.whz >= start && item.whz < start + .5).length,
    haz: (report.observations || []).filter((item: Row) => item.haz >= start && item.haz < start + .5).length,
    waz: (report.observations || []).filter((item: Row) => item.waz >= start && item.waz < start + .5).length,
  }));
  chart('Courbes de distribution des z-scores', bins, ['whz', 'haz', 'waz']);
  text('Interprétation: ET attendu généralement entre 0,8 et 1,2. La normalité est évaluée ici par Jarque-Bera (p<0,05: écart significatif à la normalité). Une valeur absolue d’asymétrie ou d’aplatissement >0,4 mérite une investigation. Les courbes permettent d’apprécier visuellement décalage, queues, asymétrie, aplatissement et éventuelles sous-populations.');

  heading('6. Répartition des cas entre grappes');
  if (report.dispersion) {
    table(
      ['Indicateur', 'Grappes', 'Moy. cas', 'Indice dispersion', 'p-value', 'Interprétation'],
      Object.entries(report.dispersion).map(([key, item]: [string, any]) => [key, item.clusters, item.meanCases?.toFixed?.(2) ?? 'N/A', item.indexOfDispersion?.toFixed?.(2) ?? 'N/A', item.pValue?.toFixed?.(3) ?? 'N/A', item.interpretation]),
      [105, 55, 65, 85, 65, 130],
    );
    text('Un indice >1 avec p<0,05 suggère une concentration des cas dans certaines grappes. Entre 0,05 et 0,95, la répartition est compatible avec l’aléatoire. Interpréter avec le plan de sondage et la taille des grappes.');
  } else text('Non évaluable: associer une colonne grappe valide.');

  heading('7. Qualité selon l’ordre de mesure dans les grappes');
  if (report.orderQuality?.length) {
    table(
      ['Ordre', 'n', 'Flags', 'ET PTZ'],
      report.orderQuality.map((item: Row) => [item.order, item.n, item.flags, item.whzStandardDeviation?.toFixed?.(2) ?? 'N/A']),
      [150, 100, 100, 155],
    );
    chart('Évolution de l’ET du PTZ selon l’ordre de passage', report.orderQuality, ['whzStandardDeviation']);
  } else text('Non évaluable: associer la colonne « ordre de passage ». Cette analyse recherche une dérive de précision au cours de la journée ou de la progression dans la grappe.');

  heading('8. Analyse par équipe, village/ZD et enquêteur');
  ([
    ['Grappe', report.groupQuality?.clusters],
    ['Village/ZD', report.groupQuality?.villages],
    ['Enquêteur/équipe', report.groupQuality?.enumerators],
  ] as const).forEach(([label, items]) => {
    text(label, 10, bold);
    if (items?.length) table(
      ['Valeur', 'n', 'Flags', '% flags', 'ET PTZ', 'Ratio âge', 'Ratio sexe'],
      items.map((item: Row) => [item.value, item.n, item.flagged, `${item.flagPercentage} %`, item.whzStandardDeviation?.toFixed?.(2) ?? 'N/A', item.ageRatio ?? 'N/A', item.sexRatio ?? 'N/A']),
      [110, 45, 55, 65, 65, 80, 85],
    );
    else text('Non évaluable: variable non associée ou sans modalité exploitable.', 8);
  });

  heading('9. Conclusion du contrôle');
  text(`Le contrôle porte sur ${report.total || 0} observations; ${report.flagPercentage || 0} % sont signalées. Le score global est ${report.qualityScore ?? 'non calculé'} (${report.qualityClassification || 'non évaluable'}).`, 10, bold);
  text('Actions requises avant analyse finale: vérifier chaque ligne signalée dans les fiches sources, documenter les corrections, revoir les équipes ou grappes atypiques, confirmer les règles d’exclusion et régénérer ce rapport sur la base nettoyée. Une observation signalée n’est jamais supprimée automatiquement.');
  text('Limite méthodologique: ce rapport reproduit les principaux contrôles SMART disponibles à partir des variables associées. Les éléments absents sont affichés comme non évaluables; ils ne sont ni estimés ni inventés.');

  const loginUrl = `${new URL(request.url).origin}/connexion?identifiant=${encodeURIComponent(user.email || '')}&redirect=${encodeURIComponent(`/surveys/${id}`)}`;
  const drawQr = await createReportQrCode(pdf, loginUrl);
  if (y < 155) addPage();
  drawQr(page, 'Accès sécurisé à l’enquête source', { x: 493, y: y - 62, labelX: 442, labelY: y - 70 });
  y -= 82;
  pdf.getPages().forEach((current: PDFPage, index) => {
    current.drawText(`NutVitaGlobalis | Plausibilité SMART | page ${index + 1}/${pdf.getPageCount()}`, { x: 45, y: 35, size: 7, font: regular, color: rgb(.45, .48, .5) });
  });
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="plausibilite-smart-${id}.pdf"`,
    },
  });
}
