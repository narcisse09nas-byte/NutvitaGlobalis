'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Calculator, CalendarDays, ChevronDown, ChevronUp, Clock, Copy,
  Eye, FileUp, GripVertical, Hash, List, ListChecks, MapPin, MessageSquareText,
  Plus, Repeat2, Save, Send, Trash2, Type, Upload,
} from 'lucide-react';
import { exportQuestionnaireWorkbook, type SurveyQuestion } from '@/survey/lib/xlsform';

type Row = Record<string, any>;
type ChoiceList = { name: string; choices: { value: string; labels: Record<string, string> }[] };

const questionTypes: { type: SurveyQuestion['type']; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Texte', icon: Type },
  { type: 'integer', label: 'Entier', icon: Hash },
  { type: 'decimal', label: 'Décimal', icon: Hash },
  { type: 'date', label: 'Date', icon: CalendarDays },
  { type: 'time', label: 'Heure', icon: Clock },
  { type: 'geopoint', label: 'Géopoint', icon: MapPin },
  { type: 'select_one', label: 'Choix unique', icon: List },
  { type: 'select_multiple', label: 'Choix multiple', icon: ListChecks },
  { type: 'note', label: 'Note', icon: MessageSquareText },
  { type: 'calculate', label: 'Calcul', icon: Calculator },
  { type: 'begin_group', label: 'Début groupe', icon: Copy },
  { type: 'begin_repeat', label: 'Début répétition', icon: Repeat2 },
];

const propertyFields: { key: keyof SurveyQuestion; label: string; placeholder?: string }[] = [
  { key: 'relevant', label: 'Pertinence / condition', placeholder: "selected(${question_precedente}, 'oui')" },
  { key: 'required_message', label: 'Message si obligatoire', placeholder: 'Ce champ est obligatoire.' },
  { key: 'constraint', label: 'Contrainte', placeholder: '. >= 18 and . <= 65' },
  { key: 'constraint_message', label: 'Message de contrainte', placeholder: "L'âge doit être compris entre 18 et 65 ans." },
  { key: 'calculation', label: 'Calcul', placeholder: '${prix} * ${quantite}' },
  { key: 'choice_filter', label: 'Filtre des choix', placeholder: 'region = ${region_selectionnee}' },
  { key: 'repeat_count', label: 'Nombre de répétitions', placeholder: '${nombre_membres}' },
  { key: 'default', label: 'Valeur par défaut', placeholder: "Ex. 'n/a'" },
  { key: 'appearance', label: 'Apparence', placeholder: 'minimal, horizontal, field-list' },
  { key: 'parameters', label: 'Paramètres', placeholder: 'key=value' },
  { key: 'guidance_hint', label: 'Conseil enquêteur', placeholder: 'Instruction non bloquante.' },
  { key: 'trigger', label: 'Déclencheur', placeholder: 'recalculate' },
  { key: 'accuracy_threshold', label: 'Précision GPS', placeholder: '2.5' },
  { key: 'media_image', label: 'Média image', placeholder: 'image.jpg' },
  { key: 'media_audio', label: 'Média audio', placeholder: 'audio.mp3' },
  { key: 'media_video', label: 'Média vidéo', placeholder: 'video.mp4' },
];

const emptyQuestion = (type: SurveyQuestion['type'], index: number): SurveyQuestion => ({
  id: crypto.randomUUID(),
  type,
  name: `question_${index + 1}`,
  label: '',
  labels: { fr: '', en: '' },
  hints: { fr: '', en: '' },
  required: false,
  readonly: false,
});

