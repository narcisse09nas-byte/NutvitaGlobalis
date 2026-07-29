import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPlatformIdentity, validateAccessChoice } from "@/lib/platform-access";

export async function GET() {
  const store = await cookies();
  const service = store.get("nutvita_active_service")?.value;
  const role = store.get("nutvita_active_role")?.value;
  if (service !== "project_management" || !role || !["client", "admin"].includes(role)) {
    return NextResponse.json({ message: "Accès P3M non sélectionné." }, { status: 403 });
  }

  const identity = await getPlatformIdentity();
  if (!identity?.user.email) {
    return NextResponse.json({ message: "Authentification NutVitaGlobalis requise." }, { status: 401 });
  }
  const allowed = await validateAccessChoice(service, role);
  if (!allowed) {
    return NextResponse.json({ message: "Votre compte ne dispose pas de cet accès." }, { status: 403 });
  }

  return NextResponse.json({
    email: identity.user.email,
    role: role === "admin" ? "Admin" : "Editor",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
