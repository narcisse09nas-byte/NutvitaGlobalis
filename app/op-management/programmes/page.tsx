import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import ProgramManager from "@/components/op-management/ProgramManager";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { listAllStaff, listPortfolios, listPrograms } from "@/lib/ppm/queries";

export const metadata = { title: "Programmes | PPM NutVitaGlobalis" };

export default async function ProgramsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/programmes")}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const [portfolios, programs, staff] = await Promise.all([listPortfolios(supabase), listPrograms(supabase), listAllStaff(supabase)]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/programmes", label: bc(locale, "programs") }]}>
    <ProgramManager initial={programs} portfolios={portfolios} staff={staff} />
  </PPMShell>;
}
