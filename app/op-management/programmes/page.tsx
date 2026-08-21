import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import ProgramManager from "@/components/op-management/ProgramManager";
import { listPortfolios, listPrograms } from "@/lib/ppm/queries";

export const metadata = { title: "Programmes | PPM NutVitaGlobalis" };

export default async function ProgramsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/programmes")}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const [portfolios, programs] = await Promise.all([listPortfolios(supabase), listPrograms(supabase)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/programmes", label: "Programmes" }]}>
    <ProgramManager initial={programs} portfolios={portfolios} />
  </PPMShell>;
}
