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
  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
    <div className={`mx-auto my-10 ${maxWidth} rounded-[2rem] bg-forest p-5 shadow-2xl shadow-forest/30 md:p-7`}>
      <div className="mb-1 flex items-start justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange"><Icon className="h-5" /></span>
          <div><h2 className="text-xl font-black text-white">{title}</h2>{subtitle && <p className="mt-0.5 text-sm text-white/65">{subtitle}</p>}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"} className="text-white/70 hover:text-white"><XMarkIcon className="h-6" /></button>
      </div>
      <div className="mt-4 rounded-[1.6rem] bg-white p-6 md:p-8">{children}</div>
    </div>
  </div>;
}
