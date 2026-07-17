import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasLocalAdminMode, hasSupabaseConfig } from "@/lib/supabase/config";
import { findPlatformRole, isPrincipalEmail, platformServices, type PlatformRole, type PlatformServiceKey } from "@/lib/platform-services";

export type AccessChoice = { service: PlatformServiceKey; role: PlatformRole; label: string; href: string };

export async function getPlatformIdentity() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    const store = await cookies();
    const email = store.get("nutvita_local_admin_email")?.value || (store.get("nutvita_local_client")?.value === "1" ? "client@nutvitaglobalis.com" : null);
    return email ? { user: { id: email, email }, supabase: null, superAdmin: isPrincipalEmail(email) || store.get("nutvita_local_admin")?.value === "1" } : null;
  }
  if (!hasSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase.from("admin_users").select("role,active").eq("id", user.id).maybeSingle();
  return { user, supabase, superAdmin: isPrincipalEmail(user.email) || Boolean(admin?.active && admin.role === "super_admin") };
}

export async function requirePlatformIdentity() {
  const identity = await getPlatformIdentity();
  if (!identity) redirect("/connexion?redirect=/choisir-acces");
  return identity;
}

export async function getAccessChoices(): Promise<{ email: string; superAdmin: boolean; choices: AccessChoice[] }> {
  const identity = await requirePlatformIdentity();
  if (identity.superAdmin) {
    return { email: identity.user.email || "", superAdmin: true, choices: platformServices.flatMap(service => service.roles.map(role => ({ service: service.key, role: role.key, label: `${service.title} — ${role.label}`, href: role.href }))) };
  }
  const allowed = new Map<string, Set<string>>();
  const add = (service: string, role: string) => { if (!allowed.has(service)) allowed.set(service, new Set()); allowed.get(service)!.add(role); };
  add("client", "client");
  if (identity.supabase) {
    const userId = identity.user.id;
    const [{ data: grants }, { data: enrollments }, { data: subscriptions }, { data: plans }, { data: bookings }, { data: partner }, { data: nutritrack }] = await Promise.all([
      identity.supabase.from("platform_service_access").select("service_key,roles").eq("user_id", userId).eq("active", true),
      identity.supabase.from("formation_enrollments").select("id").eq("client_id", userId).limit(1),
      identity.supabase.from("subscriptions").select("plan_id,child_id,status,expires_at").eq("client_id", userId).eq("status", "active"),
      identity.supabase.from("subscription_plans").select("id,service_type"),
      identity.supabase.from("consultation_bookings").select("status,access_expires_at").eq("client_id", userId),
      identity.supabase.from("partner_profiles").select("id,status").eq("id", userId).maybeSingle(),
      identity.supabase.from("nutritrack_members").select("id,status").eq("user_id", userId).maybeSingle(),
    ]);
    for (const grant of grants || []) for (const role of grant.roles || []) add(grant.service_key, role);
    if (enrollments?.length) add("academy", "student");
    const types = new Map((plans || []).map((plan: any) => [plan.id, plan.service_type]));
    const active = (subscriptions || []).filter((item: any) => !item.expires_at || +new Date(item.expires_at) > Date.now());
    if (active.some((item: any) => types.get(item.plan_id) === "health_tracking")) add("health", "client");
    if (active.some((item: any) => item.child_id || types.get(item.plan_id) === "child_growth")) add("child_growth", "client");
    if ((bookings || []).some((item: any) => !["cancelled", "refunded"].includes(item.status) && (!item.access_expires_at || +new Date(item.access_expires_at) > Date.now()))) add("teleconsultation", "client");
    if (partner?.status === "active") for (const service of ["health", "child_growth", "teleconsultation"] as const) add(service, "nutritionist");
    if (nutritrack?.status === "active") add("nutritrack", "client");
  }
  const choices = platformServices.flatMap(service => service.roles.filter(role => allowed.get(service.key)?.has(role.key)).map(role => ({ service: service.key, role: role.key, label: `${service.title} — ${role.label}`, href: role.href })));
  return { email: identity.user.email || "", superAdmin: false, choices };
}

export async function validateAccessChoice(service: string, role: string) {
  const destination = findPlatformRole(service, role);
  if (!destination) return null;
  const access = await getAccessChoices();
  return access.choices.some(choice => choice.service === service && choice.role === role) ? destination : null;
}
