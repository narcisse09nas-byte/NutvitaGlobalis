import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import AuditTrailFeed from "@/components/op-management/AuditTrailFeed";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, getOrganization, getProject, listOperationHistory } from "@/lib/ppm/queries";

const productTypeLabels = { cash: { fr: "Cash", en: "Cash" }, food: { fr: "Vivres (Food)", en: "Food" }, nfi: { fr: "NFI", en: "NFI" }, other: { fr: "Autre", en: "Other" } } as const;
const activityTypeLabels = {
  gfd: { fr: "Distribution generale de vivres (GFD)", en: "General Food Distribution (GFD)" },
  ans: { fr: "Distribution des aliments nutritifs specialises (ANS)", en: "Specialized Nutritious Foods (ANS)" },
  school_meal: { fr: "Repas scolaire", en: "School Meal" },
  other: { fr: "Autre", en: "Other" },
} as const;

export default async function OperationOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  const [organization, project, history] = await Promise.all([
    getOrganization(supabase, operation.organization_id),
    operation.project_id ? getProject(supabase, operation.project_id) : Promise.resolve(null),
    listOperationHistory(supabase, id),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Period" : "Periode"}</p><b className="mt-2 block text-lg text-forest">{new Date(operation.period_start).toLocaleDateString(en ? "en-US" : "fr-FR")} → {new Date(operation.period_end).toLocaleDateString(en ? "en-US" : "fr-FR")}</b></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Product" : "Produit"}</p><b className="mt-2 block text-lg text-forest">{operation.product_type === "other" ? (operation.product_type_other || productTypeLabels.other[locale]) : productTypeLabels[operation.product_type][locale]}</b></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Activity" : "Activite"}</p><b className="mt-2 block text-lg text-forest">{operation.activity_type === "other" ? (operation.activity_type_other || activityTypeLabels.other[locale]) : activityTypeLabels[operation.activity_type][locale]}</b></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">SF/HGSF</p><b className="mt-2 block text-lg text-forest">{operation.is_sf_hgsf ? (en ? "Yes" : "Oui") : (en ? "No" : "Non")}</b></div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-black text-forest">{en ? "Attachment" : "Rattachement"}</h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {organization && <Link href={`/op-management/organisations/${organization.id}`} className="rounded-full bg-mint px-4 py-2 font-bold text-forest">{en ? "Organization" : "Organisation"} : {organization.name}</Link>}
            {project ? <Link href={`/op-management/projets/${project.id}`} className="rounded-full bg-mint px-4 py-2 font-bold text-forest">{en ? "Project" : "Projet"} : {project.name}</Link> : <span className="rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-500">{en ? "Not attached to a project" : "Non rattachee a un projet"}</span>}
          </div>
        </div>

        {operation.description && <div className="rounded-2xl border bg-white p-6"><h2 className="text-lg font-black text-forest">Description</h2><p className="mt-2 text-sm text-slate-600">{operation.description}</p></div>}

        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-black text-forest">{bc(locale, "scoping")}</h2>
          <p className="mt-2 text-sm text-slate-500">{en ? "Sites, rations, menus, ingredient prices, cooperatives and school-cooperative contracts." : "Sites, rations, menus, prix des ingredients, cooperatives et contrats ecole-cooperative."}</p>
          <Link href={`/op-management/operations/${id}/cadrage`} className="btn-secondary mt-4 inline-flex">{en ? "Open scoping →" : "Ouvrir le cadrage →"}</Link>
        </div>

        <AuditTrailFeed entries={history} currentUserId={user.id} />
      </div>
    </OperationShell>
  </PPMShell>;
}
