import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import CadrageOpsTabs from "@/components/op-management/CadrageOpsTabs";
import SiteManager from "@/components/op-management/SiteManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listOpsCooperatives, listOpsSites } from "@/lib/ppm/queries";

export default async function OperationCadrageSitesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/cadrage/sites`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  const locale = await getCurrentLocale();
  const [sites, cooperatives] = await Promise.all([
    listOpsSites(supabase, id),
    operation.is_sf_hgsf ? listOpsCooperatives(supabase, operation.organization_id) : Promise.resolve([]),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/cadrage/sites`, label: bc(locale, "scoping") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <CadrageOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <SiteManager operationId={id} isSfHgsf={operation.is_sf_hgsf} initial={sites} cooperatives={cooperatives} />
      </div>
    </OperationShell>
  </PPMShell>;
}
