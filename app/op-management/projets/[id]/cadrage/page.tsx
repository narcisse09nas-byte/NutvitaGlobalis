import { redirect } from "next/navigation";

export default async function CadrageIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/op-management/projets/${id}/cadrage/identification`);
}
