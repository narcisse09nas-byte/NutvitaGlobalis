import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPpmEvent } from "@/lib/ppm/notifications";
import type { PpmTask, PpmTaskList } from "@/lib/ppm/types";

// Time Table / action tracker (Wave 9 polish): Vercel Cron hits this route daily, protected by
// CRON_SECRET like app/api/cron/evm-snapshots/route.ts. Sends one reminder per task, the first
// time its deadline comes within 3 days — reminder_sent_at gates it so a task is never nagged
// more than once, rather than resending every day of that window.
const REMINDER_WINDOW_DAYS = 3;

function fmtDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR"); }

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected && request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ message: "Non autorise." }, { status: 401 });
  }

  const service = createAdminClient();
  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + REMINDER_WINDOW_DAYS);
  const todayStr = today.toISOString().slice(0, 10);
  const windowEndStr = windowEnd.toISOString().slice(0, 10);

  const { data: dueTasks } = await service.from("ppm_tasks").select("*")
    .neq("status", "done").not("deadline", "is", null)
    .gte("deadline", todayStr).lte("deadline", windowEndStr)
    .is("reminder_sent_at", null);
  const tasks = (dueTasks || []) as PpmTask[];

  let sent = 0;
  for (const task of tasks) {
    if (!task.responsible_email) continue;
    const { data: taskList } = await service.from("ppm_task_lists").select("*").eq("id", task.task_list_id).maybeSingle();
    const typedList = taskList as PpmTaskList | null;
    let contextLabel = "";
    if (typedList?.project_id) {
      const { data: project } = await service.from("ppm_projects").select("name").eq("id", typedList.project_id).maybeSingle();
      contextLabel = project?.name ? `Contexte : ${project.name}` : "";
    } else if (typedList?.operation_id) {
      const { data: operation } = await service.from("ppm_ops_operations").select("name").eq("id", typedList.operation_id).maybeSingle();
      contextLabel = operation?.name ? `Contexte : ${operation.name}` : "";
    }

    await notifyPpmEvent(service, {
      recipient: { userId: task.responsible_user_id || undefined, email: task.responsible_email },
      category: "reminder",
      titleFr: "Echeance proche", titleEn: "Upcoming deadline",
      messageFr: `${task.title} — echeance : ${fmtDate(task.deadline as string)}`,
      messageEn: `${task.title} — deadline: ${fmtDate(task.deadline as string)}`,
      link: `/op-management/taches/${task.task_list_id}`,
      emailTemplateId: "ppm_task_deadline_reminder",
      emailVariables: { name: task.responsible_name || "", task_title: task.title, context_line: contextLabel, deadline: fmtDate(task.deadline as string) },
    });
    await service.from("ppm_tasks").update({ reminder_sent_at: new Date().toISOString() }).eq("id", task.id);
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, scanned: tasks.length });
}
