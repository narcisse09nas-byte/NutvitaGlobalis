import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import MiseEnOeuvreOpsTabs from "@/components/op-management/MiseEnOeuvreOpsTabs";
import NeedManager from "@/components/op-management/NeedManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listAllStaff, listOpsDistributionPlans, listOpsNeeds, listOpsProducts, listOpsSites } from "@/lib/ppm/queries";

export default async function OperationMiseEnOeuvreBesoinsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/mise-en-oeuvre/besoins`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  if (operation.is_sf_hgsf) redirect(`/op-management/operations/${id}/mise-en-oeuvre/bons-de-commande`);
  const locale = await getCurrentLocale();
  const [needs, plans, sites, products, staff] = await Promise.all([
    listOpsNeeds(supabase, id), listOpsDistributionPlans(supabase, id), listOpsSites(supabase, id), listOpsProducts(supabase, operation.organization_id), listAllStaff(supabase),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/mise-en-oeuvre/besoins`, label: bc(locale, "implementation") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <MiseEnOeuvreOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <NeedManager operationId={id} initial={needs} plans={plans} sites={sites} products={products} staff={staff} />
      </div>
    </OperationShell>
  </PPMShell>;
}
