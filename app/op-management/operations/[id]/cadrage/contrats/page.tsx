import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import CadrageOpsTabs from "@/components/op-management/CadrageOpsTabs";
import SchoolCooperativeContractManager from "@/components/op-management/SchoolCooperativeContractManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listOpsCooperatives, listOpsSchoolCooperativeContracts, listOpsSites } from "@/lib/ppm/queries";

export default async function OperationCadrageContratsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/cadrage/contrats`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  if (!operation.is_sf_hgsf) redirect(`/op-management/operations/${id}/cadrage/sites`);
  const locale = await getCurrentLocale();
  const [contracts, sites, cooperatives] = await Promise.all([
    listOpsSchoolCooperativeContracts(supabase, id), listOpsSites(supabase, id), listOpsCooperatives(supabase, operation.organization_id),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/cadrage/contrats`, label: bc(locale, "scoping") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <CadrageOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <SchoolCooperativeContractManager operationId={id} initial={contracts} sites={sites} cooperatives={cooperatives} />
      </div>
    </OperationShell>
  </PPMShell>;
}
