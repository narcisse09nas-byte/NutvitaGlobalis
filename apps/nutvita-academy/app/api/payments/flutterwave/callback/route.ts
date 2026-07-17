import { NextResponse } from "next/server";
import { isFlutterwaveConfigured, isSupabaseConfigured } from "@/lib/env";
import { verifyAndFinalizeFlutterwaveOrder } from "@/lib/payments/finalize-order";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3010";
  if (!isFlutterwaveConfigured() || !isSupabaseConfigured()) return NextResponse.redirect(`${siteUrl}/dashboard/orders?payment=not-configured`);
  const status = url.searchParams.get("status");
  const transactionId = url.searchParams.get("transaction_id");
  const reference = url.searchParams.get("tx_ref");
  if (status !== "successful" || !transactionId || !reference) return NextResponse.redirect(`${siteUrl}/dashboard/orders?payment=failed`);
  try {
    await verifyAndFinalizeFlutterwaveOrder(transactionId, reference);
    return NextResponse.redirect(`${siteUrl}/dashboard/orders?payment=success`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/dashboard/orders?payment=verification-failed`);
  }
}
