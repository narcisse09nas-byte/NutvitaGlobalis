import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyPpmEvent, type NotifyPpmEventInput } from "@/lib/ppm/notifications";

// Refinement program, Wave 1/4: notifyPpmEvent() sends real email via sendSystemEmail -> resend(),
// which reads process.env.RESEND_API_KEY — a server-only secret that is undefined in any browser
// bundle. Client ("use client") components must POST here instead of importing notifyPpmEvent
// directly, so the email leg of every workflow notification actually runs server-side.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => null) as NotifyPpmEventInput | null;
  if (!body?.recipient || !body.titleFr || !body.titleEn) return NextResponse.json({ message: "Requete invalide." }, { status: 400 });

  await notifyPpmEvent(supabase, body);
  return NextResponse.json({ ok: true });
}
