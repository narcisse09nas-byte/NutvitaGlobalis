import PublicSignaturePage from "@/components/signatures/PublicSignaturePage";

export default async function SignaturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicSignaturePage token={token} />;
}
