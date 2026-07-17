import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasLocalAdminMode, hasSupabaseConfig } from "@/lib/supabase/config";
import { createLocalClient, localAdmin } from "@/lib/supabase/local";
import { modulesForAccess } from "@/lib/maximus-access";

export async function requireMaximusAccess(module?: string) {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    const cookieStore = await cookies();
    if (cookieStore.get("nutvita_local_admin")?.value !== "1") redirect("/maximus/login");
    const admin = {
      ...localAdmin,
      email: cookieStore.get("nutvita_local_admin_email")?.value || localAdmin.email,
      full_name: process.env.LOCAL_ADMIN_NAME || localAdmin.full_name,
      role: "super_admin",
    };
    return { supabase: createLocalClient(), user: admin, admin, isSuperAdmin: true, allowedModules: undefined };
  }

  if (!hasSupabaseConfig()) redirect("/connexion?erreur=configuration");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/choisir-acces");

  const [{ data: admin }, { data: access }] = await Promise.all([
    supabase.from("admin_users").select("id,email,full_name,role,active").eq("id", user.id).eq("active", true).maybeSingle(),
    supabase.from("maximus_user_access").select("*").eq("user_id", user.id).eq("active", true).maybeSingle(),
  ]);
  const isSuperAdmin = admin?.role === "super_admin";
  if (!isSuperAdmin && !access) {
    redirect("/choisir-acces?erreur=maximus_non_autorise");
  }
  const allowedModules = isSuperAdmin ? undefined : modulesForAccess(
    Array.isArray(access!.units) && access!.units.length ? access!.units : [access!.unit],
    Array.isArray(access!.module_access) ? access!.module_access : [],
  );
  if (module === "administration/users" && !isSuperAdmin) redirect("/maximus?acces=refuse");
  if (module && !isSuperAdmin && !allowedModules?.includes(module)) {
    if (module === "communications/meetings") {
      const { data: invitation } = await supabase.from("maximus_meeting_participants")
        .select("id")
        .eq("user_id", user.id)
        .neq("invitation_status", "revoked")
        .limit(1)
        .maybeSingle();
      if (!invitation) redirect("/maximus?acces=refuse");
    } else {
      redirect("/maximus?acces=refuse");
    }
  }
  const identity = isSuperAdmin ? admin : { id: user.id, email: access!.email, full_name: access!.full_name, role: access!.role, active: access!.active };
  return { supabase, user, admin: identity, access, isSuperAdmin, allowedModules };
}
