import { redirect } from "next/navigation";

export default async function OperationCadrageIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/op-management/operations/${id}/cadrage/sites`);
}
