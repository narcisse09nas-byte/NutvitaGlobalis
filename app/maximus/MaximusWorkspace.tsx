'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Archive, AreaChart, Banknote, Boxes, BriefcaseBusiness, Building2, CalendarCheck,
  Car, ChevronDown, ChevronRight, ClipboardList, CreditCard, FileBarChart, FilePenLine,
  Fuel, Gauge, Handshake, Landmark, LayoutDashboard, Menu, PackageCheck, Receipt,
  Settings, ShoppingCart, Store, Truck, UserRoundCog, Users, Utensils, Wallet, Warehouse,
  Wrench, X,
} from 'lucide-react';

type Item = { label: string; icon: typeof LayoutDashboard; href?: string };
type Group = { label: string; icon: typeof LayoutDashboard; items: Item[] };

const directItems: Item[] = [
  { label: 'Tableau de bord', icon: LayoutDashboard },
  { label: 'Messagerie interne', icon: ClipboardList, href: '/admin/collaboration' },
  { label: 'Menus', icon: Utensils },
];

const groups: Group[] = [
  { label: 'Ventes', icon: ShoppingCart, items: [
    { label: 'Points de vente', icon: Store },
    { label: 'Stocks des points de vente', icon: Warehouse },
    { label: 'Commandes journalières', icon: ClipboardList },
    { label: 'Registre des livraisons', icon: Truck },
    { label: 'Rapports de vente', icon: FileBarChart },
  ] },
  { label: 'Approvisionnement et stock', icon: Boxes, items: [
    { label: 'Ingrédients', icon: PackageCheck },
    { label: 'Besoins consolidés', icon: ClipboardList },
    { label: 'Estimation des coûts', icon: Receipt },
    { label: 'Stock central', icon: Warehouse },
  ] },
  { label: 'Production', icon: Building2, items: [
    { label: 'Planification de la production', icon: CalendarCheck },
    { label: 'Commandes consolidées', icon: ClipboardList },
    { label: 'Cuisines centrales', icon: Building2 },
  ] },
  { label: 'Ressources humaines', icon: Users, items: [
    { label: 'Répertoire du personnel', icon: Users, href: '/admin/personnel' },
    { label: 'Recrutement', icon: BriefcaseBusiness, href: '/admin/recrutement' },
    { label: 'Congés et absences', icon: CalendarCheck },
    { label: 'Intégration du personnel', icon: UserRoundCog },
    { label: 'Performance', icon: Gauge },
    { label: 'Bulletins et grille salariale', icon: Receipt },
  ] },
  { label: 'Partenaires et fournisseurs', icon: Handshake, items: [
    { label: 'Gestion des fournisseurs', icon: Users, href: '/admin/prestataires-paiements' },
    { label: 'Coordonnées bancaires', icon: Landmark },
  ] },
  { label: 'Actifs', icon: Archive, items: [
    { label: 'Inventaire des actifs', icon: Archive },
    { label: 'Mouvements des actifs', icon: ClipboardList },
  ] },
  { label: 'Flotte', icon: Car, items: [
    { label: 'Carburant', icon: Fuel },
    { label: 'Maintenance', icon: Wrench },
    { label: 'Mouvements', icon: Truck },
    { label: 'Cartes carburant', icon: CreditCard },
  ] },
  { label: 'Finance', icon: Wallet, items: [
    { label: 'Dashboard financier', icon: AreaChart, href: '/admin/dashboard-business' },
    { label: 'Rapports financiers', icon: FileBarChart, href: '/admin/factures' },
    { label: 'Lignes budgétaires', icon: Banknote },
    { label: 'Demandes de fonds', icon: FilePenLine },
    { label: 'Initiation des paiements', icon: CreditCard, href: '/admin/paiements' },
    { label: 'Dépenses', icon: Receipt, href: '/admin/depenses' },
    { label: 'Petite caisse', icon: Wallet },
    { label: 'Virements bancaires', icon: Landmark },
  ] },
];

const moduleDescriptions: Record<string, string> = {
  'Points de vente': 'Créez les restaurants et points de vente NutVita, définissez les responsables et suivez leur activité.',
  'Commandes journalières': 'Centralisez les commandes par point de vente et préparez les besoins de production.',
  'Ingrédients': 'Gérez le catalogue des matières premières, unités, seuils et fournisseurs.',
  'Planification de la production': 'Planifiez les quantités à produire à partir des commandes et des capacités des cuisines.',
  'Congés et absences': 'Suivez les demandes, validations, soldes et périodes d’absence du personnel.',
  'Inventaire des actifs': 'Tenez le registre des équipements, affectations, états et historiques.',
  'Carburant': 'Enregistrez les ravitaillements, consommations, véhicules et justificatifs.',
  'Lignes budgétaires': 'Structurez les budgets internes par activité, centre de coût et période.',
};

