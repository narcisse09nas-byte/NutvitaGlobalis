"use client";
import type { NotifyPpmEventInput } from "@/lib/ppm/notifications";

// Refinement program, Wave 4: the client-side counterpart to notifyPpmEvent() — POSTs to
// app/api/ppm/notify (server-side) instead of calling notifyPpmEvent directly, since its email
// leg needs process.env.RESEND_API_KEY, a server-only secret unavailable in the browser bundle.
export async function notifyPpmEventClient(input: NotifyPpmEventInput) {
  try {
    await fetch("/api/ppm/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  } catch {
    // Best-effort: a failed notification should never block the workflow action that triggered it.
  }
}
