import Link from "next/link";
import QRCode from "qrcode";
import AccessCard from "@/components/shared/AccessCard";
import PrintCardButton from "@/components/shared/PrintCardButton";
import { requireClient } from "@/lib/client";

export default async function ClientAccessCardPage() {
  const { user, profile } = await requireClient();
  const email = user.email || profile?.email || "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const target = `${site}/connexion?identifiant=${encodeURIComponent(email)}&redirect=${encodeURIComponent("/espace-client")}`;
  const qrDataUrl = await QRCode.toDataURL(target, { width: 320, margin: 2, color: { dark: "#123c2f", light: "#ffffff" } });
  return <main className="min-h-screen bg-slate-100 p-5">
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/espace-client/profil" className="text-sm font-bold text-leaf">← Retour à mon profil</Link>
        <PrintCardButton />
      </div>
      <AccessCard
        name={profile?.full_name || email}
        title="Client NutVitaGlobalis"
        email={email}
        phone={profile?.phone || undefined}
        qrDataUrl={qrDataUrl}
      />
    </div>
  </main>;
}
