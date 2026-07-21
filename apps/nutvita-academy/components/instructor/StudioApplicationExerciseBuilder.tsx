"use client";
import { FormEvent, useState } from "react";
import { FileUp, Trash2 } from "lucide-react";
import { createStudioId } from "@/lib/instructor-storage";
import { deleteLocalMedia, saveLocalMedia } from "@/lib/local-media-storage";
import {
  extractDocumentText,
  EXERCISE_DOCUMENT_FORMATS,
} from "@/lib/document-text-import";
import { LocalMediaLink } from "@/components/player/LocalMediaLink";
import type { StudioCourse } from "@/types/instructor-studio";
import type { ApplicationExercise } from "@/types/application-exercise";

type DocumentKey = "caseFr" | "caseEn" | "answerFr" | "answerEn";
type DocumentState = Record<
  DocumentKey,
  { url: string; name: string; text: string }
>;
const emptyDocuments = (): DocumentState => ({
  caseFr: { url: "", name: "", text: "" },
  caseEn: { url: "", name: "", text: "" },
  answerFr: { url: "", name: "", text: "" },
  answerEn: { url: "", name: "", text: "" },
});

export function StudioApplicationExerciseBuilder({
  course,
  onChange,
}: {
  course: StudioCourse;
  onChange: (patch: Partial<StudioCourse>) => void;
}) {
  const [title, setTitle] = useState(""),
    [instructions, setInstructions] = useState(""),
    [moduleIds, setModuleIds] = useState<string[]>([]),
    [attempts, setAttempts] = useState("3");
  const [requiredBeforeProgress, setRequiredBeforeProgress] = useState(false),
    [documents, setDocuments] = useState<DocumentState>(emptyDocuments),
    [uploading, setUploading] = useState<DocumentKey | null>(null);
  const exercises = course.applicationExercises ?? [];
  const toggleModule = (id: string) =>
    setModuleIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  async function upload(key: DocumentKey, file: File) {
    setUploading(key);
    try {
      const previous = documents[key];
      if (previous.url) await deleteLocalMedia(previous.url);
      const [url, text] = await Promise.all([
        saveLocalMedia(file),
        extractDocumentText(file),
      ]);
      if (!text.trim()) throw new Error("DOCUMENT_TEXT_NOT_DETECTED");
      setDocuments((current) => ({
        ...current,
        [key]: { url, name: file.name, text },
      }));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "DOCUMENT_IMPORT_FAILED",
      );
    } finally {
      setUploading(null);
    }
  }
  function add(event: FormEvent) {
    event.preventDefault();
    if (
      !title.trim() ||
      !instructions.trim() ||
      !moduleIds.length ||
      !documents.caseFr.text ||
      !documents.caseEn.text ||
      !documents.answerFr.text ||
      !documents.answerEn.text
    )
      return;
    const exercise: ApplicationExercise = {
      id: createStudioId("exercise"),
      courseSlug: course.slug,
      moduleIds,
      title: title.trim(),
      instructions: instructions.trim(),
      caseUrlFr: documents.caseFr.url,
      caseNameFr: documents.caseFr.name,
      caseTextFr: documents.caseFr.text,
      caseUrlEn: documents.caseEn.url,
      caseNameEn: documents.caseEn.name,
      caseTextEn: documents.caseEn.text,
      referenceAnswerUrlFr: documents.answerFr.url,
      referenceAnswerNameFr: documents.answerFr.name,
      referenceAnswerFr: documents.answerFr.text,
      referenceAnswerUrlEn: documents.answerEn.url,
      referenceAnswerNameEn: documents.answerEn.name,
      referenceAnswerEn: documents.answerEn.text,
      requiredBeforeProgress,
      maxAttempts:
        attempts === "unlimited" ? null : Math.max(1, Number(attempts) || 1),
      createdAt: new Date().toISOString(),
    };
    onChange({ applicationExercises: [...exercises, exercise] });
    setTitle("");
    setInstructions("");
    setModuleIds([]);
    setDocuments(emptyDocuments());
    setRequiredBeforeProgress(false);
  }
  async function remove(exercise: ApplicationExercise) {
    for (const url of [
      exercise.caseUrlFr,
      exercise.caseUrlEn,
      exercise.referenceAnswerUrlFr,
      exercise.referenceAnswerUrlEn,
      exercise.resourceUrl,
    ])
      if (url) await deleteLocalMedia(url);
    onChange({
      applicationExercises: exercises.filter((item) => item.id !== exercise.id),
    });
  }
  const uploadBox = (key: DocumentKey, label: string, required = true) => (
    <label className="cursor-pointer rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-4">
      <span className="flex items-center gap-2 font-bold text-[#063D2E]">
        <FileUp size={17} />
        {uploading === key ? "Extraction du texteâ€¦" : label}
      </span>
      <input
        type="file"
        required={required && !documents[key].url}
        accept={EXERCISE_DOCUMENT_FORMATS}
        disabled={Boolean(uploading)}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(key, file);
          event.target.value = "";
        }}
      />
      {documents[key].name && (
        <span className="mt-2 block text-xs text-slate-600">
          {documents[key].name}
        </span>
      )}
    </label>
  );
  return (
    <section className="rounded-[24px] border border-green-100 bg-white p-6">
      <h2 className="text-2xl font-extrabold text-[#063D2E]">
        Exercices d&apos;application / Application assignments
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Le cas et son corrigÃ© bilingue alimentent la correction automatique. Le
        corrigÃ© n&apos;est jamais affichÃ© Ã  l&apos;apprenant.
      </p>
      <form onSubmit={add} className="mt-5 grid gap-4 md:grid-cols-2">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre / Title"
          className="h-12 rounded-xl border px-3"
        />
        <select
          value={attempts}
          onChange={(e) => setAttempts(e.target.value)}
          className="h-12 rounded-xl border px-3"
        >
          <option value="1">1 tentative / attempt</option>
          <option value="2">2 tentatives / attempts</option>
          <option value="3">3 tentatives / attempts</option>
          <option value="unlimited">IllimitÃ© / Unlimited</option>
        </select>
        <fieldset className="rounded-xl border p-4 md:col-span-2">
          <legend className="px-2 font-bold text-[#063D2E]">
            Modules liÃ©s / Linked modules
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {course.modules.map((module) => (
              <label
                key={module.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 p-3"
              >
                <input
                  type="checkbox"
                  checked={moduleIds.includes(module.id)}
                  onChange={() => toggleModule(module.id)}
                  className="accent-[#0B5D3B]"
                />
                {module.title}
              </label>
            ))}
          </div>
        </fieldset>
        <textarea
          required
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Consignes / Instructions"
          rows={4}
          className="rounded-xl border p-3 md:col-span-2"
        />
        {uploadBox("caseFr", "Charger le cas franÃ§ais")}
        {uploadBox("caseEn", "Upload English case")}
        {uploadBox("answerFr", "Charger le corrigÃ© franÃ§ais")}
        {uploadBox("answerEn", "Upload English reference answer")}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-amber-50 p-4 md:col-span-2">
          <input
            type="checkbox"
            checked={requiredBeforeProgress}
            onChange={(e) => setRequiredBeforeProgress(e.target.checked)}
            className="mt-1 accent-[#0B5D3B]"
          />
          <span>
            <b>Soumission obligatoire avant de poursuivre</b>
            <br />
            <span className="text-sm text-slate-600">
              Les modules suivants resteront verrouillÃ©s jusqu&apos;au dÃ©pÃ´t.
            </span>
          </span>
        </label>
        <button
          disabled={
            Boolean(uploading) || !course.modules.length || !moduleIds.length
          }
          className="rounded-full bg-[#0B5D3B] px-5 py-3 font-bold text-white disabled:bg-slate-300"
        >
          Ajouter l&apos;exercice
        </button>
      </form>
      <div className="mt-5 space-y-3">
        {exercises.map((exercise) => (
          <article key={exercise.id} className="rounded-xl bg-slate-50 p-4">
            <div className="flex justify-between gap-3">
              <div>
                <b>{exercise.title}</b>
                <p className="mt-1 text-sm text-slate-600">
                  {exercise.instructions}
                </p>
                <p className="mt-2 text-xs font-semibold">
                  Modules :{" "}
                  {(exercise.moduleIds ?? [])
                    .map(
                      (id) =>
                        course.modules.find((module) => module.id === id)
                          ?.title,
                    )
                    .filter(Boolean)
                    .join(", ") || "Non dÃ©fini"}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-green-700">
                  {exercise.caseUrlFr && (
                    <LocalMediaLink href={exercise.caseUrlFr}>
                      Cas FR
                    </LocalMediaLink>
                  )}
                  {exercise.caseUrlEn && (
                    <LocalMediaLink href={exercise.caseUrlEn}>
                      Case EN
                    </LocalMediaLink>
                  )}
                  <span>
                    CorrigÃ©s FR/EN chargÃ©s :{" "}
                    {exercise.referenceAnswerFr && exercise.referenceAnswerEn
                      ? "oui"
                      : "non"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void remove(exercise)}
                className="text-red-600"
                aria-label="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
