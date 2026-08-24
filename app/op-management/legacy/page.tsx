import Link from 'next/link';
import { getCurrentLocale } from '@/lib/i18n-server';

export const metadata = { title: 'Outils existants (NFI, Estimateur besoins...) | NutVitaGlobalis' };

export default async function OperationsManagementLegacyPage() {
  const locale = await getCurrentLocale();
  const english = locale === 'en';
  const t = (fr: string, en: string) => english ? en : fr;
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-slate-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-3 py-3 text-white sm:px-5">
        <div className="min-w-0"><p className="break-words text-sm font-black sm:text-base">Project, Programme & Portfolio Management</p><p className="text-xs text-white/60">{t('Strategie, gouvernance, plans, execution et reporting', 'Strategy, governance, plans, execution and reporting')}</p></div>
        <Link href="/op-management" className="shrink-0 rounded-md border border-white/20 px-3 py-2 text-sm font-bold sm:px-4">{t('Quitter', 'Exit')}</Link>
      </header>
      <iframe title="Project, Programme and Portfolio Management" src="/op-management/index.html" className="min-h-0 w-full flex-1 border-0 bg-white" />
    </main>
  );
}
