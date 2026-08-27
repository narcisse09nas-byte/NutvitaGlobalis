import type { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

// Shared form shell (refinement program, Wave 1) — the green-card look used sitewide
// (see components/ContactForm.tsx) applied to every PPM modal, replacing the bare
// fixed-inset + flat-white-card pattern used ad hoc across ~45 forms until now.
export default function PPMFormModal({ icon: Icon, title, subtitle, onClose, children, maxWidth = "max-w-2xl" }: {
  icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string;
  onClose: () => void; children: ReactNode; maxWidth?: string;
}) {
  const { en } = usePpmLocale();
  return <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
    <div className={`ppm-modal-card mx-auto my-10 ${maxWidth} rounded-[2rem] bg-white p-7 shadow-2xl md:p-10`}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint text-forest"><Icon className="h-5" /></span>
          <div><h2 className="text-3xl font-black text-forest">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"} className="text-slate-400 hover:text-forest"><XMarkIcon className="h-6" /></button>
      </div>
      <div className="mt-7">{children}</div>
    </div>
  </div>;
}
