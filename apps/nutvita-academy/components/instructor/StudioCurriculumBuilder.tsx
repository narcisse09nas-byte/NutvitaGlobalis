"use client";

import { FormEvent, useState } from "react";
import { ArrowDown, ArrowUp, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { createStudioId, createStudioSlug } from "@/lib/instructor-storage";
import { deleteLocalMedia, saveLocalMedia } from "@/lib/local-media-storage";
import type { StudioCourse, StudioLessonType } from "@/types/instructor-studio";
import { useLanguage } from "@/hooks/use-language";

type Props = {
  course: StudioCourse;
  onChange: (patch: Partial<StudioCourse>) => void;
};

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const fieldClass = "h-11 w-full rounded-xl border border-slate-200 px-3";

export function StudioCurriculumBuilder({ course, onChange }: Props) {
  const { text } = useLanguage();
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleTitleEn, setModuleTitleEn] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleDescriptionEn, setModuleDescriptionEn] = useState("");
  const [activeModuleId, setActiveModuleId] = useState(
    course.modules[0]?.id ?? "",
  );
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonTitleEn, setLessonTitleEn] = useState("");
  const [lessonType, setLessonType] = useState<StudioLessonType>("video");
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [content, setContent] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoUrlEn, setVideoUrlEn] = useState("");
  const [htmlUrl, setHtmlUrl] = useState("");
  const [htmlUrlEn, setHtmlUrlEn] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceUrlEn, setResourceUrlEn] = useState("");
  const [uploading, setUploading] = useState(false);

  function addModule(event: FormEvent) {
    event.preventDefault();
    if (!moduleTitle.trim() && !moduleTitleEn.trim()) return;
    const slugSource = moduleTitle || moduleTitleEn;
    const courseModule = {
      id: createStudioId("module"),
      title: moduleTitle.trim(),
      titleEn: moduleTitleEn.trim(),
      slug: createStudioSlug(slugSource),
      description: moduleDescription.trim(),
      descriptionEn: moduleDescriptionEn.trim(),
      lessons: [],
    };
    onChange({ modules: [...course.modules, courseModule] });
    setActiveModuleId(courseModule.id);
    setModuleTitle("");
    setModuleTitleEn("");
    setModuleDescription("");
    setModuleDescriptionEn("");
  }

  function addLesson(event: FormEvent) {
    event.preventDefault();
    if (!activeModuleId || (!lessonTitle.trim() && !lessonTitleEn.trim()))
      return;
    const lesson = {
      id: createStudioId("lesson"),
      title: lessonTitle.trim(),
      titleEn: lessonTitleEn.trim(),
      slug: createStudioSlug(lessonTitle || lessonTitleEn),
      type: lessonType,
      durationMinutes: Math.max(1, durationMinutes),
      content: content.trim(),
      contentEn: contentEn.trim(),
      videoUrl: lessonType === "video" ? videoUrl || undefined : undefined,
      videoUrlEn: lessonType === "video" ? videoUrlEn || undefined : undefined,
      htmlUrl:
        lessonType === "interactive-html" ? htmlUrl || undefined : undefined,
      htmlUrlEn:
        lessonType === "interactive-html" ? htmlUrlEn || undefined : undefined,
      resourceUrl: resourceUrl || undefined,
      resourceUrlEn: resourceUrlEn || undefined,
    };
    onChange({
      modules: course.modules.map((module) =>
        module.id === activeModuleId
          ? { ...module, lessons: [...module.lessons, lesson] }
          : module,
      ),
    });
    setLessonTitle("");
    setLessonTitleEn("");
    setContent("");
    setContentEn("");
    setVideoUrl("");
    setVideoUrlEn("");
    setHtmlUrl("");
    setHtmlUrlEn("");
    setResourceUrl("");
    setResourceUrlEn("");
    setDurationMinutes(10);
  }

  async function upload(file: File, applyUrl: (url: string) => void) {
    setUploading(true);
    try {
      applyUrl(await saveLocalMedia(file));
    } finally {
      setUploading(false);
    }
  }

  function removeModule(moduleId: string) {
    if (
      !window.confirm(
        text(
          "Supprimer ce module et toutes ses leçons ?",
          "Delete this module and all its lessons?",
        ),
      )
    )
      return;
    onChange({
      modules: course.modules.filter((module) => module.id !== moduleId),
    });
    if (activeModuleId === moduleId) setActiveModuleId("");
  }

  function editModule(moduleId: string) {
    const current = course.modules.find((item) => item.id === moduleId);
    if (!current) return;
    const title = window.prompt(text("Titre français", "French title"), current.title)?.trim();
    const titleEn = window.prompt("English title", current.titleEn)?.trim();
    if (!title && !titleEn) return;
    const description =
      window.prompt(text("Description française", "French description"), current.description) ??
      current.description;
    const descriptionEn =
      window.prompt("English description", current.descriptionEn) ??
      current.descriptionEn;
    onChange({
      modules: course.modules.map((item) =>
        item.id === moduleId
          ? {
              ...item,
              title: title ?? "",
              titleEn: titleEn ?? "",
              slug: createStudioSlug(title || titleEn || item.slug),
              description,
              descriptionEn,
            }
          : item,
      ),
    });
  }

  function editLesson(moduleId: string, lessonId: string) {
    const current = course.modules
      .find((item) => item.id === moduleId)
      ?.lessons.find((item) => item.id === lessonId);
    if (!current) return;
    const title = window.prompt(text("Titre français", "French title"), current.title)?.trim();
    const titleEn = window.prompt("English title", current.titleEn)?.trim();
    if (!title && !titleEn) return;
    const nextContent =
      window.prompt(text("Contenu français", "French content"), current.content) ?? current.content;
    const nextContentEn =
      window.prompt("English content", current.contentEn) ?? current.contentEn;
    const duration = Number(
      window.prompt(text("Durée estimée en minutes", "Estimated duration in minutes"), `${current.durationMinutes}`) ??
        current.durationMinutes,
    );
    onChange({
      modules: course.modules.map((item) =>
        item.id === moduleId
          ? {
              ...item,
              lessons: item.lessons.map((lesson) =>
                lesson.id === lessonId
                  ? {
                      ...lesson,
                      title: title ?? "",
                      titleEn: titleEn ?? "",
                      slug: createStudioSlug(title || titleEn || lesson.slug),
                      content: nextContent,
                      contentEn: nextContentEn,
                      durationMinutes: Math.max(1, duration || 1),
                    }
                  : lesson,
              ),
            }
          : item,
      ),
    });
  }

  async function removeLesson(moduleId: string, lessonId: string) {
    const lesson = course.modules
      .find((module) => module.id === moduleId)
      ?.lessons.find((item) => item.id === lessonId);
    if (
      !lesson ||
      !window.confirm(text("Supprimer cette leçon ?", "Delete this lesson?"))
    )
      return;
    await Promise.all([
      deleteLocalMedia(lesson.videoUrl),
      deleteLocalMedia(lesson.videoUrlEn),
      deleteLocalMedia(lesson.htmlUrl),
      deleteLocalMedia(lesson.htmlUrlEn),
      deleteLocalMedia(lesson.resourceUrl),
      deleteLocalMedia(lesson.resourceUrlEn),
    ]);
    onChange({
      modules: course.modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons.filter((item) => item.id !== lessonId),
            }
          : module,
      ),
    });
  }

  return (
    <section className="rounded-[24px] border border-green-100 bg-white p-6">
      <h2 className="text-2xl font-extrabold text-[#063D2E]">
        Programme et contenus / Curriculum and content
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        {text(
          "Chargez séparément les textes, vidéos et documents français et anglais.",
          "Upload French and English texts, videos and documents separately.",
        )}
      </p>

      <form onSubmit={addModule} className="mt-6 rounded-2xl bg-[#F8FAFC] p-5">
        <h3 className="font-extrabold text-[#063D2E]">
          Nouveau module / New module
        </h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <fieldset className="rounded-xl border border-blue-200 p-4">
            <legend className="px-2 font-bold text-blue-800">
              🇫🇷 Français
            </legend>
            <input
              value={moduleTitle}
              onChange={(event) => setModuleTitle(event.target.value)}
              placeholder="Titre du module"
              className={fieldClass}
            />
            <textarea
              value={moduleDescription}
              onChange={(event) => setModuleDescription(event.target.value)}
              placeholder="Description du module"
              rows={3}
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </fieldset>
          <fieldset className="rounded-xl border border-amber-200 p-4">
            <legend className="px-2 font-bold text-amber-800">
              🇬🇧 English
            </legend>
            <input
              value={moduleTitleEn}
              onChange={(event) => setModuleTitleEn(event.target.value)}
              placeholder="Module title"
              className={fieldClass}
            />
            <textarea
              value={moduleDescriptionEn}
              onChange={(event) => setModuleDescriptionEn(event.target.value)}
              placeholder="Module description"
              rows={3}
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </fieldset>
        </div>
        <button className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-[#F58220] px-5 font-bold text-white">
          <Plus size={18} /> Ajouter le module / Add module
        </button>
      </form>

      <div className="mt-7 space-y-4">
        {course.modules.map((module, moduleIndex) => (
          <article
            key={module.id}
            className={`rounded-2xl border p-5 ${
              activeModuleId === module.id
                ? "border-[#0B5D3B] bg-green-50/40"
                : "border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveModuleId(module.id)}
                className="text-left"
              >
                <p className="text-xs font-bold uppercase text-[#F58220]">
                  Module {moduleIndex + 1}
                </p>
                <h3 className="mt-1 text-lg font-extrabold text-[#063D2E]">
                  🇫🇷 {module.title || "—"}
                </h3>
                <p className="text-sm font-semibold text-slate-600">
                  🇬🇧 {module.titleEn || "Missing English title"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {module.lessons.length} leçon(s) / lesson(s)
                </p>
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => editModule(module.id)}
                  className="p-2 text-[#0B5D3B]"
                  aria-label="Modifier"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ modules: move(course.modules, moduleIndex, -1) })
                  }
                  className="p-2"
                  aria-label="Monter"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ modules: move(course.modules, moduleIndex, 1) })
                  }
                  className="p-2"
                  aria-label="Descendre"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeModule(module.id)}
                  className="p-2 text-red-600"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {module.lessons.length > 0 && (
              <div className="mt-4 space-y-2">
                {module.lessons.map((lesson, lessonIndex) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"
                  >
                    <div>
                      <p className="font-bold text-[#063D2E]">
                        {lessonIndex + 1}. 🇫🇷 {lesson.title || "—"}
                      </p>
                      <p className="text-slate-600">
                        🇬🇧 {lesson.titleEn || "Missing English title"}
                      </p>
                      <span className="text-xs text-slate-400">
                        {lesson.type} · {lesson.durationMinutes} min
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => editLesson(module.id, lesson.id)}
                        className="p-2 text-[#0B5D3B]"
                        aria-label="Modifier"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            modules: course.modules.map((item) =>
                              item.id === module.id
                                ? {
                                    ...item,
                                    lessons: move(
                                      item.lessons,
                                      lessonIndex,
                                      -1,
                                    ),
                                  }
                                : item,
                            ),
                          })
                        }
                        className="p-2"
                        aria-label="Monter"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            modules: course.modules.map((item) =>
                              item.id === module.id
                                ? {
                                    ...item,
                                    lessons: move(item.lessons, lessonIndex, 1),
                                  }
                                : item,
                            ),
                          })
                        }
                        className="p-2"
                        aria-label="Descendre"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeLesson(module.id, lesson.id)}
                        className="p-2 text-red-600"
                        aria-label="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <form onSubmit={addLesson} className="mt-7 rounded-2xl bg-[#F8FAFC] p-5">
        <h3 className="font-extrabold text-[#063D2E]">
          Ajouter une leçon / Add a lesson
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            required
            value={activeModuleId}
            onChange={(event) => setActiveModuleId(event.target.value)}
            className={`${fieldClass} bg-white`}
          >
            <option value="">Choisir le module / Select module</option>
            {course.modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title || module.titleEn}
              </option>
            ))}
          </select>
          <select
            value={lessonType}
            onChange={(event) =>
              setLessonType(event.target.value as StudioLessonType)
            }
            className={`${fieldClass} bg-white`}
          >
            <option value="video">Vidéo / Video</option>
            <option value="interactive-html">
              HTML interactif / Interactive HTML
            </option>
            <option value="reading">Lecture / Reading</option>
            <option value="case-study">Étude de cas / Case study</option>
            <option value="resource">Ressource / Resource</option>
          </select>
          <label className="text-xs font-bold text-slate-600">
            Durée / Duration (min)
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(event) =>
                setDurationMinutes(Number(event.target.value))
              }
              className={fieldClass}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <LanguageLessonFields
            legend="🇫🇷 Leçon française"
            title={lessonTitle}
            setTitle={setLessonTitle}
            content={content}
            setContent={setContent}
            videoUrl={videoUrl}
            setVideoUrl={setVideoUrl}
            htmlUrl={htmlUrl}
            setHtmlUrl={setHtmlUrl}
            resourceUrl={resourceUrl}
            setResourceUrl={setResourceUrl}
            lessonType={lessonType}
            uploading={uploading}
            upload={upload}
            language="fr"
          />
          <LanguageLessonFields
            legend="🇬🇧 English lesson"
            title={lessonTitleEn}
            setTitle={setLessonTitleEn}
            content={contentEn}
            setContent={setContentEn}
            videoUrl={videoUrlEn}
            setVideoUrl={setVideoUrlEn}
            htmlUrl={htmlUrlEn}
            setHtmlUrl={setHtmlUrlEn}
            resourceUrl={resourceUrlEn}
            setResourceUrl={setResourceUrlEn}
            lessonType={lessonType}
            uploading={uploading}
            upload={upload}
            language="en"
          />
        </div>
        <button
          disabled={uploading || course.modules.length === 0}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          <Plus size={17} />{" "}
          {uploading
            ? "Chargement / Uploading…"
            : "Ajouter la leçon / Add lesson"}
        </button>
      </form>
    </section>
  );
}

type LanguageLessonFieldsProps = {
  legend: string;
  title: string;
  setTitle: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  videoUrl: string;
  setVideoUrl: (value: string) => void;
  htmlUrl: string;
  setHtmlUrl: (value: string) => void;
  resourceUrl: string;
  setResourceUrl: (value: string) => void;
  lessonType: StudioLessonType;
  uploading: boolean;
  upload: (file: File, applyUrl: (url: string) => void) => Promise<void>;
  language: "fr" | "en";
};

function LanguageLessonFields(props: LanguageLessonFieldsProps) {
  const isFrench = props.language === "fr";
  return (
    <fieldset
      className={`rounded-xl border p-4 ${isFrench ? "border-blue-200" : "border-amber-200"}`}
    >
      <legend
        className={`px-2 font-bold ${isFrench ? "text-blue-800" : "text-amber-800"}`}
      >
        {props.legend}
      </legend>
      <input
        value={props.title}
        onChange={(event) => props.setTitle(event.target.value)}
        placeholder={isFrench ? "Titre de la leçon" : "Lesson title"}
        className={fieldClass}
      />
      <textarea
        value={props.content}
        onChange={(event) => props.setContent(event.target.value)}
        placeholder={
          isFrench
            ? "Contenu, résumé ou instructions"
            : "Content, summary or instructions"
        }
        rows={4}
        className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3"
      />
      {props.lessonType === "video" && (
        <>
          <input
            value={props.videoUrl}
            onChange={(event) => props.setVideoUrl(event.target.value)}
            placeholder={
              isFrench ? "URL de la vidéo française" : "English video URL"
            }
            className={`mt-3 ${fieldClass}`}
          />
          <label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#0B5D3B] bg-white px-3 text-sm font-bold text-[#0B5D3B]">
            <FileUp size={17} />{" "}
            {isFrench ? "Charger la vidéo FR" : "Upload EN video"}
            <input
              disabled={props.uploading}
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(event) =>
                event.target.files?.[0] &&
                void props.upload(event.target.files[0], props.setVideoUrl)
              }
            />
          </label>
        </>
      )}
      {props.lessonType === "interactive-html" && (
        <>
          <input
            value={props.htmlUrl}
            onChange={(event) => props.setHtmlUrl(event.target.value)}
            placeholder={
              isFrench
                ? "URL du document HTML interactif"
                : "Interactive HTML document URL"
            }
            className={`mt-3 ${fieldClass}`}
          />
          <label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#0B5D3B] bg-white px-3 text-sm font-bold text-[#0B5D3B]">
            <FileUp size={17} />{" "}
            {isFrench ? "Charger le HTML FR" : "Upload EN HTML"}
            <input
              disabled={props.uploading}
              type="file"
              accept=".html,.htm,text/html"
              className="sr-only"
              onChange={(event) =>
                event.target.files?.[0] &&
                void props.upload(event.target.files[0], props.setHtmlUrl)
              }
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {isFrench
              ? "Utilisez des sections data-reveal-step et des éléments data-explanation. La section suivante restera verrouillée jusqu’à leur consultation."
              : "Use data-reveal-step sections and data-explanation elements. The next section stays locked until each one is explored."}
          </p>
        </>
      )}
      <input
        value={props.resourceUrl}
        onChange={(event) => props.setResourceUrl(event.target.value)}
        placeholder={
          isFrench ? "URL du document français" : "English resource URL"
        }
        className={`mt-3 ${fieldClass}`}
      />
      <label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#0B5D3B] bg-white px-3 text-sm font-bold text-[#0B5D3B]">
        <FileUp size={17} />{" "}
        {isFrench ? "Charger le document FR" : "Upload EN document"}
        <input
          disabled={props.uploading}
          type="file"
          className="sr-only"
          onChange={(event) =>
            event.target.files?.[0] &&
            void props.upload(event.target.files[0], props.setResourceUrl)
          }
        />
      </label>
    </fieldset>
  );
}
