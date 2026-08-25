import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import PlanificationOpsTabs from "@/components/op-management/PlanificationOpsTabs";
import DistributionPlanManager from "@/components/op-management/DistributionPlanManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listAllStaff, listOpsDistributionPlans, listOpsProducts, listOpsSites } from "@/lib/ppm/queries";

export default async function OperationPlanificationPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/planification/plan`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  const locale = await getCurrentLocale();
  const [plans, sites, products, staff] = await Promise.all([
    listOpsDistributionPlans(supabase, id), listOpsSites(supabase, id), listOpsProducts(supabase, operation.organization_id), listAllStaff(supabase),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/planification/plan`, label: bc(locale, "planning") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <PlanificationOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <DistributionPlanManager operationId={id} initial={plans} sites={sites} products={products} staff={staff} />
      </div>
    </OperationShell>
  </PPMShell>;
}
