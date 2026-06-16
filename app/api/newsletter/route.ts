import { NextResponse } from "next/server";
import { clientIp, isEmail, isRateLimited, jsonError, resend } from "@/lib/api";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (isRateLimited(`newsletter:${clientIp(request)}`, 3)) return jsonError("Trop de tentatives. Réessayez dans une minute.", 429);
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (body?.website) return NextResponse.json({ ok: true });
  if (!isEmail(email)) return jsonError("Saisissez une adresse email valide.", 400);

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.from("newsletter_subscribers").upsert({ email, source: String(body?.source ?? "website"), active: true }, { onConflict: "email" });
    if (error) console.error("Supabase newsletter error", error);
  }

  try {
    const segmentId = process.env.RESEND_SEGMENT_ID;
    await resend("/contacts", {
      email,
      unsubscribed: false,
      ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
    });
    return NextResponse.json({ ok: true, message: "Inscription confirmée. Bienvenue !" });
  } catch (error) {
    if (error instanceof Error && error.message === "RESEND_409") {
      return NextResponse.json({ ok: true, message: "Cette adresse est déjà inscrite." });
    }
    console.error("Newsletter error", error);
    return jsonError("Impossible de finaliser l’inscription pour le moment.", 503);
  }
}
