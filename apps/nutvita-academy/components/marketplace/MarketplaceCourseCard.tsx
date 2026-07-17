"use client";
import Link from "next/link";
import { Heart, ShoppingCart, Star, Users } from "lucide-react";
import { useMarketplace } from "@/hooks/use-marketplace";
import type { MarketplaceCourse } from "@/types/marketplace";
import { useLanguage } from "@/hooks/use-language";
export function MarketplaceCourseCard({
  course,
}: {
  course: MarketplaceCourse;
}) {
  const { addToCart, isInCart, isInWishlist, toggleWishlist } =
    useMarketplace();
  const { text } = useLanguage();
  const inCart = isInCart(course.slug),
    favorite = isInWishlist(course.slug);
  return (
    <article className="flex h-full flex-col justify-between rounded-[28px] border border-green-100 bg-white p-6">
      <div>
        <div className="flex justify-between">
          <span className="rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
            {course.code}
          </span>
          <button
            aria-label={text("Ajouter aux favoris", "Add to wishlist")}
            onClick={() => toggleWishlist(course.slug)}
            className="text-red-500"
          >
            <Heart size={20} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
        <h2 className="mt-5 text-xl font-extrabold text-[#063D2E]">
          {course.title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{course.subtitle}</p>
        <p className="mt-4 text-sm font-semibold text-[#0B5D3B]">
          {course.instructorName}
        </p>
        <div className="mt-4 flex gap-4 text-sm text-slate-500">
          <span className="inline-flex gap-1">
            <Star size={16} fill="currentColor" className="text-[#F58220]" />
            {course.rating}
          </span>
          <span className="inline-flex gap-1">
            <Users size={16} />
            {course.studentCount}
          </span>
        </div>
        <p className="mt-5 text-3xl font-extrabold text-[#063D2E]">
          ${course.priceUsd}
        </p>
      </div>
      <div className="mt-7 space-y-3">
        <Link
          href={`/dashboard/marketplace/${course.slug}`}
          className="block rounded-full border border-[#0B5D3B] px-5 py-3 text-center text-sm font-bold text-[#0B5D3B]"
        >
          {text("Voir la formation", "View course")}
        </Link>
        <button
          disabled={inCart}
          onClick={() => addToCart(course.slug)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F58220] px-5 py-3 text-sm font-bold text-white disabled:bg-green-600"
        >
          <ShoppingCart size={18} />
          {inCart
            ? text("Déjà dans le panier", "Already in cart")
            : text("Ajouter au panier", "Add to cart")}
        </button>
      </div>
    </article>
  );
}
