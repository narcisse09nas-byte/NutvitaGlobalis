import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export async function listCurrentUserOrganizations() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "organization_members"
      )
      .select(
        `
        role,
        active,
        organizations (
          id,
          name,
          slug,
          plan,
          branding,
          created_at
        )
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "active",
        true
      );

  if (error) {
    throw error;
  }

  return data ?? [];
}
