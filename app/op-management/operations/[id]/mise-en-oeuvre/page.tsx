import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOperation } from "@/lib/ppm/queries";

export default async function OperationMiseEnOeuvreIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const operation = await getOperation(supabase, id);
  if (!operation) notFound();
  redirect(`/op-management/operations/${id}/mise-en-oeuvre/${operation.is_sf_hgsf ? "bons-de-commande" : "besoins"}`);
}
