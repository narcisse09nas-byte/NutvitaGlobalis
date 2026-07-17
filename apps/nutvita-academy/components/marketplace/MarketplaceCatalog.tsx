"use client";

import { useMemo, useState } from "react";
import { MarketplaceCourseCard } from "@/components/marketplace/MarketplaceCourseCard";
import { useMarketplace } from "@/hooks/use-marketplace";
import { useLanguage } from "@/hooks/use-language";

export function MarketplaceCatalog() {
  const { text } = useLanguage();
  const { courses } = useMarketplace();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const categories = Array.from(
    new Set(courses.map((course) => course.category)),
  );
  const filtered = useMemo(
    () =>
      courses.filter(
        (course) =>
          course.published &&
          (category === "all" || course.category === category) &&
          (!search ||
            `${course.title} ${course.subtitle} ${course.description}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [category, courses, search],
  );
  return (
    <div>
      <div className="grid gap-4 rounded-[24px] border border-green-100 bg-white p-5 md:grid-cols-[1fr_240px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={text(
            "Rechercher une formation…",
            "Search for a course…",
          )}
          className="h-12 rounded-2xl border border-slate-200 px-4"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-12 rounded-2xl border border-slate-200 px-4"
        >
          <option value="all">
            {text("Toutes les catégories", "All categories")}
          </option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((course) => (
          <MarketplaceCourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
