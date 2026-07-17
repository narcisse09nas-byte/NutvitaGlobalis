import { NextResponse } from "next/server";
import { getPlatformIdentity, validateAccessChoice } from "@/lib/platform-access";

const destinations: Record<string, string> = {
  student: "/academy/dashboard",
  instructor: "/academy/dashboard/instructor",
  admin: "/academy/dashboard/admin",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role") || "student";
  const identity = await getPlatformIdentity();
  if (!identity?.supabase) return NextResponse.redirect(new URL("/connexion?redirect=/choisir-acces", url.origin));
  if (!destinations[role] || !(await validateAccessChoice("academy", role))) {
    return NextResponse.redirect(new URL("/choisir-acces?erreur=academy_non_autorise", url.origin));
  }

  const { data: { session } } = await identity.supabase.auth.getSession();
  if (!session) return NextResponse.redirect(new URL("/connexion?redirect=/choisir-acces", url.origin));

  const target = new URL("/academy/auth/platform", url.origin);
  target.hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    role,
    next: destinations[role],
  }).toString();
  return NextResponse.redirect(target, { headers: { "Cache-Control": "no-store" } });
}
