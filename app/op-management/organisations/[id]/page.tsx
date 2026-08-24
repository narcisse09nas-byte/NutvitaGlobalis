import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import PortfolioManager from "@/components/op-management/PortfolioManager";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import RoleAssignmentManager from "@/components/op-management/RoleAssignmentManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOrganization, listOrganizations, listPortfolios } from "@/lib/ppm/queries";

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/organisations/${id}`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const organization = await getOrganization(supabase, id);
  if (!organization) notFound();
  const [organizations, portfolios] = await Promise.all([listOrganizations(supabase), listPortfolios(supabase, id)]);
  const totalBudget = portfolios.reduce((sum, item) => sum + (item.total_budget || 0), 0);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/organisations", label: bc(locale, "organizations") }, { href: `/op-management/organisations/${id}`, label: organization.name }]}>
    <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-3xl font-black text-forest">{organization.name}</h1>{organization.description && <p className="mt-2 max-w-2xl text-slate-500">{organization.description}</p>}</div>
      <EntityStatusBadge status={organization.status} />
    </div>
    <div className="mb-7 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{bc(locale, "portfolios")}</p><b className="mt-2 block text-2xl text-forest">{portfolios.length}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Consolidated budget" : "Budget consolide"}</p><b className="mt-2 block text-2xl text-forest">{totalBudget ? totalBudget.toLocaleString("fr-FR") : "—"}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Country" : "Pays"}</p><b className="mt-2 block text-2xl text-forest">{organization.country || "—"}</b></div>
    </div>
    <PortfolioManager initial={portfolios} organizations={organizations} organizationId={id} />
    <div className="mt-7"><RoleAssignmentManager scopeType="organization" scopeId={id} scopeLabel={organization.name} /></div>
  </PPMShell>;
}
