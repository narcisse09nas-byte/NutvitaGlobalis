import { redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import TaskListManager from "@/components/op-management/TaskListManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { listOperations, listProjects, listTaskLists } from "@/lib/ppm/queries";

export const metadata = { title: "Tableau de taches | PPM NutVitaGlobalis" };

export default async function TaskListsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management/taches")}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const [taskLists, projects, operations] = await Promise.all([listTaskLists(supabase), listProjects(supabase), listOperations(supabase)]);

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/taches", label: bc(locale, "taskTracker") }]}>
    <TaskListManager initial={taskLists} projects={projects} operations={operations} />
  </PPMShell>;
}
