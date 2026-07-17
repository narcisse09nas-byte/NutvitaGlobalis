import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccessChoices, getPlatformIdentity } from "@/lib/platform-access";

export async function GET(request: Request) {
  const identity = await getPlatformIdentity();
  if (!identity) return NextResponse.redirect(new URL("/connexion", request.url));

  const access = await getAccessChoices();
  if (access.choices.length !== 1) return NextResponse.redirect(new URL("/choisir-acces", request.url));

  const choice = access.choices[0];
  const response = NextResponse.redirect(new URL(choice.href, request.url));
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 12 };
  response.cookies.set("nutvita_active_service", choice.service, options);
  response.cookies.set("nutvita_active_role", choice.role, options);

  if (identity.supabase) {
    await createAdminClient().from("platform_session_selections").insert({
      user_id: identity.user.id,
      service_key: choice.service,
      role_key: choice.role,
      selected_at: new Date().toISOString(),
      user_agent: request.headers.get("user-agent"),
    });
  }
  return response;
}
