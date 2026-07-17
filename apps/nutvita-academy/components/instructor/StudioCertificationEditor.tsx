"use client";

import { useLanguage } from "@/hooks/use-language";
import type { StudioCourse } from "@/types/instructor-studio";

export function StudioCertificationEditor({
  course,
  onChange,
}: {
  course: StudioCourse;
  onChange: (patch: Partial<StudioCourse>) => void;
}) {
  const { locale } = useLanguage();
  const settings = course.certification;
  const update = (patch: Partial<typeof settings>) =>
    onChange({ certification: { ...settings, ...patch } });
  const copy =
    locale === "fr"
      ? {
          title: "Certification et barème",
          issue: "Délivrer un certificat après réussite",
          progress: "Progression minimale (%)",
          director: "Directeur académique",
          proctored: "Examen final sous surveillance renforcée",
          lead: "Préavis minimal (jours)",
          candidates: "Candidats par salle",
          identity: "Seuil d’identité (%)",
          warning:
            "Caméra, microphone, partage d’écran et plein écran sont obligatoires. Une décision défavorable d’identité reste soumise à une révision humaine.",
          note: "Tous les quiz configurés, la progression minimale et l’examen final réussi seront exigés pour générer le certificat.",
        }
      : {
          title: "Certification and grading",
          issue: "Issue a certificate after successful completion",
          progress: "Minimum progress (%)",
          director: "Academic director",
          proctored: "Enhanced-proctoring final exam",
          lead: "Minimum notice (days)",
          candidates: "Candidates per room",
          identity: "Identity threshold (%)",
          warning:
            "Camera, microphone, screen sharing and full screen are mandatory. An adverse identity decision remains subject to human review.",
          note: "All configured quizzes, minimum progress and a passed final exam are required before certificate generation.",
        };
  return (
    <section className="rounded-[24px] border border-green-100 bg-white p-6">
      <h2 className="text-2xl font-extrabold text-[#063D2E]">{copy.title}</h2>
      <label className="mt-5 flex items-center gap-3 rounded-2xl bg-[#F8FAFC] p-4 font-bold text-[#063D2E]">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => update({ enabled: event.target.checked })}
          className="h-5 w-5 accent-[#0B5D3B]"
        />{" "}
        {copy.issue}
      </label>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-[#063D2E]">
          {copy.progress}
          <input
            disabled={!settings.enabled}
            type="number"
            min={1}
            max={100}
            value={settings.minimumCourseProgress}
            onChange={(event) =>
              update({ minimumCourseProgress: Number(event.target.value) })
            }
            className="mt-2 h-11 w-full rounded-xl border px-3 disabled:bg-slate-100"
          />
        </label>
        <label className="text-sm font-bold text-[#063D2E]">
          {copy.director}
          <input
            disabled={!settings.enabled}
            value={settings.academicDirector}
            onChange={(event) =>
              update({ academicDirector: event.target.value })
            }
            className="mt-2 h-11 w-full rounded-xl border px-3 disabled:bg-slate-100"
          />
        </label>
      </div>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <label className="flex items-center gap-3 font-bold text-[#063D2E]">
          <input
            type="checkbox"
            disabled={!settings.enabled}
            checked={settings.proctoredExam}
            onChange={(event) =>
              update({ proctoredExam: event.target.checked })
            }
            className="h-5 w-5 accent-[#0B5D3B]"
          />{" "}
          {copy.proctored}
        </label>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-[#063D2E]">
            {copy.lead}
            <input
              disabled={!settings.enabled || !settings.proctoredExam}
              type="number"
              min={7}
              max={90}
              value={settings.minimumBookingLeadDays}
              onChange={(event) =>
                update({
                  minimumBookingLeadDays: Math.max(
                    7,
                    Number(event.target.value),
                  ),
                })
              }
              className="mt-2 h-11 w-full rounded-xl border px-3 disabled:bg-slate-100"
            />
          </label>
          <label className="text-sm font-bold text-[#063D2E]">
            {copy.candidates}
            <input
              disabled={!settings.enabled || !settings.proctoredExam}
              type="number"
              min={1}
              max={10}
              value={settings.maximumCandidatesPerRoom}
              onChange={(event) =>
                update({
                  maximumCandidatesPerRoom: Math.min(
                    10,
                    Math.max(1, Number(event.target.value)),
                  ),
                })
              }
              className="mt-2 h-11 w-full rounded-xl border px-3 disabled:bg-slate-100"
            />
          </label>
          <label className="text-sm font-bold text-[#063D2E]">
            {copy.identity}
            <input
              disabled={!settings.enabled || !settings.proctoredExam}
              type="number"
              min={85}
              max={100}
              value={settings.identityThreshold}
              onChange={(event) =>
                update({
                  identityThreshold: Math.min(
                    100,
                    Math.max(85, Number(event.target.value)),
                  ),
                })
              }
              className="mt-2 h-11 w-full rounded-xl border px-3 disabled:bg-slate-100"
            />
          </label>
        </div>
        <p className="mt-3 text-xs leading-5 text-amber-900">{copy.warning}</p>
      </div>
      <p className="mt-4 text-sm text-slate-500">{copy.note}</p>
    </section>
  );
}
