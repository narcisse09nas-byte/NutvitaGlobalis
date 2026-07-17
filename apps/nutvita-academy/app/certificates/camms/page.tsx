import { CertificatePreview } from "@/components/certificates/CertificatePreview";
import { Badge } from "@/components/ui/Badge";
import { LocalLearningProviders } from "@/components/progress/LocalLearningProviders";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export default function CammsCertificatePage() {
  return (
    <LocalLearningProviders><main className="min-h-screen bg-[#F8FAFC] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-8">
          <Badge><LocalizedText fr="Certificat officiel" en="Official certificate" /></Badge>

          <h1 className="mt-4 text-4xl font-extrabold text-[#063D2E]">
            <LocalizedText fr="Certificat CAMMS" en="CAMMS certificate" />
          </h1>

          <p className="mt-3 text-slate-600">
            <LocalizedText fr="Certificat numérique vérifiable délivré par NutVitaGlobalis Academy." en="Verifiable digital certificate issued by NutVitaGlobalis Academy." />
          </p>
        </div>

        <CertificatePreview />
      </div>
    </main></LocalLearningProviders>
  );
}
