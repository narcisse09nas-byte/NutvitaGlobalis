"use client";

import {
  useState,
} from "react";

import { Check } from "lucide-react";

import { billingPlans } from "@/data/billing-plans";
import { useBilling } from "@/hooks/use-billing";
import { useLanguage } from "@/hooks/use-language";

import type {
  BillingCycle,
} from "@/types/billing";

export function PricingGrid() {
  const { text } = useLanguage();
  const { subscribe } =
    useBilling();

  const [cycle, setCycle] =
    useState<BillingCycle>(
      "monthly"
    );

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
          {(["monthly", "annual"] as const).map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setCycle(item)
                }
                className={`rounded-full px-5 py-2 text-sm font-bold ${
                  cycle === item
                    ? "bg-[#0B5D3B] text-white"
                    : "text-slate-600"
                }`}
              >
                {item === "monthly"
                  ? text("Mensuel", "Monthly")
                  : text("Annuel", "Annual")}
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {billingPlans.map((plan) => {
          const price =
            cycle === "monthly"
              ? plan.monthlyPriceUsd
              : plan.annualPriceUsd;

          return (
            <article
              key={plan.id}
              className={`rounded-[28px] border bg-white p-6 ${
                plan.recommended
                  ? "border-[#F58220] shadow-lg"
                  : "border-green-100"
              }`}
            >
              {plan.recommended && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                  {text("Recommandé", "Recommended")}
                </span>
              )}

              <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
                {plan.name}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {plan.description}
              </p>

              <p className="mt-6 text-4xl font-extrabold text-[#063D2E]">
                ${price}
              </p>

              <p className="text-xs text-slate-500">
                {cycle === "monthly"
                  ? text("par mois", "per month")
                  : text("par an", "per year")}
              </p>

              <div className="mt-6 space-y-3">
                {plan.features.map(
                  (feature) => (
                    <p
                      key={feature}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <Check
                        size={17}
                        className="mt-0.5 shrink-0 text-[#0B5D3B]"
                      />
                      {feature}
                    </p>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  subscribe(plan.id, cycle)
                }
                className="mt-7 w-full rounded-full bg-[#F58220] px-5 py-3 font-bold text-white"
              >
                {text("Choisir ce plan", "Choose this plan")}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
