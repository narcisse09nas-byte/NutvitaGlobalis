"use client";
import Link from "next/link";
import { HomeIcon, Squares2X2Icon } from "@heroicons/react/24/outline";

export default function PrivateAreaFooter() {
  return <footer className="border-t border-forest/10 bg-white px-5 py-6">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 text-sm font-bold text-forest">
      <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-forest/15 px-4 py-2 transition hover:bg-mint"><HomeIcon className="h-4 w-4" />Page principale</Link>
      <Link href="/services" className="inline-flex items-center gap-2 rounded-full border border-forest/15 px-4 py-2 transition hover:bg-mint"><Squares2X2Icon className="h-4 w-4" />Nos services</Link>
    </div>
  </footer>;
}
