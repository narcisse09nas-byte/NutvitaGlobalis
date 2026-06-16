import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLocalAdminMode, hasSupabaseConfig } from "@/lib/supabase/config";
import { createLocalClient, localAdmin } from "@/lib/supabase/local";
import { cookies } from "next/headers";

export async function requireAdmin() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    if ((await cookies()).get("nutvita_local_admin")?.value !== "1") redirect("/admin");
    const admin={...localAdmin,email:process.env.LOCAL_ADMIN_EMAIL||localAdmin.email,full_name:process.env.LOCAL_ADMIN_NAME||localAdmin.full_name};
    return {supabase:createLocalClient(),user:admin,admin};
  }
  if (!hasSupabaseConfig()) redirect("/admin?setup=1");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  const { data: admin } = await supabase.from("admin_users").select("id,email,full_name").eq("id", user.id).eq("active", true).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    redirect("/admin?unauthorized=1");
  }
  return { supabase, user, admin };
}
