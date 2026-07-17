"use client";
import {
  Heart,
  ShoppingCart,
  Star,
  Users,
  Clock3,
  BookOpen,
} from "lucide-react";
import { useMarketplace } from "@/hooks/use-marketplace";
import type { MarketplaceCourse } from "@/types/marketplace";
import { useLanguage } from "@/hooks/use-language";
export function MarketplaceCourseDetail({
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
    <div className="space-y-8">
      <section className="rounded-[30px] bg-[#063D2E] p-8 text-white">
        <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
          {course.code}
        </span>
        <h1 className="mt-6 text-4xl font-extrabold md:text-5xl">
          {course.title}
        </h1>
        <p className="mt-4 text-green-50/85">{course.subtitle}</p>
        <div className="mt-6 flex flex-wrap gap-5 text-sm">
          <span className="inline-flex gap-2">
            <Star size={18} fill="currentColor" className="text-[#F58220]" />
            {course.rating}
          </span>
          <span className="inline-flex gap-2">
            <Users size={18} />
            {course.studentCount}
          </span>
          <span className="inline-flex gap-2">
            <Clock3 size={18} />
            {course.durationHours} h
          </span>
          <span className="inline-flex gap-2">
            <BookOpen size={18} />
            {course.lessonsCount} {text("leçons", "lessons")}
          </span>
        </div>
        <p className="mt-7 max-w-4xl leading-7 text-green-50/80">
          {course.description}
        </p>
      </section>
      <section className="grid gap-7 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[28px] border border-green-100 bg-white p-7">
          <h2 className="text-2xl font-extrabold text-[#063D2E]">
            {text("Ce que vous apprendrez", "What you will learn")}
          </h2>
          <ul className="mt-5 space-y-3 text-slate-600">
            <li>• {text("Concepts fondamentaux", "Core concepts")}</li>
            <li>
              •{" "}
              {text(
                "Outils et procédures pratiques",
                "Practical tools and procedures",
              )}
            </li>
            <li>• {text("Études de cas", "Case studies")}</li>
            <li>
              •{" "}
              {text("Quiz, examen et certificat", "Quiz, exam and certificate")}
            </li>
          </ul>
        </div>
        <aside className="rounded-[28px] border border-green-100 bg-white p-7">
          <p className="text-4xl font-extrabold text-[#063D2E]">
            ${course.priceUsd}
          </p>
          <button
            disabled={inCart}
            onClick={() => addToCart(course.slug)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white disabled:bg-green-600"
          >
            <ShoppingCart size={19} />
            {inCart
              ? text("Déjà dans le panier", "Already in cart")
              : text("Ajouter au panier", "Add to cart")}
          </button>
          <button
            onClick={() => toggleWishlist(course.slug)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#0B5D3B] px-6 py-3 font-bold text-[#0B5D3B]"
          >
            <Heart size={19} fill={favorite ? "currentColor" : "none"} />
            {favorite
              ? text("Retirer des favoris", "Remove from wishlist")
              : text("Ajouter aux favoris", "Add to wishlist")}
          </button>
        </aside>
      </section>
    </div>
  );
}
