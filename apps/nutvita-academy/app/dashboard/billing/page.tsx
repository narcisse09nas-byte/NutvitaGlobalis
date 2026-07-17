import Link from "next/link";

import { BillingOverview } from "@/components/billing/BillingOverview";

export default function BillingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Facturation
      </p>

      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        Abonnement et factures
      </h1>

      <Link
        href="/dashboard/plans"
        className="mt-6 inline-flex rounded-full bg-[#F58220] px-5 py-3 font-bold text-white"
      >
        Voir les plans
      </Link>

      <div className="mt-8">
        <BillingOverview />
      </div>
    </div>
  );
}
