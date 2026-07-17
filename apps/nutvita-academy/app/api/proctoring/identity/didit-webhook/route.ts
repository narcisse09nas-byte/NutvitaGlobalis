import { z } from "zod";
import { evaluateIdentitySignals } from "@/lib/proctoring/identity-engine";
import { verifyDiditWebhook } from "@/lib/proctoring/didit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiText } from "@/lib/api-i18n";

const featureSchema = z
  .object({
    status: z.string(),
    score: z.number().optional(),
    warnings: z.array(z.unknown()).optional(),
  })
  .passthrough();
const payloadSchema = z
  .object({
    event_id: z.string(),
    webhook_type: z.string(),
    session_id: z.string(),
    status: z.string(),
    vendor_data: z.string().uuid().optional(),
    decision: z
      .object({
        id_verifications: z
          .array(
            featureSchema.extend({
              first_name: z.string().optional(),
              last_name: z.string().optional(),
              date_of_birth: z.string().optional(),
              expiration_date: z.string().optional(),
            }),
          )
          .optional(),
        liveness_checks: z.array(featureSchema).optional(),
        face_matches: z.array(featureSchema).optional(),
      })
      .optional(),
  })
  .passthrough();

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "JSON invalide." }, { status: 400 });
  }
  try {
    if (
      !verifyDiditWebhook(
        rawBody,
        request.headers.get("x-signature"),
        request.headers.get("x-timestamp"),
      )
    ) {
      return Response.json(
        { error: "Signature Didit invalide." },
        { status: 401 },
      );
    }
  } catch {
    return Response.json(
      { error: apiText(request, "Didit n’est pas configuré.", "Didit is not configured.") },
      { status: 503 },
    );
  }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: apiText(request, "Événement Didit invalide.", "Invalid Didit event.") },
      { status: 400 },
    );
  if (
    !parsed.data.vendor_data ||
    !["Approved", "Declined", "In Review"].includes(parsed.data.status)
  )
    return Response.json({ received: true });

  const admin = createSupabaseAdminClient();
  const { data: verification } = await admin
    .from("identity_verifications")
    .select("id, user_id, booking_reference")
    .eq("id", parsed.data.vendor_data)
    .eq("provider_reference", parsed.data.session_id)
    .single();
  if (!verification)
    return Response.json({ error: apiText(request, "Vérification inconnue.", "Unknown verification.") }, { status: 404 });
  const [{ data: profile }, { data: settings }] = await Promise.all([
    admin
      .from("profiles")
      .select("legal_name, date_of_birth")
      .eq("id", verification.user_id)
      .single(),
    admin
      .from("proctoring_settings")
      .select("identity_threshold, auto_admit_when_verified")
      .eq("id", true)
      .single(),
  ]);
  const document = parsed.data.decision?.id_verifications?.[0];
  const liveness = parsed.data.decision?.liveness_checks?.[0];
  const face = parsed.data.decision?.face_matches?.[0];
  const documentName =
    `${document?.first_name ?? ""} ${document?.last_name ?? ""}`.trim();
  const profileMatched = Boolean(
    profile?.legal_name &&
    documentName &&
    normalized(profile.legal_name) === normalized(documentName) &&
    profile.date_of_birth === document?.date_of_birth,
  );
  const documentValid =
    document?.status === "Approved" &&
    (!document.expiration_date ||
      new Date(document.expiration_date) >= new Date());
  const assessment = evaluateIdentitySignals({
    provider: "didit",
    providerReady: true,
    threshold: Number(settings?.identity_threshold ?? 85),
    signals: {
      documentAuthenticity: document?.status === "Approved" ? 100 : 0,
      documentQuality: document?.warnings?.length ? 70 : 100,
      faceMatch: face?.score ?? (face?.status === "Approved" ? 100 : 0),
      liveness: liveness?.score ?? (liveness?.status === "Approved" ? 100 : 0),
      profileDataMatched: profileMatched,
      documentValid,
    },
  });
  const status =
    parsed.data.status === "Approved" &&
    assessment.decision === "auto_verified" &&
    settings?.auto_admit_when_verified
      ? "verified"
      : "manual_review";
  await admin
    .from("identity_verifications")
    .update({
      status,
      document_authenticity_score: assessment.signals.documentAuthenticity,
      document_quality_score: assessment.signals.documentQuality,
      face_match_score: assessment.signals.faceMatch,
      liveness_score: assessment.signals.liveness,
      profile_data_matched: assessment.signals.profileDataMatched,
      document_valid: assessment.signals.documentValid,
      identity_score: assessment.score,
      decision_reasons: assessment.reasons,
      assessed_at: assessment.assessedAt,
    })
    .eq("id", verification.id);
  await admin.from("audit_logs").insert({
    actor_user_id: verification.user_id,
    action: "identity.didit_assessed",
    entity_type: "identity_verification",
    entity_id: verification.id,
    metadata: {
      event_id: parsed.data.event_id,
      session_id: parsed.data.session_id,
      provider_status: parsed.data.status,
      decision: assessment.decision,
      score: assessment.score,
    },
  });
  return Response.json({ received: true });
}
