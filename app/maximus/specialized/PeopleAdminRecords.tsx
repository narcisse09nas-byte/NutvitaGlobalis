'use client';

import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, Mail, ShieldCheck, Users } from 'lucide-react';
import type { MaximusModule } from '@/lib/maximus-modules';
import MaximusRecords from '../MaximusRecords';

type RecordRow = {
  id: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

const linkedModules = [
  'hr/staff',
  'hr/leave',
  'hr/onboarding',
  'hr/performance',
  'hr/payroll',
  'hr/recruitment/offers',
  'hr/recruitment/applications',
  'communications/messages',
  'communications/meetings',
  'administration/users',
];

export default function PeopleAdminRecords({ module }: { module: MaximusModule }) {
  const [recordsByModule, setRecordsByModule] = useState<Record<string, RecordRow[]>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(linkedModules.map(async slug => {
      const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(slug)}`);
      const result = response.ok ? await response.json() : { items: [] };
      return [slug, result.items || []] as const;
    })).then(entries => {
      if (!cancelled) setRecordsByModule(Object.fromEntries(entries));
    }).catch(() => {
      if (!cancelled) setRecordsByModule({});
    });
    return () => { cancelled = true; };
  }, [module.slug]);

  const summary = useMemo(() => {
    const staff = recordsByModule['hr/staff'] || [];
    const leave = recordsByModule['hr/leave'] || [];
    const offers = recordsByModule['hr/recruitment/offers'] || [];
    const applications = recordsByModule['hr/recruitment/applications'] || [];
    const messages = recordsByModule['communications/messages'] || [];
    const users = recordsByModule['administration/users'] || [];
    return {
      staff: staff.length,
      pendingLeave: leave.filter(row => ['draft', 'submitted', 'endorsed'].includes(row.status)).length,
      openOffers: offers.filter(row => ['draft', 'submitted', 'validated'].includes(row.status)).length,
      applications: applications.length,
      unreadMessages: messages.filter(row => String(row.data.message_status || '').toLowerCase() !== 'lu').length,
      users: users.length,
    };
  }, [recordsByModule]);

  const cards = [
    ['Personnel', `${summary.staff}`, Users, 'Dossiers actifs et affectations'],
    ['Conges en cours', `${summary.pendingLeave}`, CalendarDays, 'Demandes a suivre'],
    ['Recrutement', `${summary.openOffers} / ${summary.applications}`, BriefcaseBusiness, 'Offres et candidatures'],
    ['Messages', `${summary.unreadMessages}`, Mail, 'Communication interne Maximus'],
    ['Acces', `${summary.users}`, ShieldCheck, 'Comptes prepares par super admin'],
  ] as const;

  return <div className="grid gap-6">
    <section className="rounded-lg border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Equipe Maximus</p>
          <h2 className="mt-2 text-2xl font-black">RH, recrutement, communications et acces</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Espace autonome pour les comptes Maximus, les dossiers RH, les offres d emploi, les candidatures,
            les messages et les reunions internes.
          </p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-md bg-emerald-50 text-emerald-700">
          <Users className="h-6" />
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {cards.map(([label, value, Icon, note]) => <article key={label} className="rounded-lg border bg-slate-50 p-4">
          <Icon className="h-5 text-emerald-700" />
          <p className="mt-3 text-sm font-black text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-black">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{note}</p>
        </article>)}
      </div>
    </section>
    <MaximusRecords module={module} embedded />
  </div>;
}
