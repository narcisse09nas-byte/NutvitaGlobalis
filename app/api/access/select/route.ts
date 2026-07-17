import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformIdentity, validateAccessChoice } from "@/lib/platform-access";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const service = String(body.service || ""), role = String(body.role || "");
  const identity = await getPlatformIdentity();
  if (!identity) return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  const destination = await validateAccessChoice(service, role);
  if (!destination) return NextResponse.json({ message: "Ce service ou ce rôle ne vous est pas autorisé." }, { status: 403 });
  const response = NextResponse.json({ ok: true, href: destination.href });
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 12 };
  response.cookies.set("nutvita_active_service", service, options);
  response.cookies.set("nutvita_active_role", role, options);
  if (identity.supabase) {
    await createAdminClient().from("platform_session_selections").insert({ user_id: identity.user.id, service_key: service, role_key: role, selected_at: new Date().toISOString(), user_agent: request.headers.get("user-agent") });
  }
  return response;
}
