import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import TaskBoard from "@/components/op-management/TaskBoard";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getOperation, getTaskList, listAllStaff, listTasks } from "@/lib/ppm/queries";

export default async function TaskListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/taches/${id}`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const taskList = await getTaskList(supabase, id);
  if (!taskList) notFound();
  const locale = await getCurrentLocale();

  const [tasks, staff] = await Promise.all([listTasks(supabase, id), listAllStaff(supabase)]);
  let contextLabel: string | null = null;
  if (taskList.project_id) {
    const { data: project } = await supabase.from("ppm_projects").select("name").eq("id", taskList.project_id).maybeSingle();
    contextLabel = project?.name || null;
  } else if (taskList.operation_id) {
    const operation = await getOperation(supabase, taskList.operation_id);
    contextLabel = operation?.name || null;
  }

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/taches", label: bc(locale, "taskTracker") }, { href: `/op-management/taches/${id}`, label: taskList.title }]}>
    <TaskBoard taskList={taskList} initial={tasks} staff={staff} contextLabel={contextLabel} />
  </PPMShell>;
}
