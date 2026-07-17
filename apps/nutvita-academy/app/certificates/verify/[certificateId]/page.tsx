import { PublicCertificateVerification } from "@/components/certification/PublicCertificateVerification";

export default async function CertificateVerificationPage({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  return <PublicCertificateVerification certificateId={certificateId} />;
}
