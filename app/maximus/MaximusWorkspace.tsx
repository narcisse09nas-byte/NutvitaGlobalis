'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import {
  Archive, Boxes, Building2, Car, ChevronDown, ChevronRight, ClipboardList,
  FileSignature, GitBranch, Handshake, LayoutDashboard, Menu, ShoppingCart, Users, Utensils, Wallet, X,
} from 'lucide-react';
import type { MaximusModule } from '@/lib/maximus-modules';
import { maximusModules } from '@/lib/maximus-modules';
import MaximusRecords from './MaximusRecords';
import MaximusWorkflowOverview from './MaximusWorkflowOverview';
import ProductionSalesRecords from './specialized/ProductionSalesRecords';
import AssetFleetRecords from './specialized/AssetFleetRecords';
import PeopleAdminRecords from './specialized/PeopleAdminRecords';
import MenuNutritionRecords from './specialized/MenuNutritionRecords';
import ConsolidatedDailyOrders from './specialized/ConsolidatedDailyOrders';
import ProductionManagement from './specialized/ProductionManagement';
import StaffDirectory from './specialized/StaffDirectory';
import StaffBankDetails from './specialized/StaffBankDetails';
import RecruitmentOffers from './specialized/RecruitmentOffers';
import RecruitmentApplications from './specialized/RecruitmentApplications';
import WrittenTestDesigner from './specialized/WrittenTestDesigner';
import TestProctoringCockpit from './specialized/TestProctoringCockpit';
import RecruitmentLifecycle from './specialized/RecruitmentLifecycle';
import VendorRecruitment from './specialized/VendorRecruitment';
import RecruitmentAuditReports from './specialized/RecruitmentAuditReports';
import LeaveManagement from './specialized/LeaveManagement';
import MissionManagement from './specialized/MissionManagement';
import PerformanceManagement from './specialized/PerformanceManagement';
import MyTrainingPlan from './specialized/MyTrainingPlan';
import PayslipManagement from './specialized/PayslipManagement';
import SalaryGridManagement from './specialized/SalaryGridManagement';
import PayslipComponents from './specialized/PayslipComponents';
import SalePointStockManagement from './specialized/SalePointStockManagement';
import ConsolidatedWeeklyNeeds from './specialized/ConsolidatedWeeklyNeeds';
import CostEstimationManagement from './specialized/CostEstimationManagement';
import CentralStockManagement from './specialized/CentralStockManagement';
import VendorManagement from './specialized/VendorManagement';
import VendorBankDetails from './specialized/VendorBankDetails';
import OnboardingManagement from './specialized/OnboardingManagement';
import AssetManagement from './specialized/AssetManagement';
import MaintenanceLog from './specialized/MaintenanceLog';
import TomCardManagement from './specialized/TomCardManagement';
import NutritionalAnalysis from './specialized/NutritionalAnalysis';
import FinancialReports from './specialized/FinancialReports';
import BudgetaryLines from './specialized/BudgetaryLines';
import FinancialRequests from './specialized/FinancialRequests';
import PaymentInitiation from './specialized/PaymentInitiation';
import PaymentRegisters from './specialized/PaymentRegisters';
import CostEstimationRegister from './specialized/CostEstimationRegister';
import OperationalAdvances from './specialized/OperationalAdvances';
import PettyCashManagement from './specialized/PettyCashManagement';
import BankTransfersManagement from './specialized/BankTransfersManagement';
import CashDepositsManagement from './specialized/CashDepositsManagement';
import CommunicationCenter from '@/components/communications/CommunicationCenter';
import MaximusUserManagement from './specialized/MaximusUserManagement';

const FinancialDashboard = dynamic(() => import('./specialized/FinancialDashboard'), {
  loading: () => <div className="grid h-72 place-items-center text-sm text-slate-500">Loading financial dashboard...</div>,
});

const groupIcons = {
  'Restauration': Utensils,
  'Ventes': ShoppingCart,
  'Approvisionnement et stock': Boxes,
  'Production': Building2,
  'Ressources humaines': Users,
  'Partenaires et fournisseurs': Handshake,
  'Actifs': Archive,
  'Flotte': Car,
  'Finance': Wallet,
} as const;

