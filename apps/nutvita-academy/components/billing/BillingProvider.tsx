"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { billingPlans } from "@/data/billing-plans";

import {
  createLocalInvoice,
  createLocalSubscription,
  emptyBillingStore,
  loadBillingStore,
  saveBillingStore,
} from "@/lib/billing-storage";

import type {
  BillingCycle,
  BillingPlanId,
  BillingStoreData,
} from "@/types/billing";

type BillingContextValue = {
  data: BillingStoreData;
  subscribe: (
    planId: BillingPlanId,
    cycle: BillingCycle
  ) => void;
  cancelCurrentSubscription: () => void;
};

export const BillingContext =
  createContext<BillingContextValue | null>(
    null
  );

export function BillingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useLocalAuth();

  const [data, setData] =
    useState<BillingStoreData>(
      emptyBillingStore()
    );

  useEffect(() => {
    // localStorage is only available after client hydration.
    setData(loadBillingStore());
  }, []);

  const persist = useCallback(
    (
      updater: (
        current: BillingStoreData
      ) => BillingStoreData
    ) => {
      setData((current) => {
        const updated = updater(current);
        saveBillingStore(updated);
        return updated;
      });
    },
    []
  );

  const subscribe = useCallback(
    (
      planId: BillingPlanId,
      cycle: BillingCycle
    ) => {
      if (!user) return;

      const plan = billingPlans.find(
        (item) => item.id === planId
      );

      if (!plan) return;

      const amount =
        cycle === "monthly"
          ? plan.monthlyPriceUsd
          : plan.annualPriceUsd;

      const subscription =
        createLocalSubscription({
          userId: user.id,
          planId,
          cycle,
        });

      const invoice = createLocalInvoice({
        userId: user.id,
        planId,
        amountUsd: amount,
      });

      persist((current) => ({
        ...current,
        subscriptions: [
          subscription,
          ...current.subscriptions.map(
            (item) =>
              item.userId === user.id &&
              item.status === "active"
                ? {
                    ...item,
                    status: "cancelled" as const,
                  }
                : item
          ),
        ],
        invoices: [
          invoice,
          ...current.invoices,
        ],
      }));
    },
    [persist, user]
  );

  const cancelCurrentSubscription =
    useCallback(() => {
      if (!user) return;

      persist((current) => ({
        ...current,
        subscriptions:
          current.subscriptions.map(
            (item) =>
              item.userId === user.id &&
              item.status === "active"
                ? {
                    ...item,
                    status: "cancelled" as const,
                  }
                : item
          ),
      }));
    }, [persist, user]);

  const value = useMemo(
    () => ({
      data,
      subscribe,
      cancelCurrentSubscription,
    }),
    [
      data,
      subscribe,
      cancelCurrentSubscription,
    ]
  );

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}
