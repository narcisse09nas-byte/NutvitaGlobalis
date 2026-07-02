import * as XLSX from 'xlsx';

export type SurveyQuestion = {
  id: string;
  type: 'text' | 'integer' | 'decimal' | 'date' | 'time' | 'geopoint' | 'select_one' | 'select_multiple' | 'note' | 'calculate' | 'begin_group' | 'end_group' | 'begin_repeat' | 'end_repeat';
  name: string;
  label: string;
  labels?: Record<string, string>;
  hints?: Record<string, string>;
  required?: boolean;
  options?: { value: string; label: string }[];
  listName?: string;
  relevant?: string;
  required_message?: string;
  constraint?: string;
  constraint_message?: string;
  calculation?: string;
  choice_filter?: string;
  repeat_count?: string;
  default?: string;
  readonly?: boolean;
  appearance?: string;
  parameters?: string;
  guidance_hint?: string;
  trigger?: string;
  accuracy_threshold?: string;
  media_image?: string;
  media_audio?: string;
  media_video?: string;
  moduleId?: string;
  indicatorMetadata?: Record<string, unknown>;
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
    if (!sourceType) return [];
    const structuralType = sourceType.replace(' ', '_');
    if (['begin_group','end_group','begin_repeat','end_repeat'].includes(structuralType)) {
      return [{
        id: crypto.randomUUID(),
        type: structuralType as SurveyQuestion['type'],
        name: clean(row.name) || `${structuralType}_${index + 1}`,
        label: clean(row.label || row['label::French (fr)']),
        labels: { fr: clean(row['label::French (fr)'] || row.label), en: clean(row['label::English (en)']) },
        relevant: clean(row.relevant),
        repeat_count: clean(row.repeat_count),
        appearance: clean(row.appearance),
      }];
    }
    const [rawType, listName] = sourceType.split(/\s+/, 2);
    const type = rawType === 'integer'
      ? 'integer'
      : rawType === 'decimal'
        ? 'decimal'
      : rawType === 'select_one'
        ? 'select_one'
        : rawType === 'select_multiple'
          ? 'select_multiple'
          : rawType === 'date'
            ? 'date'
            : rawType === 'time'
              ? 'time'
              : rawType === 'geopoint'
                ? 'geopoint'
                : rawType === 'calculate'
                  ? 'calculate'
            : rawType === 'note'
              ? 'note'
              : 'text';
    return [{
      id: crypto.randomUUID(),
      type,
      name: clean(row.name) || `question_${index + 1}`,
      label: clean(row.label || row['label::French (fr)'] || row.name),
      labels: {
        fr: clean(row['label::French (fr)'] || row.label || row.name),
        en: clean(row['label::English (en)']),
      },
      hints: {
        fr: clean(row['hint::French (fr)'] || row.hint),
        en: clean(row['hint::English (en)']),
      },
      required: ['yes', 'true', '1'].includes(clean(row.required).toLowerCase()),
      options: listName ? choices.get(listName) || [] : undefined,
      listName,
      relevant: clean(row.relevant),
      required_message: clean(row.required_message),
      constraint: clean(row.constraint),
      constraint_message: clean(row.constraint_message),
      calculation: clean(row.calculation),
      choice_filter: clean(row.choice_filter),
      repeat_count: clean(row.repeat_count),
      default: clean(row.default),
      readonly: ['yes', 'true', '1'].includes(clean(row.readonly).toLowerCase()),
      appearance: clean(row.appearance),
      parameters: clean(row.parameters),
      guidance_hint: clean(row.guidance_hint),
      trigger: clean(row.trigger),
      accuracy_threshold: clean(row['body::accuracyThreshold']),
      media_image: clean(row['media::image']),
      media_audio: clean(row['media::audio']),
      media_video: clean(row['media::video']),
    } satisfies SurveyQuestion];
  });
  return { questions, sheetNames: workbook.SheetNames };
}

export function exportQuestionnaireWorkbook(title: string, questions: SurveyQuestion[]) {
  const surveyRows = questions.map(question => ({
    type: question.type === 'select_one' || question.type === 'select_multiple'
      ? `${question.type} ${question.listName || question.name}`
      : question.type.replace('_', ' '),
    name: question.type === 'end_group' || question.type === 'end_repeat' ? '' : question.name,
    label: question.labels?.fr || question.label,
    'label::French (fr)': question.labels?.fr || question.label,
    'label::English (en)': question.labels?.en || '',
    'hint::French (fr)': question.hints?.fr || '',
    'hint::English (en)': question.hints?.en || '',
    required: question.required ? 'yes' : '',
    relevant: question.relevant || '',
    required_message: question.required_message || '',
    constraint: question.constraint || '',
    constraint_message: question.constraint_message || '',
    calculation: question.calculation || '',
    choice_filter: question.choice_filter || '',
    repeat_count: question.repeat_count || '',
    default: question.default || '',
    readonly: question.readonly ? 'yes' : '',
    appearance: question.appearance || '',
    parameters: question.parameters || '',
    guidance_hint: question.guidance_hint || '',
    trigger: question.trigger || '',
    'body::accuracyThreshold': question.accuracy_threshold || '',
    'media::image': question.media_image || '',
    'media::audio': question.media_audio || '',
    'media::video': question.media_video || '',
  }));
  const choiceRows = questions.flatMap(question => (question.options || []).map(option => ({
    list_name: question.listName || question.name,
    name: option.value,
    label: option.label,
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(surveyRows), 'survey');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(choiceRows), 'choices');
  XLSX.writeFile(workbook, `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-xlsform.xlsx`);
}
