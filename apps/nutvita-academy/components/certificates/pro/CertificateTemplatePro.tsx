import type { CertificateData } from "@/types/certificate";
import { DynamicCertificate } from "@/components/certificates/DynamicCertificate";

/** @deprecated Utiliser DynamicCertificate. Conservé comme alias de compatibilité. */
export function CertificateTemplatePro({ data }: { data: CertificateData }) {
  return <DynamicCertificate data={data} />;
}
