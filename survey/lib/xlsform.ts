import * as XLSX from 'xlsx';

export type SurveyQuestion = {
  id: string;
  type: 'text' | 'number' | 'date' | 'select_one' | 'select_multiple' | 'note';
  name: string;
  label: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export function parseXlsForm(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const surveySheet = workbook.Sheets.survey || workbook.Sheets[workbook.SheetNames[0]];
  if (!surveySheet) throw new Error('La feuille survey est introuvable.');
  const choicesSheet = workbook.Sheets.choices;
  const surveyRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(surveySheet, { defval: '' });
  const choiceRows = choicesSheet
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(choicesSheet, { defval: '' })
    : [];
  const choices = new Map<string, { value: string; label: string }[]>();
  choiceRows.forEach(row => {
    const list = clean(row.list_name || row.listName);
    if (!list) return;
    const values = choices.get(list) || [];
    values.push({ value: clean(row.name), label: clean(row.label || row['label::French (fr)'] || row.name) });
    choices.set(list, values);
  });
  const questions: SurveyQuestion[] = surveyRows.flatMap((row, index) => {
    const sourceType = clean(row.type);
    if (!sourceType || sourceType.startsWith('begin ') || sourceType.startsWith('end ')) return [];
    const [rawType, listName] = sourceType.split(/\s+/, 2);
    const type = rawType === 'integer' || rawType === 'decimal'
      ? 'number'
      : rawType === 'select_one'
        ? 'select_one'
        : rawType === 'select_multiple'
          ? 'select_multiple'
          : rawType === 'date'
            ? 'date'
            : rawType === 'note'
              ? 'note'
              : 'text';
    return [{
      id: crypto.randomUUID(),
      type,
      name: clean(row.name) || `question_${index + 1}`,
      label: clean(row.label || row['label::French (fr)'] || row.name),
      required: ['yes', 'true', '1'].includes(clean(row.required).toLowerCase()),
      options: listName ? choices.get(listName) || [] : undefined,
    } satisfies SurveyQuestion];
  });
  return { questions, sheetNames: workbook.SheetNames };
}

export function exportQuestionnaireWorkbook(title: string, questions: SurveyQuestion[]) {
  const surveyRows = questions.map(question => ({
    type: question.type === 'number' ? 'decimal' : question.type,
    name: question.name,
    label: question.label,
    required: question.required ? 'yes' : '',
  }));
  const choiceRows = questions.flatMap(question => (question.options || []).map(option => ({
    list_name: question.name,
    name: option.value,
    label: option.label,
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(surveyRows), 'survey');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(choiceRows), 'choices');
  XLSX.writeFile(workbook, `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-xlsform.xlsx`);
}
