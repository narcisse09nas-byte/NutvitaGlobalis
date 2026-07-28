import { ExamScheduling } from "@/components/proctoring/ExamScheduling";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { LocalRoleGuard } from "@/components/auth/LocalRoleGuard";
export default function ExamSchedulePage() {
  return <LocalRoleGuard allowedRoles={["instructor", "admin", "super_admin"]}>
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]"><LocalizedText fr={"Planification s\u00e9curis\u00e9e"} en="Secure scheduling"/></p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]"><LocalizedText fr="Planifier les examens finaux" en="Schedule final exams"/></h1>
      <p className="mt-3 max-w-3xl text-slate-600"><LocalizedText fr={"Cette fonction est r\u00e9serv\u00e9e aux formateurs et aux administrateurs."} en="This feature is restricted to instructors and administrators."/></p>
      <div className="mt-8"><ExamScheduling/></div>
    </div>
  </LocalRoleGuard>;
}