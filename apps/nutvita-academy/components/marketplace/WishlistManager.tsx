"use client";
import { Heart } from "lucide-react";
import { useMarketplace } from "@/hooks/use-marketplace";
import { MarketplaceCourseCard } from "@/components/marketplace/MarketplaceCourseCard";
import { useLanguage } from "@/hooks/use-language";
export function WishlistManager() {
  const { wishlistCourses } = useMarketplace();
  const { text } = useLanguage();
  if (!wishlistCourses.length)
    return (
      <div className="rounded-[28px] border border-dashed border-green-200 bg-white p-12 text-center">
        <Heart size={48} className="mx-auto text-[#0B5D3B]" />
        <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {text("Aucun favori", "No wishlist items")}
        </h2>
      </div>
    );
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {wishlistCourses.map((c) => (
        <MarketplaceCourseCard key={c.id} course={c} />
      ))}
    </div>
  );
}
