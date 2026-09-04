import { notFound,redirect } from 'next/navigation';
import PPMShell from '@/components/op-management/PPMShell';
import OperationShell from '@/components/op-management/OperationShell';
import MiseEnOeuvreOpsTabs from '@/components/op-management/MiseEnOeuvreOpsTabs';
import HgsfOperationsRegister from '@/components/op-management/HgsfOperationsRegister';
import { createClient } from '@/lib/supabase/server';
import { getCurrentLocale } from '@/lib/i18n-server';
import { getOperation } from '@/lib/ppm/queries';

export default async function HgsfPilotagePage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params; const db=await createClient();
 const {data:{user}}=await db.auth.getUser(); if(!user) redirect('/connexion');
 const operation=await getOperation(db,id); if(!operation?.is_sf_hgsf) notFound();
 const locale=await getCurrentLocale(); const name=user.user_metadata?.full_name||user.email||'Utilisateur';
 const tables=['ppm_ops_daily_needs','ppm_ops_daily_service_reports','ppm_ops_stock_movements','ppm_ops_goods_receipts','ppm_ops_supervision_visits','ppm_ops_corrective_actions'] as const;
 const results=await Promise.all(tables.map(table=>db.from(table).select('*').eq('operation_id',id).limit(500)));
 return <PPMShell name={name} locale={locale} breadcrumbs={[{href:'/op-management/operations',label:'Operations'},{href:`/op-management/operations/${id}`,label:operation.name}]}><OperationShell operation={operation}><div className={'grid gap-5'}><MiseEnOeuvreOpsTabs operationId={id} isSfHgsf/><HgsfOperationsRegister locale={locale} datasets={results.map(x=>x.data||[])}/></div></OperationShell></PPMShell>;
}
