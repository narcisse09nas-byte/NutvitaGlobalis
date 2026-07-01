import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { modulesForAccess, type MaximusFunction } from "@/lib/maximus-access";

export async function requireMaximusApi(module: string, required: MaximusFunction = "viewer") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Authentification requise." }, { status: 401 }) };
  const [{ data: admin }, { data: access }] = await Promise.all([
    supabase.from("admin_users").select("role,active").eq("id", user.id).eq("active", true).maybeSingle(),
    supabase.from("maximus_user_access").select("*").eq("user_id", user.id).eq("active", true).maybeSingle(),
  ]);
  if (admin?.role === "super_admin") return { supabase, user, isSuperAdmin: true, access: null };
  const allowedModules = access ? modulesForAccess(
    Array.isArray(access.units) && access.units.length ? access.units : [access.unit],
    Array.isArray(access.module_access) ? access.module_access : [],
  ) : [];
  if (!access || !allowedModules.includes(module)) {
    return { error: NextResponse.json({ message: "Votre unite ne donne pas acces a ce module Maximus." }, { status: 403 }) };
  }
  if (!access.is_assistant_admin && !access.functions?.includes(required)) {
    return { error: NextResponse.json({ message: `Fonction ${required} requise dans votre unite.` }, { status: 403 }) };
  }
  return { supabase, user, isSuperAdmin: false, access };
}
