import { NextResponse } from "next/server";
import { clientIp, isEmail, isRateLimited, jsonError, resend } from "@/lib/api";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (isRateLimited(`newsletter:${clientIp(request)}`, 3)) {
    return jsonError("Trop de tentatives. Reessayez dans une minute.", 429);
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (body?.website) return NextResponse.json({ ok: true });
  if (!isEmail(email)) return jsonError("Saisissez une adresse email valide.", 400);

  let storedInSupabase = false;
  let alreadySubscribed = false;

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const source = String(body?.source ?? "website").slice(0, 80);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email, source, active: true });

    if (!error) storedInSupabase = true;
    else if (error.code === "23505") alreadySubscribed = true;
    else console.error("Supabase newsletter error", error);
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const segmentId = process.env.RESEND_SEGMENT_ID;
      await resend("/contacts", {
        email,
        unsubscribed: false,
        ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
      });
      return NextResponse.json({
        ok: true,
        message: alreadySubscribed
          ? "Cette adresse est deja inscrite."
          : "Inscription confirmee. Bienvenue !",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "RESEND_409") {
        return NextResponse.json({ ok: true, message: "Cette adresse est deja inscrite." });
      }
      console.error("Resend newsletter error", error);
    }
  }

  if (storedInSupabase) {
    return NextResponse.json({ ok: true, message: "Inscription confirmee. Bienvenue !" });
  }
  if (alreadySubscribed) {
    return NextResponse.json({ ok: true, message: "Cette adresse est deja inscrite." });
  }

  return jsonError("Impossible de finaliser l'inscription pour le moment.", 503);
}
