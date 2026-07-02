import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { createClient } from '@/lib/supabase/server';

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
  metric('Observations', report.total);
  metric('Observations incluses', report.included);
  metric('Observations signalées/exclues', report.excluded);
  metric('Pourcentage de données hors normes', `${report.flagPercentage ?? 0} %`);
  metric('Ratio garçons/filles', report.ratios?.sexRatio);
  metric('Ratio 6-29 / 30-59 mois', report.ratios?.ageRatio);
  ['whz', 'haz', 'waz'].forEach(indicator => {
    const item = report.distributions?.[indicator] || {};
    metric(indicator.toUpperCase(), `n=${item.count ?? 0}; moyenne=${item.mean?.toFixed?.(2) ?? 'N/A'}; ET=${item.standardDeviation?.toFixed?.(2) ?? 'N/A'}; asymétrie=${item.skewness?.toFixed?.(2) ?? 'N/A'}; aplatissement=${item.kurtosis?.toFixed?.(2) ?? 'N/A'}`);
  });

  heading('2. Doublons, données manquantes et valeurs hors normes');
  if (report.duplicateIds?.length) report.duplicateIds.forEach((item: Row) => text(`- ID ${item.id}: lignes ${item.lines.join(', ')}`));
  else text('Aucun doublon d’identifiant détecté.');
  if (report.flags?.length) report.flags.slice(0, 150).forEach((item: Row) => text(`- Ligne ${item.row}${item.id ? ` / ID ${item.id}` : ''}: ${item.reasons.join(', ')}`));
  else text('Aucune valeur hors norme détectée.');
  if ((report.flags?.length || 0) > 150) text(`... ${report.flags.length - 150} signalement(s) supplémentaire(s) conservé(s) dans les résultats numériques.`);

  heading('3. Distribution de l’âge et ratios âge-sexe');
  metric('Garçons', report.ratios?.boys);
  metric('Filles', report.ratios?.girls);
  metric('Enfants de 6 à 29 mois', report.ratios?.age6To29);
  metric('Enfants de 30 à 59 mois', report.ratios?.age30To59);
  text('Les tests détaillés par classes d’âge nécessitent une taille suffisante dans chaque cellule. Les cellules faibles doivent être regroupées ou évaluées par une méthode exacte.');

  heading('4. Préférence numérique des mesures');
  ['weight', 'height', 'muac'].forEach(key => {
    const item = report.digitPreference?.[key] || {};
    metric(key === 'weight' ? 'Poids' : key === 'height' ? 'Taille' : 'PB/MUAC', `score=${item.score ?? 'N/A'}; qualité=${item.classification ?? 'non évaluable'}; chiffres=${(item.counts || []).join(', ') || 'N/A'}`);
  });

  heading('5. Dispersion, asymétrie et aplatissement');
  const bins = Array.from({ length: 17 }, (_, index) => -4 + index * .5).map(start => ({
    z: start,
    whz: (report.observations || []).filter((item: Row) => item.whz >= start && item.whz < start + .5).length,
    haz: (report.observations || []).filter((item: Row) => item.haz >= start && item.haz < start + .5).length,
    waz: (report.observations || []).filter((item: Row) => item.waz >= start && item.waz < start + .5).length,
  }));
  chart('Courbes de distribution des z-scores', bins, ['whz', 'haz', 'waz']);
  text('Une valeur absolue d’asymétrie ou d’aplatissement supérieure à 0,4 mérite une investigation sur la collecte, l’échantillonnage, les erreurs de mesure et la présence de sous-populations.');

  heading('6. Répartition des cas entre grappes');
  text(report.dispersion ? JSON.stringify(report.dispersion) : 'N/A : une colonne grappe valide et un nombre suffisant de grappes sont requis pour l’indice de dispersion et la comparaison à Poisson.');

  heading('7. Qualité selon l’ordre de mesure dans les grappes');
  text('N/A lorsque l’ordre de passage n’est pas fourni. Quand il est disponible, l’ET du WHZ doit être examiné par rang de passage afin de détecter une dérive en cours de journée.');

  heading('8. Analyse par équipe, village/ZD et enquêteur');
  text(report.groupQuality ? JSON.stringify(report.groupQuality) : 'N/A : associer les colonnes équipe/enquêteur et village/ZD pour produire les tableaux comparatifs.');

  heading('9. Conclusion du contrôle');
  text(`Le contrôle porte sur ${report.total || 0} observations. ${report.flagPercentage || 0} % ont été signalées. La décision d’exclusion doit rester documentée, reproductible et cohérente avec le protocole de l’enquête.`);

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
