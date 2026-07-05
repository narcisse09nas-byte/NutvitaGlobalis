import AnalysisRoutePage from '../AnalysisRoutePage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AnalysisRoutePage id={(await params).id} mode="other" />;
}
