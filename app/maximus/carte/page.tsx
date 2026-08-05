import Link from "next/link";
import QRCode from "qrcode";
import AccessCard from "@/components/shared/AccessCard";
import PrintCardButton from "@/components/shared/PrintCardButton";
import { requireMaximusAccess } from "@/lib/maximus-auth";

const unitLabels: Record<string, string> = {
  logistics: "Logistique", hr: "Ressources humaines", finance: "Finance", production: "Production",
  sales: "Ventes", assets_fleet: "Actifs & flotte", communications: "Communication",
  operations: "Opérations", executive: "Direction",
};

export default async function MaximusAccessCardPage() {
  const { admin, access, isSuperAdmin } = await requireMaximusAccess();
  const email = admin.email || "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const target = `${site}/connexion?identifiant=${encodeURIComponent(email)}&redirect=${encodeURIComponent("/api/access/open?service=maximus")}`;
  const qrDataUrl = await QRCode.toDataURL(target, { width: 320, margin: 2, color: { dark: "#123c2f", light: "#ffffff" } });
  const units = (access?.units?.length ? access.units : access?.unit ? [access.unit] : []).map((unit: string) => unitLabels[unit] || unit);
  return <main className="min-h-screen bg-slate-100 p-5">
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/maximus" className="text-sm font-bold text-leaf">← Retour à Maximus</Link>
        <PrintCardButton />
      </div>
      <AccessCard
        name={admin.full_name || email}
        title={isSuperAdmin ? "Direction NutVitaGlobalis" : "Staff Maximus NutVitaGlobalis"}
        subtitle={units.slice(0, 2).join(" · ") || undefined}
        matricule={access?.matricule || undefined}
        email={email}
        qrDataUrl={qrDataUrl}
      />
    </div>
  </main>;
}
