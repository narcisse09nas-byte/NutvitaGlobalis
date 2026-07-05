import Link from 'next/link';

export const metadata = { title: 'OP Management | NutVitaGlobalis' };

export default async function OperationsManagementPage() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-slate-950">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-3 text-white">
        <div><p className="font-black">OP Management</p><p className="text-xs text-white/60">Projets, financements, execution et reporting</p></div>
        <Link href="/services" className="rounded-md border border-white/20 px-4 py-2 text-sm font-bold">Quitter</Link>
      </header>
      <iframe title="OP Management" src="/op-management/index.html" className="min-h-0 w-full flex-1 border-0 bg-white" />
    </main>
  );
}
