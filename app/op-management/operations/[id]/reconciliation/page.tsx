import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOperation } from "@/lib/ppm/queries";

export default async function OperationReconciliationIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  redirect(`/op-management/operations/${id}/reconciliation/suivi-factures`);
}
