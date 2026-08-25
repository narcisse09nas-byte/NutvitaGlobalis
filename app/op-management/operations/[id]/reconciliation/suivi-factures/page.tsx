import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import ReconciliationOpsTabs from "@/components/op-management/ReconciliationOpsTabs";
import InvoicePaymentTrackingManager from "@/components/op-management/InvoicePaymentTrackingManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listOpsInvoicePaymentTracking, listOpsInvoices, listOpsSites } from "@/lib/ppm/queries";

export default async function OperationReconciliationInvoiceTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/reconciliation/suivi-factures`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  const locale = await getCurrentLocale();
  const [invoices, sites] = await Promise.all([listOpsInvoices(supabase, id), listOpsSites(supabase, id)]);
  const tracking = await listOpsInvoicePaymentTracking(supabase, invoices.map(item => item.id));

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/reconciliation/suivi-factures`, label: bc(locale, "reconciliation") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <ReconciliationOpsTabs operationId={id} />
        <InvoicePaymentTrackingManager invoices={invoices} sites={sites} initialTracking={tracking} />
      </div>
    </OperationShell>
  </PPMShell>;
}
