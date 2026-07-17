import { createHmac, timingSafeEqual } from "node:crypto";

const DIDIT_BASE_URL = "https://verification.didit.me/v3";

function requireDidit(
  name: "DIDIT_API_KEY" | "DIDIT_WORKFLOW_ID" | "DIDIT_WEBHOOK_SECRET",
) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variable manquante : ${name}`);
  return value;
}

export function isDiditConfigured() {
  return Boolean(
    process.env.DIDIT_API_KEY &&
    process.env.DIDIT_WORKFLOW_ID &&
    process.env.DIDIT_WEBHOOK_SECRET,
  );
}

export async function createDiditSession(input: {
  verificationId: string;
  callbackUrl: string;
  email: string;
  metadata: Record<string, string>;
}) {
  const response = await fetch(`${DIDIT_BASE_URL}/session/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": requireDidit("DIDIT_API_KEY"),
    },
    body: JSON.stringify({
      workflow_id: requireDidit("DIDIT_WORKFLOW_ID"),
      callback: input.callbackUrl,
      vendor_data: input.verificationId,
      metadata: input.metadata,
      contact_details: { email: input.email },
    }),
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    session_id?: string;
    url?: string;
    detail?: string;
  };
  if (!response.ok || !payload.session_id || !payload.url)
    throw new Error(payload.detail ?? "Didit n’a pas créé la vérification.");
  return { sessionId: payload.session_id, verificationUrl: payload.url };
}

export function verifyDiditWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
) {
  if (!signature || !timestamp || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300)
    return false;
  const expected = createHmac("sha256", requireDidit("DIDIT_WEBHOOK_SECRET"))
    .update(rawBody, "utf8")
    .digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}
