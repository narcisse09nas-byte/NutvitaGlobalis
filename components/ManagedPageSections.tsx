"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import type { SitePageContent } from "@/data/site-pages";

export default function ManagedPageSections({ initial }: { initial: SitePageContent }) {
  const [page, setPage] = useState(initial);
  useEffect(() => {
    try {
      const rows = JSON.parse(localStorage.getItem("nutvita-local-site_pages") || "[]");
      const saved = rows.find((row: SitePageContent) => row.page_key === initial.page_key);
      if (saved) setPage({ ...initial, ...saved });
    } catch {}
  }, [initial]);
  if (!page.sections?.length && !page.cta_label) return null;
  return <section className="section"><div className="container-site"><div className="grid gap-6 md:grid-cols-2">{page.sections.map((section, index) => <article key={`${section.title}-${index}`} className="card p-7 md:p-9"><h2 className="text-2xl font-black">{section.title}</h2>{section.text && <p className="mt-4 leading-7 text-slate-600">{section.text}</p>}{section.items?.length ? <div className="mt-5 grid gap-3">{section.items.map(item => <p key={item} className="flex gap-3"><CheckCircleIcon className="h-6 shrink-0 text-leaf"/>{item}</p>)}</div> : null}</article>)}</div>{page.cta_label && page.cta_url ? <div className="mt-10 text-center"><Link href={page.cta_url} className="btn-primary px-9">{page.cta_label}</Link></div> : null}</div></section>;
}
