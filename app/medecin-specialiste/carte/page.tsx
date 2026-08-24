import Link from "next/link";
import QRCode from "qrcode";
import AccessCard from "@/components/shared/AccessCard";
import PrintCardButton from "@/components/shared/PrintCardButton";
import { requireSpecialist } from "@/lib/medical";

export default async function MedicalAccessCardPage() {
  const { user, profile } = await requireSpecialist();
  const email = user.email || "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const target = `${site}/connexion?identifiant=${encodeURIComponent(email)}&redirect=${encodeURIComponent("/api/access/open?service=medical_consultation&role=specialist")}`;
  const qrDataUrl = await QRCode.toDataURL(target, { width: 320, margin: 2, color: { dark: "#123c2f", light: "#ffffff" } });
  return <main className="min-h-screen bg-slate-100 p-5">
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/medecin-specialiste" className="text-sm font-bold text-leaf">← Retour a mon espace</Link>
        <PrintCardButton />
      </div>
      <AccessCard
        name={profile?.full_name || email}
        title="Medecin specialiste – Partenaire NutVitaGlobalis"
        subtitle={profile?.specialty || undefined}
        matricule={profile?.specialist_code || undefined}
        email={email}
        qrDataUrl={qrDataUrl}
      />
    </div>
  </main>;
}