export default function MaximusWorkspace({ adminName, module, workflowView = false, allowedModules, isSuperAdmin = true }: { adminName: string; module?: MaximusModule; workflowView?: boolean; allowedModules?: string[]; isSuperAdmin?: boolean }) {
  const groups = useMemo(() => {
    const result = new Map<string, MaximusModule[]>();
    maximusModules.filter(item => item.group !== 'Restauration' && (!allowedModules || allowedModules.includes(item.slug))).forEach(item => result.set(item.group, [...(result.get(item.group) || []), item]));
    const financeOrder = ['finance/dashboard','finance/reports','finance/budget-lines','finance/requests','finance/payment-initiation','finance/my-payments','finance/cash-supply-requests','finance/cost-estimations','finance/payments','finance/payment-register','finance/operational-advances','finance/petty-cash','finance/bank-transfers','finance/cash-deposits'];
    return Array.from(result).map(([group, items]) => [group, group === 'Finance' ? [...items].sort((a, b) => financeOrder.indexOf(a.slug) - financeOrder.indexOf(b.slug)) : items] as const);
  }, [allowedModules]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Restauration: true,
    Ventes: true,
    Finance: true,
    ...(module ? { [module.group]: true } : {}),
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  return <main className="min-h-screen bg-[#f4f7f6] text-slate-900">
    <button onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-md bg-[#123d32] text-white shadow-lg lg:hidden"><Menu className="h-5" /></button>
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-[#123d32] text-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div><p className="text-xl font-black">Maximus</p><p className="text-xs text-white/55">Cabinet et restauration NutVita</p></div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden"><X className="h-5" /></button>
      </div>
      <nav className="p-3">
        <Link href="/maximus" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${!module && !workflowView ? 'bg-[#ef7f3b] text-white' : 'text-white/75 hover:bg-white/10'}`}><LayoutDashboard className="h-5" />Tableau de bord</Link>
        {isSuperAdmin && <Link href="/maximus/workflows" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${workflowView ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10'}`}><GitBranch className="h-5" />Flux centralisés</Link>}
        {(!allowedModules || allowedModules.includes('communications/messages')) && <Link href="/maximus/communications/messages" className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${module?.slug === 'communications/messages' ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10'}`}><ClipboardList className="h-5" />Messagerie Maximus</Link>}
        {(!allowedModules || allowedModules.includes('communications/meetings')) && <Link href="/maximus/communications/meetings" className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${module?.slug === 'communications/meetings' ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10'}`}><ClipboardList className="h-5" />Réunions Maximus</Link>}
        <Link href="/signatures" className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-white/75 hover:bg-white/10"><FileSignature className="h-5" />Signatures électroniques</Link>
        {(!allowedModules || allowedModules.includes('menus')) && <Link href="/maximus/menus" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${module?.slug === 'menus' ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10'}`}><Utensils className="h-5" />Menus</Link>}
        {groups.map(([group, items]) => {
          const Icon = groupIcons[group as keyof typeof groupIcons] || ClipboardList;
          return <div key={group} className="mt-2">
            <button onClick={() => setOpenGroups(current => ({ ...current, [group]: !current[group] }))} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold text-white/80 hover:bg-white/10"><Icon className="h-5" /><span className="flex-1">{group}</span>{openGroups[group] ? <ChevronDown className="h-4" /> : <ChevronRight className="h-4" />}</button>
            {openGroups[group] && <div className="ml-5 border-l border-white/15 pl-2">{items.map(item => <Link key={item.slug} href={`/maximus/${item.slug}`} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${module?.slug === item.slug ? 'bg-white/15 font-bold text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}><ClipboardList className="h-4" />{item.title}</Link>)}</div>}
          </div>;
        })}
        {(!allowedModules || allowedModules.includes('nutrition-analysis')) && <Link href="/maximus/nutrition-analysis" onClick={() => setMobileOpen(false)} className={`mt-2 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${module?.slug === 'nutrition-analysis' ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10'}`}><Utensils className="h-5" />Analyse nutritionnelle</Link>}
      </nav>
    </aside>

    <section className="min-h-screen lg:pl-72">
      <header className="flex min-h-20 items-center justify-between border-b bg-white px-6 pl-20 lg:pl-8">
        <div><p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Gestion interne</p><h1 className="text-2xl font-black">{workflowView ? 'Flux centralisés' : module?.title || 'Tableau de bord'}</h1></div>
        <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-black">{adminName}</p><p className="text-xs text-slate-500">{isSuperAdmin ? 'Super administrateur' : 'Utilisateur Maximus'}</p></div><span className="grid h-11 w-11 place-items-center rounded-full bg-[#123d32] font-black text-white">{adminName.slice(0, 2).toUpperCase()}</span></div>
      </header>
      <div className="p-5 lg:p-8">{workflowView ? <MaximusWorkflowOverview /> : module ? <ModuleRenderer module={module} /> : <Dashboard />}</div>
    </section>
  </main>;
}

function ModuleRenderer({ module }: { module: MaximusModule }) {
  if (module.slug === 'administration/users') return <MaximusUserManagement />;
  if (module.slug === 'communications/messages') return <CommunicationCenter scope="maximus" />;
  if (module.slug === 'hr/recruitment/proctoring') return <TestProctoringCockpit />;
  if (module.slug === 'hr/recruitment/interviews') return <RecruitmentLifecycle />;
  if (module.slug === 'partnerships/vendor-recruitment') return <VendorRecruitment />;
  if (module.slug === 'hr/recruitment/audit') return <RecruitmentAuditReports />;
  if (module.slug === 'hr/recruitment/tests') return <WrittenTestDesigner />;
  if (module.slug === 'hr/recruitment/applications') return <RecruitmentApplications />;
  if (module.slug === 'communications/recruitment') return <RecruitmentOffers />;
  if (module.slug === 'finance/cash-deposits') return <CashDepositsManagement />;
  if (module.slug === 'finance/bank-transfers') return <BankTransfersManagement />;
  if (module.slug === 'finance/petty-cash') return <PettyCashManagement />;
  if (module.slug === 'finance/operational-advances') return <OperationalAdvances />;
  if (module.slug === 'finance/cost-estimations') return <CostEstimationRegister />;
  if (module.slug === 'finance/my-payments') return <PaymentRegisters mode="mine" />;
  if (module.slug === 'finance/payment-register') return <PaymentRegisters mode="register" />;
  if (module.slug === 'finance/payment-initiation') return <PaymentInitiation />;
  if (module.slug === 'finance/requests') return <FinancialRequests />;
  if (module.slug === 'finance/budget-lines') return <BudgetaryLines />;
  if (module.slug === 'finance/reports') return <FinancialReports />;
  if (module.slug === 'finance/dashboard') return <FinancialDashboard />;
  if (module.slug === 'nutrition-analysis') return <NutritionalAnalysis />;
  if (module.slug === 'fleet/tom-cards') return <TomCardManagement />;
  if (module.slug === 'fleet/maintenance') return <MaintenanceLog />;
  if (module.slug === 'assets/inventory') return <AssetManagement />;
  if (module.slug === 'hr/onboarding') return <OnboardingManagement />;
  if (module.slug === 'partnerships/bank-details') return <VendorBankDetails />;
  if (module.slug === 'partnerships/vendors') return <VendorManagement />;
  if (module.slug === 'supply/central-stock') return <CentralStockManagement />;
  if (module.slug === 'supply/cost-estimation') return <CostEstimationManagement />;
  if (module.slug === 'supply/consolidated-needs') return <ConsolidatedWeeklyNeeds />;
  if (module.slug === 'sales/partner-stock') return <SalePointStockManagement />;
  if (module.slug === 'hr/payslip-components') return <PayslipComponents />;
  if (module.slug === 'hr/salary-grid') return <SalaryGridManagement />;
  if (module.slug === 'hr/payroll') return <PayslipManagement />;
  if (module.slug === 'hr/my-training') return <MyTrainingPlan />;
  if (module.slug === 'hr/performance') return <PerformanceManagement />;
  if (module.slug === 'hr/missions') return <MissionManagement />;
  if (module.slug === 'hr/leave') return <LeaveManagement />;
  if (module.slug === 'hr/recruitment/offers') return <RecruitmentOffers />;
  if (module.slug === 'hr/staff-bank-details') return <StaffBankDetails />;
  if (module.slug === 'hr/staff') return <StaffDirectory />;
  if (module.slug === 'production/planning') return <ProductionManagement />;
  if (module.slug === 'production/consolidated-orders') return <ConsolidatedDailyOrders />;
  if (module.group === 'Production' || module.group === 'Ventes') return <ProductionSalesRecords module={module} />;
  if (module.group === 'Actifs' || module.group === 'Flotte') return <AssetFleetRecords module={module} />;
  if (module.group === 'Ressources humaines' || module.group === 'Communications' || module.group === 'Administration Maximus') return <PeopleAdminRecords module={module} />;
  if (module.group === 'Restauration') return <MenuNutritionRecords module={module} />;
  return <MaximusRecords module={module} />;
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
