import type { ReactNode } from 'react';
import { SidebarProvider } from '@/nutritrack/components/ui/sidebar';
import { Toaster } from '@/nutritrack/components/ui/toaster';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'NutriTrack',
  description: 'Application de support a la prise en charge integree de la malnutrition aigue.',
};

export default function NutriTrackLayout({ children }: { children: ReactNode }) {
  return (
    <div className="nutritrack-scope font-body antialiased">
      <SidebarProvider>{children}</SidebarProvider>
      <Toaster />
    </div>
  );
}


