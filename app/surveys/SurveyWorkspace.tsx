'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, ClipboardDocumentListIcon, PlusIcon } from '@heroicons/react/24/outline';

type Survey = {
  id: string;
  title: string;
  survey_type: string;
  country?: string;
  status: string;
  starts_at?: string;
  ends_at?: string;
};

const labels: Record<string, string> = {
  food_security: 'Securite alimentaire',
  nutrition: 'Nutrition',
  mixed: 'Mixte',
  other: 'Autre',
};

export default function SurveyWorkspace() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [countries, setCountries] = useState<Array<{ name: string }>>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/surveys').then(response => response.json()).then(result => setSurveys(result.surveys || []));
    fetch('/api/geo?type=countries').then(response => response.json()).then(setCountries).catch(() => setCountries([]));
  }, []);

  async function createSurvey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const response = await fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.message || 'Creation impossible.');
    setSurveys(current => [result.survey, ...current]);
    setMessage('Enquete creee. Vous pouvez maintenant poursuivre sa configuration.');
    form.reset();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
      <form onSubmit={createSurvey} className="rounded-lg border bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><PlusIcon className="h-5" /></span>
          <div><h2 className="font-black">Nouvelle enquete</h2><p className="text-sm text-slate-500">Initialisez le cadre de travail.</p></div>
        </div>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Titre<input name="title" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Type<select name="survey_type" className="admin-input"><option value="food_security">Securite alimentaire</option><option value="nutrition">Nutrition</option><option value="mixed">Mixte</option><option value="other">Autre</option></select></label>
          <label className="grid gap-2 text-sm font-bold">Pays<select name="country" className="admin-input"><option value="">Selectionner un pays</option>{countries.map(country => <option key={country.name} value={country.name}>{country.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm font-bold">Debut<input name="starts_at" type="date" className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Fin<input name="ends_at" type="date" className="admin-input" /></label></div>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={4} className="admin-input" /></label>
          <button disabled={busy} className="btn-primary">{busy ? 'Creation...' : 'Creer l enquete'}</button>
          {message && <p className="text-sm font-bold text-emerald-700">{message}</p>}
        </div>
      </form>
      <section>
        <h2 className="text-2xl font-black">Mes enquetes</h2>
        <div className="mt-4 grid gap-4">
          {surveys.map(survey => (
            <article key={survey.id} className="rounded-lg border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">{labels[survey.survey_type] || survey.survey_type}</p><h3 className="mt-2 text-xl font-black">{survey.title}</h3><p className="mt-1 text-sm text-slate-500">{survey.country || 'Pays non precise'} · {survey.starts_at || 'Date a definir'} - {survey.ends_at || 'Date a definir'}</p></div>
                <div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{survey.status}</span><Link href={`/surveys/${survey.id}`} className="btn-secondary">Gerer<ArrowRightIcon className="ml-2 h-4" /></Link></div>
              </div>
            </article>
          ))}
          {!surveys.length && <div className="rounded-lg border border-dashed bg-white p-10 text-center text-slate-500"><ClipboardDocumentListIcon className="mx-auto h-10 text-slate-300" /><p className="mt-3">Aucune enquete creee.</p></div>}
        </div>
      </section>
    </div>
  );
}
