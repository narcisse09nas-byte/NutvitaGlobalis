import { createHmac, timingSafeEqual } from "node:crypto";
import { getFlutterwaveEnvironment, getPublicEnvironment } from "@/lib/env";

const API = "https://api.flutterwave.com/v3";

type CheckoutInput = {
  transactionReference: string;
  amount: number;
  currency: string;
  customer: { email: string; name: string; phone?: string };
};

type VerificationData = {
  id: number | string;
  tx_ref: string;
  amount: number;
  currency: string;
  status: string;
};

async function flutterwaveRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { secretKey } = getFlutterwaveEnvironment();
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const payload = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? `Flutterwave HTTP ${response.status}`);
  return payload;
}

export async function createFlutterwaveCheckout(input: CheckoutInput) {
  const { siteUrl } = getPublicEnvironment();
  const response = await flutterwaveRequest<{ status: string; data?: { link?: string } }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.transactionReference,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      redirect_url: `${siteUrl}/api/payments/flutterwave/callback`,
      customer: { email: input.customer.email, name: input.customer.name, phonenumber: input.customer.phone },
      customizations: { title: "NutVitaGlobalis Academy", description: "Inscription à une formation certifiante" },
      configurations: { session_duration: 30, max_retry_attempt: 3 },
      meta: { transaction_reference: input.transactionReference },
    }),
  });
  const link = response.data?.link;
  if (response.status !== "success" || !link) throw new Error("Flutterwave n’a pas retourné de lien de paiement.");
  return link;
}

export async function verifyFlutterwaveTransaction(transactionId: string) {
  const response = await flutterwaveRequest<{ status: string; data: VerificationData }>(`/transactions/${encodeURIComponent(transactionId)}/verify`);
  if (response.status !== "success" || !response.data) throw new Error("Transaction Flutterwave introuvable.");
  return response.data;
}

export function verifyFlutterwaveWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const { webhookSecret } = getFlutterwaveEnvironment();
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("base64");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function isVerifiedPayment(input: VerificationData, expected: { reference: string; amount: number; currency: string }) {
  return input.status === "successful"
    && input.tx_ref === expected.reference
    && input.currency.toUpperCase() === expected.currency.toUpperCase()
    && Number(input.amount) >= expected.amount;
}
