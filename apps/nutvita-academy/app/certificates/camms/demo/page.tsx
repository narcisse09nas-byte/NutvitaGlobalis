import { notFound } from "next/navigation";
import { DynamicCertificate } from "@/components/certificates/DynamicCertificate";
import { Badge } from "@/components/ui/Badge";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export default function CertificateDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4"><Badge><LocalizedText fr="Aperçu local" en="Local preview" /></Badge></div>
        <DynamicCertificate data={{
          recipientName: "Paul Narcisse Zebaze",
          courseName: "Certified Acute Malnutrition Management Specialist (CAMMS)",
          courseSubtitle: "Prise en charge communautaire de la malnutrition aiguë / Community-based management of acute malnutrition",
          certificateId: "CAMMS-2026-DEMO0001",
          completionDate: "13 juillet 2026",
          directorName: "Paul N.",
          verificationUrl: "http://localhost:3000/certificates/verify/CAMMS-2026-DEMO0001",
        }} />
      </div>
    </main>
  );
}
