import Link from "next/link";

// Refinement: the specialist ("role: specialist") side of this component used to be the whole
// /medecin-specialiste workspace (single page, in-page #anchor nav). It has been replaced by a
// real multi-route shell (components/medical/MedicalShell.tsx + app/medecin-specialiste/*),
// mirroring the nutritionist's app/partenaire/* shell. This component's only remaining caller is
// app/espace-client/consultations-medicales/page.tsx (role: "client"), so it's simplified to that
// path only — no more role branching, no more dead anchor-nav UI.
type WorkspaceProps = {
  role: "client";
  name: string;
  consultations: any[];
  locale: "fr" | "en";
};

export default function MedicalWorkspace({ name, consultations, locale }: WorkspaceProps) {
  const en = locale === "en";
  return (
    <div className="grid gap-7">
      <section>
        <h1 className="text-4xl font-black text-forest">{en ? `Hello ${name}` : `Bonjour ${name}`}</h1>
        <p className="mt-2 text-slate-500">
          {en ? "Your specialist medical care and Premium health monitoring space." : "Votre espace de prise en charge médicale spécialisée et de suivi santé Premium."}
        </p>
        <div className="mt-7 grid gap-5 md:grid-cols-4">
          {[
            [en ? "Upcoming" : "À venir", consultations.filter((item) => item.status === "scheduled").length],
            [en ? "Completed" : "Terminées", consultations.filter((item) => item.status === "completed").length],
            [en ? "Documents" : "Documents", consultations.reduce((total, item) => total + (item.documents?.length || 0), 0)],
            [en ? "Messages" : "Messages", 0],
          ].map(([label, value]) => (
            <div className="card p-6" key={String(label)}>
              <small>{label}</small>
              <b className="mt-2 block text-3xl">{value}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-7">
        <div className="flex flex-wrap justify-between gap-4">
          <h2 className="text-2xl font-black">{en ? "Consultation register" : "Registre des consultations"}</h2>
          <Link href="/consultations-medicales/specialistes" className="btn-primary">
            {en ? "Find a specialist" : "Trouver un spécialiste"}
          </Link>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="admin-table min-w-[900px]">
            <thead>
              <tr>
                {["ID", en ? "Date" : "Date", en ? "Specialist" : "Spécialiste", en ? "Reason" : "Motif", en ? "Mode" : "Mode", en ? "Status" : "Statut"].map((heading) => <th key={heading}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {consultations.map((consultation) => (
                <tr key={consultation.id}>
                  <td>{consultation.consultation_code}</td>
                  <td>{consultation.scheduled_at ? new Date(consultation.scheduled_at).toLocaleString(en ? "en-GB" : "fr-FR") : "—"}</td>
                  <td>{consultation.medical_specialists?.full_name}</td>
                  <td>{consultation.chief_complaint || "—"}</td>
                  <td>{consultation.consultation_mode}</td>
                  <td>{consultation.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-7">
        <h2 className="text-xl font-black">{en ? "Premium health monitoring included" : "Suivi santé Premium inclus"}</h2>
        <p className="mt-2 text-slate-500">
          {en
            ? "Use measurements, trends, reports, goals, food journal and laboratory tools directly from the left navigation."
            : "Utilisez les paramètres, tendances, rapports, objectifs, journal alimentaire et outils de laboratoire directement depuis la navigation de gauche."}
        </p>
      </section>
    </div>
  );
}
