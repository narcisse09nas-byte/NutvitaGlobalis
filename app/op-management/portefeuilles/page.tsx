import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import PortfolioManager from "@/components/op-management/PortfolioManager";
import { listOrganizations, listPortfolios } from "@/lib/ppm/queries";

export const metadata = { title: "Portefeuilles | PPM NutVitaGlobalis" };

export default async function PortfoliosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/portefeuilles")}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const [organizations, portfolios] = await Promise.all([listOrganizations(supabase), listPortfolios(supabase)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/portefeuilles", label: "Portefeuilles" }]}>
    <PortfolioManager initial={portfolios} organizations={organizations} />
  </PPMShell>;
}
