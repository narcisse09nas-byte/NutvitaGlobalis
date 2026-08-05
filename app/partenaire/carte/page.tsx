import Link from "next/link";
import QRCode from "qrcode";
import AccessCard from "@/components/shared/AccessCard";
import PrintCardButton from "@/components/shared/PrintCardButton";
import { requirePartner } from "@/lib/partner";

export default async function PartnerAccessCardPage() {
  const { user, profile } = await requirePartner();
  const email = user.email || "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const target = `${site}/connexion?identifiant=${encodeURIComponent(email)}&redirect=${encodeURIComponent("/api/access/open?service=health&role=nutritionist")}`;
  const qrDataUrl = await QRCode.toDataURL(target, { width: 320, margin: 2, color: { dark: "#123c2f", light: "#ffffff" } });
  const specialties = ((profile?.specialties || []) as string[]).filter(Boolean);
  return <main className="min-h-screen bg-slate-100 p-5">
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/partenaire" className="text-sm font-bold text-leaf">← Retour à mon espace</Link>
        <PrintCardButton />
      </div>
      <AccessCard
        name={profile?.full_name || email}
        title="Nutritionniste – Partenaire NutVitaGlobalis"
        subtitle={specialties.slice(0, 2).join(" · ") || undefined}
        matricule={profile?.matricule || undefined}
        email={email}
        qrDataUrl={qrDataUrl}
      />
    </div>
  </main>;
}
