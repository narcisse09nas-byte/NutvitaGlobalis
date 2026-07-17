import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export async function listPublishedCourses() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data,
    error,
  } =
    await supabase
      .from("courses")
      .select("*")
      .eq(
        "status",
        "published"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (error) {
    throw error;
  }

  return data ?? [];
}
