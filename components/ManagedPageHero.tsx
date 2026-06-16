"use client";
import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import type { SitePageContent } from "@/data/site-pages";

export default function ManagedPageHero({ initial }: { initial: SitePageContent }) {
  const [page, setPage] = useState(initial);
  useEffect(() => {
    try {
      const rows = JSON.parse(localStorage.getItem("nutvita-local-site_pages") || "[]");
      const saved = rows.find((row: SitePageContent) => row.page_key === initial.page_key);
      if (saved) setPage({ ...initial, ...saved });
    } catch {}
  }, [initial]);
  return <PageHero eyebrow={page.eyebrow} title={page.title} text={page.description}/>;
}
