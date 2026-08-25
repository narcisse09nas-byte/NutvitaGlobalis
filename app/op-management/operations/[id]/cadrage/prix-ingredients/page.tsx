import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import CadrageOpsTabs from "@/components/op-management/CadrageOpsTabs";
import IngredientPriceManager from "@/components/op-management/IngredientPriceManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listOpsIngredientPrices, listOpsProducts } from "@/lib/ppm/queries";

export default async function OperationCadragePrixIngredientsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/cadrage/prix-ingredients`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  const locale = await getCurrentLocale();
  const [prices, products] = await Promise.all([listOpsIngredientPrices(supabase, id), listOpsProducts(supabase, operation.organization_id)]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/cadrage/prix-ingredients`, label: bc(locale, "scoping") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <CadrageOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <IngredientPriceManager operationId={id} currency={operation.currency} initial={prices} initialProducts={products} />
      </div>
    </OperationShell>
  </PPMShell>;
}
