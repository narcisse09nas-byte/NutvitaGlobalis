import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getPublicEnvironment, isSupabaseConfigured } from "@/lib/env";
import { createDiditSession, isDiditConfigured } from "@/lib/proctoring/didit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiText } from "@/lib/api-i18n";

const schema = z.object({
  bookingReference: z
    .string()
    .min(3)
    .max(180)
    .regex(/^[a-zA-Z0-9_-]+$/),
  documentType: z.enum(["passport", "national_id"]).optional(),
  issuingCountry: z.string().trim().min(2).max(100).optional(),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  if (
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !isDiditConfigured()
  ) {
    return Response.json(
      { error: apiText(request, "Didit ou Supabase n’est pas encore configuré.", "Didit or Supabase is not configured yet.") },
      { status: 503 },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: apiText(request, "Demande de vérification invalide.", "Invalid verification request.") },
      { status: 400 },
    );

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return Response.json(
      { error: "Authentification requise." },
      { status: 401 },
    );

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, legal_name, date_of_birth, nationality, country")
    .eq("id", auth.user.id)
    .single();
  if (
    !profile?.legal_name ||
    !profile.date_of_birth ||
    !profile.nationality ||
    !profile.country
  ) {
    return Response.json(
      {
        error: apiText(request, "Complétez d’abord votre identité certifiante dans Mon profil.", "Complete your certification identity in My profile first."),
      },
      { status: 409 },
    );
  }

  const { data: existing } = await admin
    .from("identity_verifications")
    .select("id, status")
    .eq("booking_reference", parsed.data.bookingReference)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (existing?.status === "verified")
    return Response.json(
      { error: apiText(request, "Votre identité est déjà vérifiée.", "Your identity is already verified.") },
      { status: 409 },
    );
  const verificationId = existing?.id ?? randomUUID();
  const environment = getPublicEnvironment();
  const session = await createDiditSession({
    verificationId,
    callbackUrl: `${environment.siteUrl}/dashboard/exams/proctoring/${parsed.data.bookingReference}`,
    email: profile.email,
    metadata: {
      booking_reference: parsed.data.bookingReference,
      candidate_id: auth.user.id,
    },
  });

  const { error } = await admin.from("identity_verifications").upsert(
    {
      id: verificationId,
      booking_reference: parsed.data.bookingReference,
      user_id: auth.user.id,
      document_type: parsed.data.documentType ?? null,
      issuing_country: parsed.data.issuingCountry ?? profile.country,
      provider: "didit",
      provider_reference: session.sessionId,
      status: "pending_provider",
      consented_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "booking_reference,user_id" },
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    verificationId,
    verificationUrl: session.verificationUrl,
  });
}
