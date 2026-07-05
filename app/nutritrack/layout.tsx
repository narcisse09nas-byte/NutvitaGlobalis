import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SidebarProvider } from '@/nutritrack/components/ui/sidebar';
import { Toaster } from '@/nutritrack/components/ui/toaster';
import { requireNutriTrackAccess } from '@/lib/nutritrack-auth';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'NutriTrack',
  description: 'Application de support a la prise en charge integree de la malnutrition aigue.',
};

export default async function NutriTrackLayout({ children }: { children: ReactNode }) {
  await requireNutriTrackAccess();
  return (
    <div className="nutritrack-scope font-body antialiased">
      <Link href="/services" className="fixed right-4 top-3 z-[80] inline-flex h-10 items-center gap-2 rounded-md border border-white/25 bg-white px-3 text-sm font-bold text-slate-900 shadow-md transition hover:bg-slate-50">
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">NutVitaGlobalis</span>
      </Link>
      <SidebarProvider>{children}</SidebarProvider>
      <Toaster />
    </div>
  );
}


