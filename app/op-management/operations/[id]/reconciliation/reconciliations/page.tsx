import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import ReconciliationOpsTabs from "@/components/op-management/ReconciliationOpsTabs";
import ReconciliationDashboard from "@/components/op-management/ReconciliationDashboard";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import {
  getOperation, listOpsReconciliationCooperative, listOpsReconciliationDates,
  listOpsReconciliationNotes, listOpsReconciliationProducts, listOpsReconciliationValue,
} from "@/lib/ppm/queries";

export default async function OperationReconciliationDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/reconciliation/reconciliations`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  const locale = await getCurrentLocale();
  const [products, value, cooperative, dates, notes] = await Promise.all([
    listOpsReconciliationProducts(supabase, id), listOpsReconciliationValue(supabase, id),
    listOpsReconciliationCooperative(supabase, id), listOpsReconciliationDates(supabase, id),
    listOpsReconciliationNotes(supabase, id),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/reconciliation/reconciliations`, label: bc(locale, "reconciliation") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <ReconciliationOpsTabs operationId={id} />
        <ReconciliationDashboard operationId={id} isSfHgsf={operation.is_sf_hgsf} products={products} value={value} cooperative={cooperative} dates={dates} initialNotes={notes} />
      </div>
    </OperationShell>
  </PPMShell>;
}
