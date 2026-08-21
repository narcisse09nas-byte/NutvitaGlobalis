import { redirect } from "next/navigation";

export default async function MiseEnOeuvreIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/op-management/projets/${id}/mise-en-oeuvre/mes-activites`);
}
