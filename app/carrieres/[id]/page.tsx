import CareerDetail from '@/components/careers/CareerDetail';
export const metadata = { title: 'Offre d emploi' };
export default async function CareerPage({ params }: { params: Promise<{ id: string }> }) {
  return <CareerDetail id={(await params).id} />;
}
