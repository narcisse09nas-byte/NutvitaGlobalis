"use client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { PPMStatus } from "@/lib/ppm/types";

const labels: Record<PPMStatus, { fr: string; en: string }> = {
  draft: { fr: "Brouillon", en: "Draft" },
  active: { fr: "Actif", en: "Active" },
  on_hold: { fr: "En pause", en: "On hold" },
  closed: { fr: "Cloture", en: "Closed" },
  cancelled: { fr: "Annule", en: "Cancelled" },
};

const tones: Record<PPMStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-mint text-forest",
  on_hold: "bg-amber-50 text-amber-800",
  closed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function EntityStatusBadge({ status }: { status: PPMStatus }) {
  const { locale } = usePpmLocale();
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tones[status]}`}>{labels[status][locale]}</span>;
}
