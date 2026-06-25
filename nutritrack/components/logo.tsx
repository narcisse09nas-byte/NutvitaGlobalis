
import { Activity } from 'lucide-react';
import { cn } from '@/nutritrack/lib/utils';

export function Logo() {
  return (
    <div className={cn("flex items-start gap-2 p-3 text-sidebar-foreground bg-sidebar-logo")}>
      <Activity className="h-6 w-6 text-yellow-300" />
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-white">NutriTrack</h2>
        <p className="mt-1 text-[10px] leading-4 text-white/60">Support a la prise en charge integree de la malnutrition aigue</p>
      </div>
    </div>
  );
}


