import type {
  BillingCycle,
  BillingPlanId,
  BillingStoreData,
  LocalInvoice,
  LocalSubscription,
} from "@/types/billing";

const KEY = "nutvita-billing-store";

function browser() {
  return typeof window !== "undefined";
}

export function emptyBillingStore(): BillingStoreData {
  return {
    version: 1,
    subscriptions: [],
    invoices: [],
  };
}

export function loadBillingStore(): BillingStoreData {
  if (!browser()) return emptyBillingStore();

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyBillingStore();

    const parsed = JSON.parse(raw) as BillingStoreData;

    return {
      version: 1,
      subscriptions: parsed.subscriptions ?? [],
      invoices: parsed.invoices ?? [],
    };
  } catch {
    return emptyBillingStore();
  }
}

export function saveBillingStore(data: BillingStoreData) {
  if (!browser()) return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function createLocalSubscription(input: {
  userId: string;
  planId: BillingPlanId;
  cycle: BillingCycle;
}): LocalSubscription {
  const start = new Date();
  const renewal = new Date(start);

  if (input.cycle === "monthly") {
    renewal.setMonth(renewal.getMonth() + 1);
  } else {
    renewal.setFullYear(renewal.getFullYear() + 1);
  }

  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `subscription-${Date.now()}`,
    ...input,
    status: "active",
    startedAt: start.toISOString(),
    renewsAt: renewal.toISOString(),
  };
}

export function createLocalInvoice(input: {
  userId: string;
  planId: BillingPlanId;
  amountUsd: number;
}): LocalInvoice {
  const now = new Date();

  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `invoice-${Date.now()}`,
    ...input,
    status: "paid",
    issuedAt: now.toISOString(),
    reference: `NVG-${now.getFullYear()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`,
  };
}
