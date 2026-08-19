import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasLocalAdminMode, hasSupabaseConfig } from "@/lib/supabase/config";
import { findPlatformRole, isPrincipalEmail, platformServices, type PlatformRole, type PlatformServiceKey } from "@/lib/platform-services";
import { getCurrentLocale } from "@/lib/i18n-server";

export type AccessChoice = { service: PlatformServiceKey; role: PlatformRole; serviceTitle: string; roleLabel: string; href: string };

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
  if (!identity) redirect("/connexion?redirect=/");
  return identity;
}

export async function getAccessChoices(): Promise<{ email: string; superAdmin: boolean; choices: AccessChoice[] }> {
  const identity = await requirePlatformIdentity();
  const english = (await getCurrentLocale()) === "en";
  const title = (service: (typeof platformServices)[number]) => english ? service.titleEn || service.title : service.title;
  if (identity.superAdmin) {
    return { email: identity.user.email || "", superAdmin: true, choices: platformServices.flatMap(service => service.roles.map(role => ({ service: service.key, role: role.key, serviceTitle: title(service), roleLabel: role.label, href: role.href }))) };
  }
  const allowed = new Map<string, Set<string>>();
  const add = (service: string, role: string) => { if (!allowed.has(service)) allowed.set(service, new Set()); allowed.get(service)!.add(role); };
  if (!identity.supabase) add("client", "client");
  if (identity.supabase) {
    const userId = identity.user.id;
    const now = Date.now();
    const [{ data: grants }, { data: clientProfile }, { data: enrollments }, { data: academyProfile }, { data: subscriptions }, { data: plans }, { data: bookings }, { data: partner }, { data: candidate }, { data: medicalApplication }, { data: medicalSpecialist }, { data: medicalConsultations }, { data: nutritrack }, { data: maximus }] = await Promise.all([
      identity.supabase.from("platform_service_access").select("service_key,roles,expires_at").eq("user_id", userId).eq("active", true),
      identity.supabase.from("client_profiles").select("id").eq("id", userId).maybeSingle(),
      identity.supabase.from("formation_enrollments").select("id").eq("client_id", userId).limit(1),
      identity.supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
      identity.supabase.from("subscriptions").select("plan_id,child_id,status,expires_at").eq("client_id", userId).eq("status", "active"),
      identity.supabase.from("subscription_plans").select("id,service_type"),
      identity.supabase.from("consultation_bookings").select("*").eq("client_id", userId),
      identity.supabase.from("dietitian_profiles").select("id,status").eq("candidate_id", userId).maybeSingle(),
      identity.supabase.from("recruitment_applications").select("id").eq("candidate_id", userId).limit(1),
      identity.supabase.from("medical_specialist_applications").select("id").eq("candidate_id", userId).limit(1),
      identity.supabase.from("medical_specialists").select("id,active").eq("user_id", userId).maybeSingle(),
      identity.supabase.from("medical_consultations").select("*").eq("client_id", userId),
      identity.supabase.from("nutritrack_members").select("id,status").eq("user_id", userId).maybeSingle(),
      identity.supabase.from("maximus_user_access").select("active").eq("user_id", userId).eq("active", true).maybeSingle(),
    ]);
    if (clientProfile) add("client", "client");
    const validGrants = (grants || []).filter((grant: any) => !grant.expires_at || +new Date(grant.expires_at) > now);
    for (const grant of validGrants) for (const role of grant.roles || []) add(grant.service_key, role);
    if (enrollments?.length) add("academy", "student");
    if (academyProfile?.role === "student") add("academy", "student");
    if (academyProfile && ["instructor", "admin", "super_admin"].includes(academyProfile.role)) add("academy", academyProfile.role === "super_admin" ? "admin" : academyProfile.role);
    const types = new Map((plans || []).map((plan: any) => [plan.id, plan.service_type]));
    const activeSubscriptions = (subscriptions || []).filter((item: any) => !item.expires_at || +new Date(item.expires_at) > now);
    if (activeSubscriptions.some((item: any) => types.get(item.plan_id) === "health_tracking")) add("health", "client");
    if (activeSubscriptions.some((item: any) => item.child_id || types.get(item.plan_id) === "child_growth")) add("child_growth", "client");
    const activeDietetic = (bookings || []).some((item: any) => {
      if (["cancelled", "refunded"].includes(item.status)) return false;
      if (item.access_expires_at) return +new Date(item.access_expires_at) > now;
      const end = new Date(item.created_at); end.setUTCMonth(end.getUTCMonth() + 3); return +end > now;
    }) || validGrants.some((g: any) => g.service_key === "teleconsultation");
    const activeMedical = (medicalConsultations || []).some((item: any) => {
      if (["cancelled", "refunded", "rejected"].includes(item.status)) return false;
      if (item.access_expires_at) return +new Date(item.access_expires_at) > now;
      const end = new Date(item.created_at); end.setUTCMonth(end.getUTCMonth() + 3); return +end > now;
    }) || validGrants.some((g: any) => g.service_key === "medical_consultation");
    if (activeDietetic) add("teleconsultation", "client");
    if (activeMedical) add("medical_consultation", "client");
    if ((activeDietetic || activeMedical) && allowed.get("health")) allowed.get("health")!.delete("client");
    if (partner?.status === "active") for (const service of ["health", "child_growth", "teleconsultation"] as const) add(service, "nutritionist");
    if (candidate?.length || medicalApplication?.length) add("recruitment", "candidate");
    if (medicalSpecialist?.active) add("medical_consultation", "specialist");
    if (nutritrack?.status === "active") add("nutritrack", "client");
    if (maximus?.active) add("maximus", "staff");
  }
  const choices = platformServices.flatMap(service => service.roles.filter(role => allowed.get(service.key)?.has(role.key)).map(role => ({ service: service.key, role: role.key, serviceTitle: title(service), roleLabel: role.label, href: role.href })));
  return { email: identity.user.email || "", superAdmin: false, choices };
}

export async function validateAccessChoice(service: string, role: string) {
  const destination = findPlatformRole(service, role);
  if (!destination) return null;
  const access = await getAccessChoices();
  return access.choices.some(choice => choice.service === service && choice.role === role) ? destination : null;
}
