import { ExamScheduling } from "@/components/proctoring/ExamScheduling";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export default function ExamSchedulePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        <LocalizedText fr="Certification sécurisée" en="Secure certification" />
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        <LocalizedText fr="Planifier mon examen final" en="Schedule my final exam" />
      </h1>
      <p className="mt-3 max-w-3xl text-slate-600">
        <LocalizedText fr="Choisissez un créneau après validation de tout votre parcours. L’administration approuve ensuite votre demande et ouvre une salle surveillée." en="Choose a slot after completing your learning path. The administration then approves your request and opens a proctored room." />
      </p>
      <div className="mt-8">
        <ExamScheduling />
      </div>
    </div>
  );
}
