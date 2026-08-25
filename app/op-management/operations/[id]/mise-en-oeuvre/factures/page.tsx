import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import MiseEnOeuvreOpsTabs from "@/components/op-management/MiseEnOeuvreOpsTabs";
import InvoiceManager from "@/components/op-management/InvoiceManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listAllStaff, listOpsCooperatives, listOpsDeliveryNotes, listOpsIngredientPrices, listOpsInvoices, listOpsSites } from "@/lib/ppm/queries";

export default async function OperationMiseEnOeuvreFacturesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/mise-en-oeuvre/factures`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  const locale = await getCurrentLocale();
  const [invoices, deliveries, sites, cooperatives, ingredientPrices, staff] = await Promise.all([
    listOpsInvoices(supabase, id), listOpsDeliveryNotes(supabase, id), listOpsSites(supabase, id),
    listOpsCooperatives(supabase, operation.organization_id), listOpsIngredientPrices(supabase, id), listAllStaff(supabase),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/mise-en-oeuvre/factures`, label: bc(locale, "implementation") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <MiseEnOeuvreOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <InvoiceManager operationId={id} initial={invoices} deliveries={deliveries} sites={sites} cooperatives={cooperatives} ingredientPrices={ingredientPrices} currency={operation.currency} staff={staff} />
      </div>
    </OperationShell>
  </PPMShell>;
}
