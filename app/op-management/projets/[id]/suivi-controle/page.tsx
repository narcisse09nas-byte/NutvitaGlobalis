import { redirect } from "next/navigation";

export default async function SuiviControleIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/op-management/projets/${id}/suivi-controle/risques-issues`);
}
