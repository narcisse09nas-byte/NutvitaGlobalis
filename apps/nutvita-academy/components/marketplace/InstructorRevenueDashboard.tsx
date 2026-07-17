"use client";
import { DollarSign, Percent, ReceiptText, WalletCards } from "lucide-react";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useMarketplace } from "@/hooks/use-marketplace";
import { calculateInstructorPayout } from "@/lib/marketplace-engine";
export function InstructorRevenueDashboard() {
  const { user } = useLocalAuth();
  const { data } = useMarketplace();
  if (!user) return null;
  const p = calculateInstructorPayout(user.id, data.orders);
  const cards = [
    { l: "Revenu brut", v: `$${p.grossRevenueUsd}`, i: DollarSign },
    { l: "Commission plateforme", v: `$${p.commissionUsd}`, i: Percent },
    { l: "Revenu net", v: `$${p.netRevenueUsd}`, i: WalletCards },
    { l: "Ventes", v: p.orderCount, i: ReceiptText },
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const I = c.i;
        return (
          <article
            key={c.l}
            className="rounded-[24px] border border-green-100 bg-white p-6"
          >
            <I className="text-[#0B5D3B]" />
            <p className="mt-4 text-3xl font-extrabold text-[#063D2E]">{c.v}</p>
            <p className="text-sm text-slate-500">{c.l}</p>
          </article>
        );
      })}
    </div>
  );
}
