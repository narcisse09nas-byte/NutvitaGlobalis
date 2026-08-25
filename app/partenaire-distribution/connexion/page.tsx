import { redirect } from "next/navigation";

export const metadata = { title: "Connexion partenaire distribution" };

export default function Page() {
  redirect("/connexion?redirect=/api/access/open?service=project_management&role=distribution_partner");
}
