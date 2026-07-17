"use client";

import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { MarketplaceCatalog } from "@/components/marketplace/MarketplaceCatalog";
import { useLanguage } from "@/hooks/use-language";

export default function MarketplacePage() {
  const { text } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
            Marketplace
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
            {text("Formations professionnelles", "Professional courses")}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/wishlist"
            aria-label={text("Liste de souhaits", "Wishlist")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border"
          >
            <Heart />
          </Link>
          <Link
            href="/dashboard/cart"
            className="inline-flex items-center gap-2 rounded-full bg-[#F58220] px-5 py-3 font-bold text-white"
          >
            <ShoppingCart size={18} />
            {text("Panier", "Cart")}
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <MarketplaceCatalog />
      </div>
    </div>
  );
}
