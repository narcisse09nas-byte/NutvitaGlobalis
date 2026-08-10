"use client";

import { useMemo, useState } from "react";
import { FileUp, Plus, Save, Trash2 } from "lucide-react";
import { importRecruitmentQuestionFile, type ImportedRecruitmentQuestion } from "@/lib/recruitment-question-import";

type Draft = ImportedRecruitmentQuestion & { promptEn?: string; optionsEn?: string[]; correctAnswersEn?: string[]; explanation?: string; explanationEn?: string };
const blank = (): Draft => ({ prompt: "", promptEn: "", options: ["", "", "", ""], optionsEn: ["", "", "", ""], correctAnswers: [], correctAnswersEn: [], detectedType: "qcm", explanation: "", explanationEn: "" });

export default function RecruitmentQuestionImporter({ scope, categories = [] }: { scope: "nutritionists" | "maximus"; categories?: string[] }) {
  const [questions, setQuestions] = useState<Draft[]>([]);
  const [category, setCategory] = useState(categories[0] || "");
  const [forcedType, setForcedType] = useState("auto");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const count = useMemo(() => questions.filter(question => question.prompt.trim() || question.promptEn?.trim()).length, [questions]);

  async function read(file: File | undefined, language: "fr" | "en") {
    if (!file) return;
    try {
      const rows = await importRecruitmentQuestionFile(file);
      setQuestions(current => {
        const length = Math.max(current.length, rows.length);
        return Array.from({ length }, (_, index) => {
          const existing = current[index] || blank();
          const incoming = rows[index];
          if (!incoming) return existing;
          return language === "fr" ? { ...existing, ...incoming } : { ...existing, promptEn: incoming.prompt, optionsEn: incoming.options, correctAnswersEn: incoming.correctAnswers, detectedType: existing.detectedType || incoming.detectedType };
        });
      });
      setMessage(`${rows.length} question(s) ${language.toUpperCase()} détectée(s). Vérifiez l’appariement et les bonnes réponses.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import impossible."); }
  }

  function update(index: number, changes: Partial<Draft>) { setQuestions(current => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...changes } : question)); }
  function option(index: number, language: "fr" | "en", optionIndex: number, value: string) {
    const key = language === "fr" ? "options" : "optionsEn";
    const values = [...(questions[index][key] || [])]; values[optionIndex] = value; update(index, { [key]: values });
  }
  function correct(index: number, language: "fr" | "en", value: string) { update(index, language === "fr" ? { correctAnswers: [value] } : { correctAnswersEn: [value] }); }

  async function save() {
    const valid = questions.filter(question => question.prompt.trim() || question.promptEn?.trim());
    if (!category.trim() || !valid.length) return setMessage("Précisez la catégorie de poste et ajoutez au moins une question.");
    setBusy(true);
    const response = await fetch("/api/recruitment/question-bank/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, category: category.trim(), question_type: forcedType, questions: valid }) });
    const payload = await response.json(); setBusy(false);
    setMessage(response.ok ? `${payload.count} question(s) bilingue(s) enregistrée(s) dans la banque ${scope === "maximus" ? "Maximus Staff" : "Nutritionnistes"}.` : payload.message || "Enregistrement impossible.");
    if (response.ok) setQuestions([]);
  }

  return <div className="grid gap-6">
    <section className="border bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-orange">Banque distincte · {scope === "maximus" ? "Maximus Staff" : "Nutritionnistes partenaires"}</p><h2 className="mt-2 text-4xl font-black text-forest">Banque de questions bilingue</h2><p className="mt-2 max-w-4xl leading-7 text-slate-500">Créez les questions manuellement ou importez des fichiers HTML, CSV, JSON ou texte en paires FR/EN. Le moteur détecte le type, les choix et les réponses correctes.</p></div><FileUp className="h-10 text-leaf" /></div>
      <div className="mt-7 grid gap-4 lg:grid-cols-3"><label className="grid gap-2 text-sm font-bold">Catégorie de poste<input list={`categories-${scope}`} value={category} onChange={event => setCategory(event.target.value)} className="admin-input" placeholder="Ex. Nutritionniste clinique" /><datalist id={`categories-${scope}`}>{categories.map(item => <option key={item} value={item} />)}</datalist></label><label className="grid gap-2 text-sm font-bold">Type à appliquer<select value={forcedType} onChange={event => setForcedType(event.target.value)} className="admin-input"><option value="auto">Détection automatique</option><option value="qcm">Réponse unique</option><option value="multi_qcm">Réponses multiples</option><option value="open">Question ouverte</option></select></label><div className="rounded-xl bg-mint p-4"><b className="text-forest">{count} question(s) dans le lot</b><p className="mt-1 text-xs text-slate-500">Les versions FR et EN restent appariées dans le même ordre.</p></div></div>
      <div className="mt-5 rounded-xl border border-dashed border-leaf bg-emerald-50/50 p-5"><p className="font-black text-forest">Importer les questions HTML, CSV, JSON ou texte</p><div className="mt-4 flex flex-wrap gap-3"><label className="cursor-pointer rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white">Importer FR<input hidden type="file" accept=".html,.htm,.csv,.json,.txt" onChange={event => read(event.target.files?.[0], "fr")} /></label><label className="cursor-pointer rounded-lg border border-orange bg-white px-4 py-2 text-sm font-bold text-orange">Importer EN<input hidden type="file" accept=".html,.htm,.csv,.json,.txt" onChange={event => read(event.target.files?.[0], "en")} /></label><button type="button" onClick={() => setQuestions(current => [...current, blank()])} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-bold text-forest"><Plus className="h-4" />Créer une question</button></div></div>
      {message && <p className="mt-4 rounded-lg bg-slate-100 p-4 text-sm font-bold text-forest">{message}</p>}
    </section>

    {questions.map((question, index) => <section key={index} className="border bg-white p-6 shadow-sm"><div className="flex justify-between"><div><span className="text-xs font-black uppercase text-orange">Question {index + 1}</span><p className="mt-1 text-sm text-slate-500">{question.detectedType === "multi_qcm" ? "Réponses multiples" : question.detectedType === "open" ? "Question ouverte" : "Réponse unique"}</p></div><button type="button" onClick={() => setQuestions(current => current.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500"><Trash2 className="h-5" /></button></div><div className="mt-5 grid gap-5 lg:grid-cols-2">
      {(["fr", "en"] as const).map(language => { const isFr = language === "fr"; const options = isFr ? question.options : question.optionsEn || []; const answers = isFr ? question.correctAnswers : question.correctAnswersEn || []; return <fieldset key={language} className={`rounded-xl border p-4 ${isFr ? "border-blue-200" : "border-amber-200"}`}><legend className="px-2 font-black text-forest">{language.toUpperCase()} Question</legend><textarea className="admin-input min-h-20" value={isFr ? question.prompt : question.promptEn || ""} onChange={event => update(index, isFr ? { prompt: event.target.value } : { promptEn: event.target.value })} placeholder={isFr ? "Énoncé français" : "English prompt"} />{question.detectedType !== "open" && <div className="mt-3 grid gap-2">{Array.from({ length: Math.max(4, options.length) }, (_, optionIndex) => <label key={optionIndex} className="flex items-center gap-2"><input type="radio" name={`correct-${index}-${language}`} checked={answers.includes(options[optionIndex] || "") && Boolean(options[optionIndex])} onChange={() => correct(index, language, options[optionIndex] || "")} /><input className="admin-input" value={options[optionIndex] || ""} onChange={event => option(index, language, optionIndex, event.target.value)} placeholder={`Option ${optionIndex + 1}`} /></label>)}</div>}<input className="admin-input mt-3" value={isFr ? question.explanation || "" : question.explanationEn || ""} onChange={event => update(index, isFr ? { explanation: event.target.value } : { explanationEn: event.target.value })} placeholder={isFr ? "Explication de la correction" : "Answer explanation"} /></fieldset>; })}
    </div></section>)}
    {questions.length > 0 && <div className="sticky bottom-4 flex justify-end"><button disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-orange px-6 py-3 font-black text-white shadow-lg disabled:opacity-50"><Save className="h-5" />{busy ? "Enregistrement…" : "Enregistrer dans la banque"}</button></div>}
  </div>;
}