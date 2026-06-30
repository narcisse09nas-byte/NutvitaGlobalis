import CareersList from '@/components/careers/CareersList';
export const metadata = { title: 'Carrieres et offres d emploi' };
export default function CareersPage() {
  return <div><section className="bg-forest py-16 text-white"><div className="container-site"><p className="text-sm font-black uppercase tracking-widest text-orange">Rejoignez NutVitaGlobalis</p><h1 className="mt-3 text-4xl font-black md:text-5xl">Carrieres et offres d emploi</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">Participez a une mission qui relie nutrition, sante, innovation et impact en Afrique.</p></div></section><section className="container-site py-12"><CareersList /></section></div>;
}
