import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import OperationShell from "@/components/op-management/OperationShell";
import PlanificationOpsTabs from "@/components/op-management/PlanificationOpsTabs";
import DailyMenuPlanManager from "@/components/op-management/DailyMenuPlanManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, listOpsDistributionPlans, listOpsMenus, listOpsSites } from "@/lib/ppm/queries";

export default async function OperationPlanificationPlanJournalierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/operations/${id}/planification/plan-journalier`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  if (!operation.is_sf_hgsf) redirect(`/op-management/operations/${id}/planification/plan`);
  const locale = await getCurrentLocale();
  const [plans, sites, menus] = await Promise.all([listOpsDistributionPlans(supabase, id), listOpsSites(supabase, id), listOpsMenus(supabase, id)]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/operations", label: bc(locale, "operations") }, { href: `/op-management/operations/${id}`, label: operation.name }, { href: `/op-management/operations/${id}/planification/plan-journalier`, label: bc(locale, "planning") }]}>
    <OperationShell operation={operation}>
      <div className="grid gap-5">
        <PlanificationOpsTabs operationId={id} isSfHgsf={operation.is_sf_hgsf} />
        <DailyMenuPlanManager operationId={id} plans={plans} sites={sites} menus={menus} />
      </div>
    </OperationShell>
  </PPMShell>;
}
