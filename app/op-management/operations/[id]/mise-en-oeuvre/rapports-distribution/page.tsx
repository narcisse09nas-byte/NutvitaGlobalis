import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import MiseEnOeuvreOpsTabs from "@/components/op-management/MiseEnOeuvreOpsTabs";
import ActivityReportManager from "@/components/op-management/ActivityReportManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listAllStaff, listOpsActivityReports, listOpsAgeGroups, listOpsDeliveryNotes, listOpsProducts, listOpsSites } from "@/lib/ppm/queries";

export default async function OperationMiseEnOeuvreRapportsDistributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/mise-en-oeuvre/rapports-distribution`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  const locale = await getCurrentLocale();
  const [reports, deliveries, sites, products, ageGroups, staff] = await Promise.all([
    listOpsActivityReports(supabase, id), listOpsDeliveryNotes(supabase, id), listOpsSites(supabase, id),
    listOpsProducts(supabase, operation.organization_id), listOpsAgeGroups(supabase, id), listAllStaff(supabase),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/mise-en-oeuvre/rapports-distribution`, label: bc(locale, "implementation") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <MiseEnOeuvreOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <ActivityReportManager operationId={id} initial={reports} deliveries={deliveries} sites={sites} products={products} ageGroups={ageGroups} staff={staff} />
      </div>
    </OperationShell>
  </PPMShell>;
}