export default function MaximusWorkspace({ adminName }: { adminName: string }) {
  const [selected, setSelected] = useState('Tableau de bord');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Ventes: true, Finance: true });
  const [mobileOpen, setMobileOpen] = useState(false);

  const select = (label: string) => {
    setSelected(label);
    setMobileOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#f4f7f6] text-slate-900">
      <button onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-md bg-[#123d32] text-white shadow-lg lg:hidden"><Menu className="h-5" /></button>
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-[#123d32] text-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div><p className="text-xl font-black">Maximus</p><p className="text-xs text-white/55">Cabinet et restauration NutVita</p></div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden"><X className="h-5" /></button>
        </div>
        <nav className="p-3">
          {directItems.map(({ label, icon: Icon, href }) => href
            ? <Link key={label} href={href} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-white/75 hover:bg-white/10"><Icon className="h-5" />{label}</Link>
            : <button key={label} onClick={() => select(label)} className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold ${selected === label ? 'bg-[#ef7f3b] text-white' : 'text-white/75 hover:bg-white/10'}`}><Icon className="h-5" />{label}</button>,
          )}
          {groups.map(group => <div key={group.label} className="mt-2">
            <button onClick={() => setOpenGroups(current => ({ ...current, [group.label]: !current[group.label] }))} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold text-white/80 hover:bg-white/10"><group.icon className="h-5" /><span className="flex-1">{group.label}</span>{openGroups[group.label] ? <ChevronDown className="h-4" /> : <ChevronRight className="h-4" />}</button>
            {openGroups[group.label] && <div className="ml-5 border-l border-white/15 pl-2">{group.items.map(({ label, icon: Icon, href }) => href
              ? <Link key={label} href={href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/65 hover:bg-white/10 hover:text-white"><Icon className="h-4" />{label}</Link>
              : <button key={label} onClick={() => select(label)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm ${selected === label ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}><Icon className="h-4" />{label}</button>,
            )}</div>}
          </div>)}
        </nav>
      </aside>

      <section className="min-h-screen lg:pl-72">
        <header className="flex min-h-20 items-center justify-between border-b bg-white px-6 pl-20 lg:pl-8">
          <div><p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Gestion interne</p><h1 className="text-2xl font-black">{selected}</h1></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-black">{adminName}</p><p className="text-xs text-slate-500">Super administrateur</p></div><span className="grid h-11 w-11 place-items-center rounded-full bg-[#123d32] font-black text-white">{adminName.slice(0, 2).toUpperCase()}</span></div>
        </header>
        <div className="p-5 lg:p-8">
          {selected === 'Tableau de bord' ? <Dashboard /> : <ModuleView title={selected} />}
        </div>
      </section>
    </main>
  );
}

function Dashboard() {
  const metrics = [
    ['Chiffre d’affaires', '0 FCFA', ShoppingCart, 'Ventes consolidées du mois'],
    ['Personnel actif', '0', Users, 'Cabinet, cuisines et points de vente'],
    ['Commandes du jour', '0', ClipboardList, 'Toutes unités confondues'],
    ['Actifs enregistrés', '0', Archive, 'Équipements et flotte'],
  ] as const;
  return <div className="grid gap-6">
    <section><h2 className="text-2xl font-black">Vue d’ensemble opérationnelle</h2><p className="mt-1 text-slate-500">Pilotage du cabinet, de la restauration, des équipes et des ressources.</p></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon, note]) => <article key={label} className="rounded-lg border bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div><span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-700"><Icon className="h-5" /></span></div><p className="mt-4 text-xs text-slate-400">{note}</p></article>)}</section>
    <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <article className="rounded-lg border bg-white p-6"><h3 className="text-lg font-black">Activité mensuelle</h3><div className="mt-6 flex h-72 items-end gap-3 border-b border-l p-5">{[28,44,37,62,55,74,69,86,72,91,83,96].map((height, index) => <div key={index} className="flex-1 rounded-t bg-[#24945f]" style={{ height: `${height}%` }} title={`Mois ${index + 1}`} />)}</div></article>
      <article className="rounded-lg border bg-white p-6"><h3 className="text-lg font-black">Priorités de gestion</h3><div className="mt-5 grid gap-3">{['Valider les demandes financières', 'Consolider les commandes des points de vente', 'Contrôler les seuils du stock central', 'Mettre à jour les présences du personnel'].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-md bg-slate-50 p-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-white font-black text-emerald-700">{index + 1}</span><p className="text-sm font-bold">{item}</p></div>)}</div></article>
    </section>
  </div>;
}

function ModuleView({ title }: { title: string }) {
  return <div className="grid gap-6">
    <section className="rounded-lg border bg-white p-6"><p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Module Maximus</p><h2 className="mt-2 text-3xl font-black">{title}</h2><p className="mt-3 max-w-3xl leading-7 text-slate-500">{moduleDescriptions[title] || `Espace opérationnel consacré à ${title.toLowerCase()}, intégré à la gestion interne du cabinet et de la restauration NutVita.`}</p></section>
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-lg border bg-white p-5"><p className="text-sm font-bold text-slate-500">Éléments actifs</p><p className="mt-3 text-3xl font-black">0</p></article>
      <article className="rounded-lg border bg-white p-5"><p className="text-sm font-bold text-slate-500">À traiter</p><p className="mt-3 text-3xl font-black">0</p></article>
      <article className="rounded-lg border bg-white p-5"><p className="text-sm font-bold text-slate-500">Dernière mise à jour</p><p className="mt-3 text-lg font-black">Aujourd’hui</p></article>
    </section>
    <section className="rounded-lg border bg-white"><header className="flex items-center justify-between border-b p-5"><h3 className="text-lg font-black">Registre</h3><button className="btn-primary"><Settings className="mr-2 h-4" />Configurer</button></header><div className="p-10 text-center text-sm text-slate-500">Les données de ce module apparaîtront ici à mesure de leur enregistrement.</div></section>
  </div>;
}
