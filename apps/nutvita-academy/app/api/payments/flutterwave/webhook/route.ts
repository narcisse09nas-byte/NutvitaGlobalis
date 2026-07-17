import { verifyFlutterwaveWebhookSignature } from "@/lib/payments/flutterwave";
import { verifyAndFinalizeFlutterwaveOrder } from "@/lib/payments/finalize-order";
import { isFlutterwaveConfigured, isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";

export async function POST(request: Request) {
  if (!isFlutterwaveConfigured() || !isSupabaseConfigured()) return Response.json({ error: apiText(request, "Paiement serveur non configuré.", "Server payment is not configured.") }, { status: 503 });
  const rawBody = await request.text();
  if (!verifyFlutterwaveWebhookSignature(rawBody, request.headers.get("flutterwave-signature"))) return new Response("Invalid signature", { status: 401 });
  const payload = JSON.parse(rawBody) as { type?: string; event?: string; data?: { id?: string | number; tx_ref?: string; status?: string } };
  const eventType = payload.type ?? payload.event;
  if (eventType !== "charge.completed" || !payload.data?.id || !payload.data.tx_ref) return Response.json({ received: true });
  try {
    await verifyAndFinalizeFlutterwaveOrder(String(payload.data.id), payload.data.tx_ref);
    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Finalisation impossible." }, { status: 409 });
  }
}
