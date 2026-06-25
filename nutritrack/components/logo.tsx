'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, LogOut, Settings } from 'lucide-react';
import { cn } from '@/nutritrack/lib/utils';
import { createClient } from '@/lib/supabase/client';

export function Logo() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: member } = await supabase
        .from('nutritrack_members')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();
      setIsAdmin(member?.role === 'organization_admin');
    });
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    window.location.assign('/acces-nutritrack');
  }

  return (
    <div className={cn("bg-sidebar-logo p-3 text-sidebar-foreground")}>
      <div className="flex items-start gap-2">
        <Activity className="h-6 w-6 text-yellow-300" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">NutriTrack</h2>
          <p className="mt-1 text-[10px] leading-4 text-white/60">Support a la prise en charge integree de la malnutrition aigue</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {isAdmin && (
          <Link href="/nutritrack/administration" className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-white" title="Gestion des acces">
            <Settings className="h-4 w-4" />
          </Link>
        )}
        <button onClick={logout} className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-white" title="Se deconnecter">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


