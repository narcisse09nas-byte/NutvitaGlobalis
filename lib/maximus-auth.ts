import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasLocalAdminMode, hasSupabaseConfig } from "@/lib/supabase/config";
import { createLocalClient, localAdmin } from "@/lib/supabase/local";

export async function requireMaximusAccess() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    const cookieStore = await cookies();
    if (cookieStore.get("nutvita_local_admin")?.value !== "1") redirect("/maximus/login");
    const admin = {
      ...localAdmin,
      email: cookieStore.get("nutvita_local_admin_email")?.value || localAdmin.email,
      full_name: process.env.LOCAL_ADMIN_NAME || localAdmin.full_name,
      role: "super_admin",
    };
    return { supabase: createLocalClient(), user: admin, admin };
  }

  if (!hasSupabaseConfig()) redirect("/maximus/login?setup=1");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/maximus/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id,email,full_name,role,active")
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    redirect("/maximus/login?unauthorized=1");
  }
  if (admin.role !== "super_admin") redirect("/maximus/login?acces=refuse");
  return { supabase, user, admin };
}
