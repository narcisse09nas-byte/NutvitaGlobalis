import AdminShell from "@/components/admin/AdminShell";
import RecruitmentQuestionImporter from "@/components/admin/RecruitmentQuestionImporter";
import { requireAdmin } from "@/lib/admin";

type CategoryRow = { category: string | null };

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const { data } = await supabase.from("recruitment_test_questions").select("category");
  const categories = [...new Set(((data || []) as CategoryRow[]).map(row => row.category).filter((value): value is string => Boolean(value)))];
  return <AdminShell name={admin.full_name || admin.email}><RecruitmentQuestionImporter scope="nutritionists" categories={categories} /></AdminShell>;
}