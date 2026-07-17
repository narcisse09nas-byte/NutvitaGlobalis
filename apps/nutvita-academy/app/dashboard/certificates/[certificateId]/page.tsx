import { CertificateDetailClient } from "@/components/certification/CertificateDetailClient";

type CertificatePageProps = {
  params: Promise<{
    certificateId: string;
  }>;
};

export default async function CertificatePage({
  params,
}: CertificatePageProps) {
  const { certificateId } = await params;

  return <CertificateDetailClient certificateId={certificateId} />;
}
