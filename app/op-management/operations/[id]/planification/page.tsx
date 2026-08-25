import { redirect } from "next/navigation";

export default async function OperationPlanificationIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/op-management/operations/${id}/planification/plan`);
}
