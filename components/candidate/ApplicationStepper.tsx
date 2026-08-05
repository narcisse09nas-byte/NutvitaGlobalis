import { applicationStatuses, type ApplicationStatus } from "@/lib/recruitment-data";

type Row = Record<string, any>;

const stages: { key: string; label: string; statuses: ApplicationStatus[]; inProgress: ApplicationStatus[] }[] = [
  { key: "dossier", label: "Dossier envoyé", statuses: ["submitted", "under_review", "incomplete", "preselected", "invited_to_test", "test_completed", "invited_to_interview", "interview_completed", "selected", "rejected", "integrated"], inProgress: ["started"] },
  { key: "test", label: "Test écrit", statuses: ["test_completed", "invited_to_interview", "interview_completed", "selected", "rejected", "integrated"], inProgress: ["invited_to_test"] },
  { key: "entretien", label: "Entretien", statuses: ["interview_completed", "selected", "rejected", "integrated"], inProgress: ["invited_to_interview"] },
  { key: "decision", label: "Décision finale", statuses: ["selected", "rejected", "integrated"], inProgress: [] },
];

function dateFor(history: Row[], statuses: string[]) {
  const match = history.find(row => statuses.includes(row.to_status));
  return match?.created_at ? new Date(match.created_at).toLocaleDateString("fr-FR") : null;
}

export default function ApplicationStepper({ status, history }: { status: ApplicationStatus; history: Row[] }) {
  return <div className="grid gap-5 lg:grid-cols-4">
    {stages.map((stage, index) => {
      const done = stage.statuses.includes(status);
      const active = stage.inProgress.includes(status);
      const date = done ? dateFor(history, stage.statuses) : null;
      return <div key={stage.key} className="relative flex flex-col items-center text-center">
        {index > 0 && <span className={`absolute right-1/2 top-5 h-0.5 w-full ${done || active ? "bg-leaf" : "bg-slate-200"}`} style={{ transform: "translateX(-50%)", zIndex: 0 }} />}
        <span className={`relative z-10 grid h-10 w-10 place-items-center rounded-full font-black ${done ? "bg-leaf text-white" : active ? "bg-orange text-white" : "bg-slate-200 text-slate-500"}`}>{index + 1}</span>
        <p className="mt-3 text-sm font-black text-forest">{stage.label}</p>
        <p className={`mt-1 text-xs font-bold ${done ? "text-leaf" : active ? "text-orange" : "text-slate-400"}`}>{done ? "Complété" : active ? applicationStatuses[status] : "À venir"}</p>
        {date && <p className="mt-1 text-[11px] text-slate-400">{date}</p>}
      </div>;
    })}
  </div>;
}
