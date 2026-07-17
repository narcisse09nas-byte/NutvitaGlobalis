"use client";

import { useState } from "react";
import { ShoppingBag, Trash2 } from "lucide-react";
import { useMarketplace } from "@/hooks/use-marketplace";
import { useLanguage } from "@/hooks/use-language";

export function CartManager() {
  const { text } = useLanguage();
  const { cartCourses, cartTotalUsd, removeFromCart, checkout } =
    useMarketplace();
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  if (!cartCourses.length)
    return (
      <div className="rounded-[28px] border border-dashed border-green-200 bg-white p-12 text-center">
        <ShoppingBag size={48} className="mx-auto text-[#0B5D3E]" />
        <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {text("Votre panier est vide", "Your cart is empty")}
        </h2>
      </div>
    );
  async function pay() {
    setError("");
    setIsPaying(true);
    const result = await checkout(coupon);
    if (!result.checkoutUrl) {
      setError(result.error ?? text("Erreur de paiement", "Payment error"));
      setIsPaying(false);
      return;
    }
    window.location.assign(result.checkoutUrl);
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {cartCourses.map((course) => (
          <article
            key={course.id}
            className="flex justify-between rounded-[24px] border border-green-100 bg-white p-6"
          >
            <div>
              <p className="text-xs font-bold text-[#F58220]">{course.code}</p>
              <h2 className="mt-2 font-extrabold text-[#063D2E]">
                {course.title}
              </h2>
              <p className="mt-2 text-xl font-extrabold text-[#0B5D3B]">
                ${course.priceUsd}
              </p>
            </div>
            <button
              onClick={() => removeFromCart(course.slug)}
              aria-label={`${text("Retirer", "Remove")} ${course.title}`}
              className="text-red-600"
            >
              <Trash2 />
            </button>
          </article>
        ))}
      </div>
      <aside className="rounded-[28px] border border-green-100 bg-white p-7">
        <h2 className="text-2xl font-extrabold text-[#063D2E]">
          {text("Résumé", "Summary")}
        </h2>
        <div className="mt-6 flex justify-between">
          <span>{text("Sous-total", "Subtotal")}</span>
          <strong>${cartTotalUsd}</strong>
        </div>
        <input
          value={coupon}
          onChange={(event) => setCoupon(event.target.value)}
          placeholder={text("Code promo", "Promo code")}
          className="mt-6 h-12 w-full rounded-2xl border border-slate-200 px-4 uppercase"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-xs leading-5 text-slate-500">
          {text(
            "Paiement sécurisé hébergé par Flutterwave. Votre inscription est créée uniquement après confirmation serveur.",
            "Secure payment hosted by Flutterwave. Your enrollment is created only after server confirmation.",
          )}
        </p>
        <button
          disabled={isPaying}
          onClick={pay}
          className="mt-6 w-full rounded-full bg-[#F58220] px-6 py-3 font-bold text-white disabled:bg-slate-300"
        >
          {isPaying
            ? text("Redirection sécurisée…", "Secure redirect…")
            : text("Payer avec Flutterwave", "Pay with Flutterwave")}
        </button>
      </aside>
    </div>
  );
}
