import { notFound } from "next/navigation";
import LegalPage from "@/components/legal/LegalPage";
import { legalRoutes } from "@/lib/legal-documents";

export function generateStaticParams() {
  return Object.keys(legalRoutes).map(slug => ({ slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = legalRoutes[slug as keyof typeof legalRoutes];
  if (!key) notFound();
  return <LegalPage type={key} />;
}
