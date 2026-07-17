import { redirect } from "next/navigation";

export default function LegacyModuleOneQuizPage() {
  redirect("/dashboard/assessments/camms-module-1");
}
