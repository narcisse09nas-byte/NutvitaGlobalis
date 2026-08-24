import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import PortfolioManager from "@/components/op-management/PortfolioManager";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { listAllStaff, listOrganizations, listPortfolios } from "@/lib/ppm/queries";

export const metadata = { title: "Portefeuilles | PPM NutVitaGlobalis" };

export default async function PortfoliosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/portefeuilles")}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const [organizations, portfolios, staff] = await Promise.all([listOrganizations(supabase), listPortfolios(supabase), listAllStaff(supabase)]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/portefeuilles", label: bc(locale, "portfolios") }]}>
    <PortfolioManager initial={portfolios} organizations={organizations} staff={staff} />
  </PPMShell>;
}