export default function QuestionnaireBuilder({ survey, initialForm }: { survey: Row; initialForm: Row | null }) {
  const definition = initialForm?.definition || {};
  const [title, setTitle] = useState(initialForm?.title || '');
  const [formCode, setFormCode] = useState(initialForm?.form_code || '');
  const [primaryLanguage, setPrimaryLanguage] = useState(definition.primaryLanguage || 'fr');
  const [secondaryLanguage, setSecondaryLanguage] = useState(definition.secondaryLanguage || 'en');
  const [questions, setQuestions] = useState<SurveyQuestion[]>(definition.questions || []);
  const [choiceLists, setChoiceLists] = useState<ChoiceList[]>(definition.choiceLists || []);
  const [newListName, setNewListName] = useState('');
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const normalizedCode = useMemo(
    () => formCode || title.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase(),
    [formCode, title],
  );

  function updateQuestion(id: string, patch: Partial<SurveyQuestion>) {
    setQuestions(current => current.map(question => question.id === id ? { ...question, ...patch } : question));
  }

  function addQuestion(type: SurveyQuestion['type']) {
    setQuestions(current => [...current, emptyQuestion(type, current.length)]);
  }

  function addChoiceList() {
    const name = newListName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!name || choiceLists.some(list => list.name === name)) return;
    setChoiceLists(current => [...current, { name, choices: [{ value: 'option_1', labels: { fr: '', en: '' } }] }]);
    setNewListName('');
  }

  function updateChoiceList(name: string, choices: ChoiceList['choices']) {
    setChoiceLists(current => current.map(list => list.name === name ? { ...list, choices } : list));
    setQuestions(current => current.map(question =>
      question.listName === name
        ? { ...question, options: choices.map(choice => ({ value: choice.value, label: choice.labels.fr || choice.value })) }
        : question,
    ));
  }

  async function importChoiceLists(file?: File) {
    if (!file) return;
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets.choices || workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const imported = new Map<string, ChoiceList['choices']>();
    rows.forEach(row => {
      const name = String(row.list_name || row.listName || '').trim();
      const value = String(row.name || row.value || '').trim();
      if (!name || !value) return;
      const choices = imported.get(name) || [];
      choices.push({
        value,
        labels: {
          fr: String(row['label::French (fr)'] || row.label || value),
          en: String(row['label::English (en)'] || ''),
        },
      });
      imported.set(name, choices);
    });
    setChoiceLists(current => {
      const preserved = current.filter(list => !imported.has(list.name));
      return [...preserved, ...Array.from(imported, ([name, choices]) => ({ name, choices }))];
    });
    setMessage(`${imported.size} liste(s) de choix importée(s).`);
  }

  async function save(status = initialForm?.status || 'draft') {
    if (!title.trim() || !normalizedCode || questions.length === 0) {
      setMessage('Renseignez le titre, l’identifiant et au moins une question.');
      return;
    }
    setBusy(true);
    const payload = {
      ...(initialForm?.id ? { id: initialForm.id } : {}),
      title,
      form_code: normalizedCode,
      source_type: 'builder',
      status,
      definition: { primaryLanguage, secondaryLanguage, questions, choiceLists },
      status_history: [...(initialForm?.status_history || []), { status, at: new Date().toISOString() }],
    };
    const response = await fetch(`/api/surveys/${survey.id}/resources?resource=forms`, {
      method: initialForm?.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? status === 'pending_endorsement' ? 'Questionnaire soumis pour validation.' : 'Brouillon enregistré.' : result.message || 'Enregistrement impossible.');
    if (response.ok && !initialForm?.id) location.assign(`/surveys/${survey.id}/questionnaire?form=${result.item.id}`);
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/surveys/${survey.id}`} className="grid h-10 w-10 place-items-center rounded-md border"><ArrowLeft className="h-5" /></Link>
            <div><h1 className="text-2xl font-black">Conception du questionnaire</h1><p className="text-sm text-slate-500">{survey.title}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPreview(true)} className="btn-secondary"><Eye className="mr-2 h-4" />Aperçu</button>
            <button disabled={busy} onClick={() => save('draft')} className="btn-primary"><Save className="mr-2 h-4" />Enregistrer</button>
            <button disabled={busy} onClick={() => save('pending_endorsement')} className="btn-primary"><Send className="mr-2 h-4" />Soumettre pour validation</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1700px] gap-6 p-5 xl:grid-cols-[1fr_430px]">
        <section className="grid min-w-0 gap-6">
          {message && <p className="rounded-md bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}
          <Panel title="Paramètres du formulaire">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Titre du formulaire"><input value={title} onChange={event => setTitle(event.target.value)} className="admin-input" /></Field>
              <Field label="Identifiant du formulaire"><input value={formCode} onChange={event => setFormCode(event.target.value)} placeholder={normalizedCode || 'identifiant_formulaire'} className="admin-input" /></Field>
              <Field label="Langue principale"><LanguageSelect value={primaryLanguage} onChange={setPrimaryLanguage} /></Field>
              <Field label="Langue secondaire"><LanguageSelect value={secondaryLanguage} onChange={setSecondaryLanguage} /></Field>
            </div>
          </Panel>

          <Panel title="Questions">
            {questions.length === 0 ? <Empty text="Aucune question. Sélectionnez un type ci-dessous." /> : <div className="grid gap-4">
              {questions.map((question, index) => (
                <article key={question.id} className="rounded-md border bg-white">
                  <header className="flex items-center gap-3 border-b p-4">
                    <GripVertical className="h-5 text-slate-300" />
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-black uppercase text-emerald-800">{question.type.replace('_', ' ')}</span>
                    <b className="min-w-0 flex-1 truncate">{question.labels?.fr || question.label || `Question ${index + 1}`}</b>
                    <button onClick={() => setExpanded(current => ({ ...current, [question.id]: !current[question.id] }))} className="grid h-9 w-9 place-items-center rounded-md border">{expanded[question.id] ? <ChevronUp className="h-4" /> : <ChevronDown className="h-4" />}</button>
                    <button onClick={() => setQuestions(current => current.filter(item => item.id !== question.id))} className="grid h-9 w-9 place-items-center rounded-md bg-red-50 text-red-700"><Trash2 className="h-4" /></button>
                  </header>
                  <div className="grid gap-4 p-4 md:grid-cols-2">
                    <Field label="Nom unique"><input value={question.name} onChange={event => updateQuestion(question.id, { name: event.target.value })} className="admin-input" /></Field>
                    <Field label="Libellé français"><input value={question.labels?.fr || question.label} onChange={event => updateQuestion(question.id, { label: event.target.value, labels: { ...question.labels, fr: event.target.value } })} className="admin-input" /></Field>
                    <Field label="Libellé anglais"><input value={question.labels?.en || ''} onChange={event => updateQuestion(question.id, { labels: { ...question.labels, en: event.target.value } })} className="admin-input" /></Field>
                    {(question.type === 'select_one' || question.type === 'select_multiple') && <Field label="Liste de choix"><select value={question.listName || ''} onChange={event => { const list = choiceLists.find(item => item.name === event.target.value); updateQuestion(question.id, { listName: event.target.value, options: list?.choices.map(choice => ({ value: choice.value, label: choice.labels.fr || choice.value })) || [] }); }} className="admin-input"><option value="">Sélectionner</option>{choiceLists.map(list => <option key={list.name}>{list.name}</option>)}</select></Field>}
                  </div>
                  {expanded[question.id] && <div className="border-t bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Toggle label="Obligatoire" checked={Boolean(question.required)} onChange={checked => updateQuestion(question.id, { required: checked })} />
                      <Toggle label="Lecture seule" checked={Boolean(question.readonly)} onChange={checked => updateQuestion(question.id, { readonly: checked })} />
                      <Field label="Indication française"><input value={question.hints?.fr || ''} onChange={event => updateQuestion(question.id, { hints: { ...question.hints, fr: event.target.value } })} className="admin-input" /></Field>
                      <Field label="Indication anglaise"><input value={question.hints?.en || ''} onChange={event => updateQuestion(question.id, { hints: { ...question.hints, en: event.target.value } })} className="admin-input" /></Field>
                      {propertyFields.map(field => <Field key={field.key} label={field.label}><input value={String(question[field.key] || '')} onChange={event => updateQuestion(question.id, { [field.key]: event.target.value })} placeholder={field.placeholder} className="admin-input" /></Field>)}
                    </div>
                  </div>}
                </article>
              ))}
            </div>}
          </Panel>

          <Panel title="Ajouter une question ou un groupe">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{questionTypes.map(({ type, label, icon: Icon }) => <button key={type} onClick={() => addQuestion(type)} className="flex h-12 items-center justify-center gap-3 rounded-md border bg-white text-sm font-bold hover:border-emerald-500 hover:bg-emerald-50"><Icon className="h-4" />{label}</button>)}</div>
          </Panel>
        </section>

        <aside className="grid h-fit gap-6 xl:sticky xl:top-24">
          <Panel title="Importer des listes de choix">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-5 text-sm font-bold text-slate-600"><Upload className="h-5" />Importer un fichier Excel<input type="file" accept=".xlsx,.xls" className="hidden" onChange={event => importChoiceLists(event.target.files?.[0])} /></label>
          </Panel>
          <Panel title="Gérer les listes de choix">
            <div className="flex gap-2"><input value={newListName} onChange={event => setNewListName(event.target.value)} placeholder="Nom de la nouvelle liste" className="admin-input" /><button onClick={addChoiceList} className="btn-primary"><Plus className="h-4" /></button></div>
            <div className="mt-5 grid gap-4">{choiceLists.map(list => <ChoiceListEditor key={list.name} list={list} update={choices => updateChoiceList(list.name, choices)} remove={() => { setChoiceLists(current => current.filter(item => item.name !== list.name)); setQuestions(current => current.map(question => question.listName === list.name ? { ...question, listName: '', options: [] } : question)); }} />)}</div>
          </Panel>
          <Panel title="Export XLSForm">
            <button onClick={() => exportQuestionnaireWorkbook(title || 'questionnaire', questions)} disabled={!questions.length} className="btn-secondary w-full"><FileUp className="mr-2 h-4" />Télécharger le classeur</button>
          </Panel>
        </aside>
      </div>

      {preview && <Preview questions={questions} close={() => setPreview(false)} />}
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border bg-white"><h2 className="border-b p-5 text-xl font-black">{title}</h2><div className="p-5">{children}</div></section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>;
}
function LanguageSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select value={value} onChange={event => onChange(event.target.value)} className="admin-input"><option value="fr">Français</option><option value="en">English</option><option value="es">Español</option><option value="pt">Português</option></select>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-12 items-center justify-between rounded-md border bg-white px-4 text-sm font-bold">{label}<input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-5 w-5 accent-emerald-700" /></label>;
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-10 text-center text-sm text-slate-500">{text}</div>;
}
function ChoiceListEditor({ list, update, remove }: { list: ChoiceList; update: (choices: ChoiceList['choices']) => void; remove: () => void }) {
  return <div className="rounded-md border p-4"><div className="flex items-center justify-between"><b>{list.name}</b><button onClick={remove} className="text-red-700"><Trash2 className="h-4" /></button></div><div className="mt-3 grid gap-2">{list.choices.map((choice, index) => <div key={`${choice.value}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input value={choice.value} onChange={event => update(list.choices.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} placeholder="valeur" className="admin-input" /><input value={choice.labels.fr || ''} onChange={event => update(list.choices.map((item, itemIndex) => itemIndex === index ? { ...item, labels: { ...item.labels, fr: event.target.value } } : item))} placeholder="libellé" className="admin-input" /><button onClick={() => update(list.choices.filter((_, itemIndex) => itemIndex !== index))} className="text-red-700"><Trash2 className="h-4" /></button></div>)}</div><button onClick={() => update([...list.choices, { value: `option_${list.choices.length + 1}`, labels: { fr: '', en: '' } }])} className="mt-3 text-sm font-bold text-emerald-700">+ Ajouter une option</button></div>;
}
function Preview({ questions, close }: { questions: SurveyQuestion[]; close: () => void }) {
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-5"><div className="mx-auto max-w-3xl rounded-lg bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-black">Aperçu du formulaire</h2><p className="text-sm text-slate-500">Simulation de la collecte</p></div><button onClick={close} className="btn-secondary">Fermer</button></header><form className="grid gap-5 p-6">{questions.map(question => <PreviewField key={question.id} question={question} />)}</form></div></div>;
}
function PreviewField({ question }: { question: SurveyQuestion }) {
  const label = question.labels?.fr || question.label || question.name;
  if (question.type === 'note') return <p className="rounded-md bg-slate-50 p-4">{label}</p>;
  if (question.type === 'begin_group' || question.type === 'begin_repeat') return <h3 className="border-b pb-2 text-lg font-black">{label}</h3>;
  if (question.type === 'select_one') return <Field label={label}><select className="admin-input"><option>Selectionner</option>{question.options?.map(option => <option key={option.value}>{option.label}</option>)}</select></Field>;
  if (question.type === 'select_multiple') return <fieldset className="rounded-md border p-4"><legend className="px-2 font-bold">{label}</legend>{question.options?.map(option => <label key={option.value} className="mr-4 inline-flex gap-2"><input type="checkbox" />{option.label}</label>)}</fieldset>;
  return <Field label={label}><input className="admin-input" type={question.type === 'date' ? 'date' : question.type === 'time' ? 'time' : question.type === 'integer' || question.type === 'decimal' ? 'number' : 'text'} readOnly={question.readonly} required={question.required} placeholder={question.hints?.fr} /></Field>;
}
