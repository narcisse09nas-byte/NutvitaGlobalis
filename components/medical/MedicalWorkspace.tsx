import Link from "next/link";
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  HomeIcon,
  UserGroupIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

type WorkspaceProps = {
  role: "specialist" | "client";
  name: string;
  consultations: any[];
  locale: "fr" | "en";
};

function WorkspaceContent({ role, name, consultations, locale }: WorkspaceProps) {
  const en = locale === "en";
  return (
    <div className="grid gap-7">
      <section id="dashboard">
        <h1 className="text-4xl font-black text-forest">{en ? `Hello ${name}` : `Bonjour ${name}`}</h1>
        <p className="mt-2 text-slate-500">
          {role === "specialist"
            ? en ? "Manage your patients and specialist consultations." : "Gérez vos patients et vos consultations médicales spécialisées."
            : en ? "Your specialist medical care and Premium health monitoring space." : "Votre espace de prise en charge médicale spécialisée et de suivi santé Premium."}
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

      <section id="consultations" className="card p-7">
        <div className="flex flex-wrap justify-between gap-4">
          <h2 className="text-2xl font-black">{en ? "Consultation register" : "Registre des consultations"}</h2>
          {role === "client" ? (
            <Link href="/consultations-medicales/specialistes" className="btn-primary">
              {en ? "Find a specialist" : "Trouver un spécialiste"}
            </Link>
          ) : null}
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="admin-table min-w-[900px]">
            <thead>
              <tr>
                {["ID", en ? "Date" : "Date", role === "specialist" ? "Patient" : en ? "Specialist" : "Spécialiste", en ? "Reason" : "Motif", en ? "Mode" : "Mode", en ? "Status" : "Statut", en ? "Action" : "Action"].map((heading) => <th key={heading}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {consultations.map((consultation) => (
                <tr key={consultation.id}>
                  <td>{consultation.consultation_code}</td>
                  <td>{consultation.scheduled_at ? new Date(consultation.scheduled_at).toLocaleString(en ? "en-GB" : "fr-FR") : "—"}</td>
                  <td>{role === "specialist" ? consultation.client_name : consultation.medical_specialists?.full_name}</td>
                  <td>{consultation.chief_complaint || "—"}</td>
                  <td>{consultation.consultation_mode}</td>
                  <td>{consultation.status}</td>
                  <td><button className="btn-mini">{en ? "View details" : "Voir les détails"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {role === "client" ? (
        <section className="card p-7">
          <h2 className="text-xl font-black">{en ? "Premium health monitoring included" : "Suivi santé Premium inclus"}</h2>
          <p className="mt-2 text-slate-500">
            {en
              ? "Use measurements, trends, reports, goals, food journal and laboratory tools directly from the left navigation."
              : "Utilisez les paramètres, tendances, rapports, objectifs, journal alimentaire et outils de laboratoire directement depuis la navigation de gauche."}
          </p>
        </section>
      ) : (
        <section id="messages" className="card p-7">
          <h2 className="text-xl font-black">{en ? "Confidential messaging" : "Messagerie confidentielle"}</h2>
          <p className="mt-2 text-slate-500">{en ? "Medical conversations remain separated from administrative messages." : "Les échanges médicaux restent séparés des messages administratifs."}</p>
        </section>
      )}
    </div>
  );
}

export default function MedicalWorkspace(props: WorkspaceProps) {
  const en = props.locale === "en";
  if (props.role === "client") return <WorkspaceContent {...props} />;

  const links = [
    ["#dashboard", en ? "Dashboard" : "Tableau de bord", HomeIcon],
    ["#patients", en ? "My patients" : "Mes patients", UserGroupIcon],
    ["#consultations", en ? "Consultations" : "Consultations", ClipboardDocumentListIcon],
    ["#calls", en ? "Video calls" : "Appels vidéo", VideoCameraIcon],
    ["#messages", en ? "Messages" : "Messages", ChatBubbleLeftRightIcon],
    ["/mes-paiements-partenaire", en ? "Payments" : "Paiements", CreditCardIcon],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b bg-white px-6 py-4">
        <b className="text-xl text-forest">NutVita<span className="text-orange">Medical</span></b>
        <div className="flex items-center gap-3"><Link href="/" className="btn-secondary">{en ? "Main site" : "Page principale"}</Link><b>{props.name}</b></div>
      </header>
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="bg-forest p-6 text-white lg:min-h-[calc(100vh-5rem)]">
          <nav className="grid gap-2">
            {links.map(([href, label, Icon]) => <a key={href} href={href} className="flex items-center gap-3 rounded-xl px-4 py-3 font-bold hover:bg-white/10"><Icon className="h-5 w-5" />{label}</a>)}
          </nav>
        </aside>
        <main className="min-w-0 p-6 md:p-10"><WorkspaceContent {...props} /></main>
      </div>
    </div>
  );
}
