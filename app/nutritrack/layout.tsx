import type { ReactNode } from 'react';
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
      <SidebarProvider>{children}</SidebarProvider>
      <Toaster />
    </div>
  );
}


