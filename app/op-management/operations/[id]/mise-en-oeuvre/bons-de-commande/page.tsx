import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import MiseEnOeuvreOpsTabs from "@/components/op-management/MiseEnOeuvreOpsTabs";
import PurchaseOrderManager from "@/components/op-management/PurchaseOrderManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import {
  getOperation, listAllStaff, listOpsAllMenuIngredients, listOpsCooperatives, listOpsDistributionPlans,
  listOpsIngredientPrices, listOpsMenus, listOpsProducts, listOpsPurchaseOrders, listOpsSites,
} from "@/lib/ppm/queries";

export default async function OperationMiseEnOeuvreBonsDeCommandePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/mise-en-oeuvre/bons-de-commande`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  if (!operation.is_sf_hgsf) redirect(`/op-management/operations/${id}/mise-en-oeuvre/besoins`);
  const locale = await getCurrentLocale();
  const [pos, plans, sites, cooperatives, products, menus, menuIngredients, ingredientPrices, staff] = await Promise.all([
    listOpsPurchaseOrders(supabase, id), listOpsDistributionPlans(supabase, id), listOpsSites(supabase, id),
    listOpsCooperatives(supabase, operation.organization_id), listOpsProducts(supabase, operation.organization_id),
    listOpsMenus(supabase, id), listOpsAllMenuIngredients(supabase, id), listOpsIngredientPrices(supabase, id), listAllStaff(supabase),
  ]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/mise-en-oeuvre/bons-de-commande`, label: bc(locale, "implementation") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <MiseEnOeuvreOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <PurchaseOrderManager operationId={id} initial={pos} plans={plans} sites={sites} cooperatives={cooperatives} products={products} menus={menus} menuIngredients={menuIngredients} ingredientPrices={ingredientPrices} staff={staff} />
      </div>
    </OperationShell>
  </PPMShell>;
}
