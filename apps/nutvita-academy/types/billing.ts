export type BillingPlanId =
  | "free"
  | "standard"
  | "professional"
  | "enterprise";

export type BillingCycle =
  | "monthly"
  | "annual";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  description: string;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  features: string[];
  recommended?: boolean;
};

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired";

export type LocalSubscription = {
  id: string;
  userId: string;
  planId: BillingPlanId;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  startedAt: string;
  renewsAt: string;
};

export type LocalInvoice = {
  id: string;
  userId: string;
  planId: BillingPlanId;
  amountUsd: number;
  status: "paid" | "pending" | "failed";
  issuedAt: string;
  reference: string;
};

export type BillingStoreData = {
  version: 1;
  subscriptions: LocalSubscription[];
  invoices: LocalInvoice[];
};
