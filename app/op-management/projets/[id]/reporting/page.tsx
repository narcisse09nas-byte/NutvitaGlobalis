import { redirect } from "next/navigation";

export default async function ReportingIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/op-management/projets/${id}/reporting/livrables-documents`);
}
