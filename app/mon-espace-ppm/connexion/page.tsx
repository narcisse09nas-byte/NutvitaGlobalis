import { redirect } from "next/navigation";

export default function PpmStaffConnexionPage() {
  redirect("/connexion?redirect=/api/access/open?service=project_management&role=ppm_staff");
}
