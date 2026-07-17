"use client";

import { useEffect, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

type RemoteOrder = {
  id: string;
  status: string;
  currency: string;
  total: number;
  transaction_reference: string;
  created_at: string;
  order_items: Array<{ course_title: string; final_price: number }>;
};

export function OrdersList() {
  const { locale, text } = useLanguage();
  const [orders, setOrders] = useState<RemoteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void fetch("/api/orders", { cache: "no-store" })
      .then(async (response) => {
        if (response.ok) {
          const payload = (await response.json()) as { orders: RemoteOrder[] };
          setOrders(payload.orders);
        }
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="rounded-[28px] bg-white p-8 text-center text-slate-500">
        {text("Chargement des commandes…", "Loading orders…")}
      </div>
    );
  if (!orders.length)
    return (
      <div className="rounded-[28px] border border-dashed border-green-200 bg-white p-12 text-center">
        <FileCheck2 size={48} className="mx-auto text-[#0B5D3B]" />
        <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {text("Aucune commande serveur", "No server order")}
        </h2>
        <p className="mt-3 text-sm text-slate-500">
          {text(
            "Les anciennes simulations locales ne sont plus considérées comme des paiements.",
            "Previous local simulations are no longer considered payments.",
          )}
        </p>
      </div>
    );
  return (
    <div className="space-y-5">
      {orders.map((order) => (
        <article
          key={order.id}
          className="rounded-[26px] border border-green-100 bg-white p-6"
        >
          <div className="flex justify-between gap-4">
            <div>
              <p className="font-extrabold text-[#063D2E]">
                {order.transaction_reference}
              </p>
              <p className="text-sm text-slate-500">
                {new Date(order.created_at).toLocaleString(
                  locale === "fr" ? "fr-FR" : "en-US",
                )}
              </p>
            </div>
            <span
              className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${order.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}
            >
              {order.status === "paid" ? text("Payée", "Paid") : order.status}
            </span>
          </div>
          <div className="mt-5 space-y-2">
            {order.order_items.map((item) => (
              <div
                key={item.course_title}
                className="flex justify-between text-sm"
              >
                <span>{item.course_title}</span>
                <strong>
                  {Number(item.final_price).toFixed(2)} {order.currency}
                </strong>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between border-t pt-4">
            <strong>Total</strong>
            <span className="text-2xl font-extrabold text-[#0B5D3B]">
              {Number(order.total).toFixed(2)} {order.currency}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
