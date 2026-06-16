import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = normalizeLocale(body.locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await Promise.allSettled([
      supabase.from("client_profiles").update({ preferred_language: locale }).eq("id", user.id),
      supabase.from("admin_users").update({ preferred_language: locale }).eq("id", user.id),
      supabase.from("recruitment_applications").update({ preferred_language: locale }).eq("candidate_id", user.id),
      supabase.from("dietitian_profiles").update({ preferred_language: locale }).eq("user_id", user.id),
    ]);
  }

  const response = NextResponse.json({ locale });
  response.cookies.set("nutvita_locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}
