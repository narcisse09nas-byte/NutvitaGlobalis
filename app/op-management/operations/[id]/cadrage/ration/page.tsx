import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import CadrageOpsTabs from "@/components/op-management/CadrageOpsTabs";
import RationManager from "@/components/op-management/RationManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listOpsProducts, listOpsRations } from "@/lib/ppm/queries";

export default async function OperationCadrageRationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/cadrage/ration`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  const locale = await getCurrentLocale();
  const [rations, products] = await Promise.all([listOpsRations(supabase, id), listOpsProducts(supabase, operation.organization_id)]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/cadrage/ration`, label: bc(locale, "scoping") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <CadrageOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <RationManager operationId={id} organizationId={operation.organization_id} initial={rations} initialProducts={products} />
      </div>
    </OperationShell>
  </PPMShell>;
}
