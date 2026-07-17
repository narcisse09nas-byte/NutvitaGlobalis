import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmail, resend } from "@/lib/api";
import { maximusAssignableModules, maximusFunctions, maximusUnits } from "@/lib/maximus-access";

async function superAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Authentification requise." }, { status: 401 }) };
  const { data: admin } = await supabase.from("admin_users").select("role,active").eq("id", user.id).maybeSingle();
  if (!admin?.active || admin.role !== "super_admin") return { error: NextResponse.json({ message: "Super administrateur requis." }, { status: 403 }) };
  return { user, service: createAdminClient() };
}

function validPayload(body: Record<string, any>) {
  const functions = Array.isArray(body.functions) ? body.functions.filter((item: string) => maximusFunctions.includes(item as any)) : [];
  const requestedUnits = Array.isArray(body.units) ? body.units : [body.unit];
  const units = [...new Set(requestedUnits.map(String).filter(unit => maximusUnits.some(item => item.value === unit)))];
  const moduleAccess = Array.isArray(body.module_access)
    ? [...new Set(body.module_access.map(String).filter(slug => maximusAssignableModules.some(module => module.value === slug)))]
    : [];
  const unit = units[0] || "";
  return {
    email: String(body.email || "").trim().toLowerCase(),
    full_name: String(body.full_name || "").trim(),
    role: body.role === "manager" ? "manager" : "staff",
    unit,
    units,
    module_access: moduleAccess,
    is_assistant_admin: Boolean(body.is_assistant_admin),
    is_supervisor: Boolean(body.is_supervisor),
    functions: functions.length ? functions : ["viewer"],
    central_kitchen: String(body.central_kitchen || "").trim() || null,
    sale_point: String(body.sale_point || "").trim() || null,
    active: body.active !== false,
  };
}

export async function GET() {
  const ctx = await superAdmin();
  if ("error" in ctx) return ctx.error;
  const [{ data: access }, kitchens, salePoints] = await Promise.all([
    ctx.service.from("maximus_user_access").select("*").order("full_name"),
    ctx.service.from("maximus_records").select("title,data").eq("module", "production/central-kitchens").order("title"),
    ctx.service.from("maximus_records").select("title,data").eq("module", "sales/sale-points").order("title"),
  ]);
  return NextResponse.json({
    users: (access || []).map(user => ({
      ...user,
      units: Array.isArray(user.units) && user.units.length ? user.units : [user.unit],
      module_access: Array.isArray(user.module_access) ? user.module_access : [],
    })),
    kitchens: (kitchens.data || []).map(item => String(item.data?.name || item.title)),
    sale_points: (salePoints.data || []).map(item => String(item.data?.name || item.title)),
  });
}

export async function POST(request: Request) {
  const ctx = await superAdmin();
  if ("error" in ctx) return ctx.error;
  const body = await request.json();
  const payload = validPayload(body);
  if (!isEmail(payload.email) || !payload.full_name || !payload.units.length) {
    return NextResponse.json({ message: "Nom, email et au moins une unite sont obligatoires." }, { status: 400 });
  }
  const listed = await ctx.service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let account = listed.data.users.find(item => item.email?.toLowerCase() === payload.email);
  let invited = false;
  if (!account) {
    const result = await ctx.service.auth.admin.inviteUserByEmail(payload.email, {
      data: { full_name: payload.full_name, account_type: "maximus_user" },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/auth/callback?next=/choisir-acces`,
    });
    if (result.error || !result.data.user) return NextResponse.json({ message: result.error?.message || "Invitation impossible." }, { status: 400 });
    account = result.data.user;
    invited = true;
  }
  const { data, error } = await ctx.service.from("maximus_user_access").upsert({
    user_id: account.id,
    ...payload,
    invited_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  }).select("*").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await ctx.service.from("platform_service_access").upsert({
    user_id: account.id,
    service_key: "maximus",
    roles: ["staff"],
    active: payload.active,
    granted_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,service_key" });
  if (!invited) {
    await resend("/emails", {
      from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
      to: [payload.email],
      subject: "Votre acces Maximus a ete configure",
      text: `Bonjour ${payload.full_name},\n\nVotre acces Maximus est actif pour ${payload.units.length} perimetre(s) metier. Connectez-vous avec votre compte NutVitaGlobalis.\n\n${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/connexion`,
    }).catch(() => undefined);
  }
  return NextResponse.json({ user: data, invited });
}

export async function PATCH(request: Request) {
  const ctx = await superAdmin();
  if ("error" in ctx) return ctx.error;
  const body = await request.json();
  const userId = String(body.user_id || "");
  if (!userId) return NextResponse.json({ message: "Utilisateur requis." }, { status: 400 });
  const payload = validPayload(body);
  if (!payload.full_name || !payload.units.length || !isEmail(payload.email)) return NextResponse.json({ message: "Donnees utilisateur invalides." }, { status: 400 });
  const { data, error } = await ctx.service.from("maximus_user_access").update({ ...payload, updated_at: new Date().toISOString() }).eq("user_id", userId).select("*").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await ctx.service.from("platform_service_access").upsert({
    user_id: userId,
    service_key: "maximus",
    roles: ["staff"],
    active: payload.active,
    granted_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,service_key" });
  return NextResponse.json({ user: data });
}
