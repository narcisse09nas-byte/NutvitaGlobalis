"use client";

import {
  CreditCard,
  FileText,
} from "lucide-react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useBilling } from "@/hooks/use-billing";
import { useLanguage } from "@/hooks/use-language";
import { billingPlans } from "@/data/billing-plans";

export function BillingOverview() {
  const { locale, text } = useLanguage();
  const { user } = useLocalAuth();
  const {
    data,
    cancelCurrentSubscription,
  } = useBilling();

  if (!user) return null;

  const subscription =
    data.subscriptions.find(
      (item) =>
        item.userId === user.id &&
        item.status === "active"
    ) ?? null;

  const plan = subscription
    ? billingPlans.find(
        (item) =>
          item.id ===
          subscription.planId
      )
    : null;

  const invoices =
    data.invoices.filter(
      (item) =>
        item.userId === user.id
    );

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-green-100 bg-white p-7">
        <CreditCard className="text-[#0B5D3B]" />

        <h2 className="mt-4 text-2xl font-extrabold text-[#063D2E]">
          {text("Abonnement actuel", "Current subscription")}
        </h2>

        {subscription && plan ? (
          <>
            <p className="mt-4 text-3xl font-extrabold text-[#F58220]">
              {plan.name}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {text("Renouvellement prévu le", "Renewal scheduled for")} {" "}
              {new Date(
                subscription.renewsAt
              ).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}
            </p>

            <button
              type="button"
              onClick={
                cancelCurrentSubscription
              }
              className="mt-6 rounded-full border border-red-200 px-5 py-3 font-bold text-red-600"
            >
              {text("Annuler l’abonnement local", "Cancel local subscription")}
            </button>
          </>
        ) : (
          <p className="mt-4 text-slate-600">
            {text("Aucun abonnement actif.", "No active subscription.")}
          </p>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3">
          <FileText className="text-[#0B5D3B]" />
          <h2 className="text-2xl font-extrabold text-[#063D2E]">
            {text("Factures", "Invoices")}
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {invoices.map((invoice) => (
            <article
              key={invoice.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-green-100 bg-white p-5"
            >
              <div>
                <p className="font-extrabold text-[#063D2E]">
                  {invoice.reference}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(
                    invoice.issuedAt
                  ).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                </p>
              </div>

              <div className="text-right">
                <p className="font-extrabold text-[#0B5D3B]">
                  ${invoice.amountUsd}
                </p>
                <p className="text-xs font-bold text-green-700">
                  {text("Payée", "Paid")}
                </p>
              </div>
            </article>
          ))}

          {invoices.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-green-200 bg-white p-8 text-center text-slate-500">
              {text("Aucune facture.", "No invoices.")}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
