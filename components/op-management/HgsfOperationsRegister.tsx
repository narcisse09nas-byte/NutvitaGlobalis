'use client';
import { useMemo,useState } from 'react';

type Row=Record<string,unknown>;
const sections=[
 ['Besoins journaliers','Daily needs'],['Rapports journaliers','Daily reports'],['Mouvements de stock','Stock movements'],
 ['Bons de reception','Goods receipts'],['Supervisions','Supervisions'],['Suivi des actions','Action tracker']
] as const;
const fields=[
 ['business_id','need_date','site_id','planned_children','status'],
 ['business_id','service_date','site_id','present_children','served_children','status'],
 ['occurred_at','site_id','product_id','movement_type','quantity'],
 ['business_id','receipt_date','site_id','receipt_type','status'],
 ['business_id','planned_date','site_id','overall_score','status'],
 ['business_id','title','priority','due_date','status']
] as const;

export default function HgsfOperationsRegister({locale,datasets}:{locale:'fr'|'en';datasets:Row[][]}) {
 const [tab,setTab]=useState(0); const [query,setQuery]=useState(''); const en=locale==='en';
 const rows=useMemo(()=>{const q=query.toLowerCase().trim(); return (datasets[tab]||[]).filter(row=>!q||JSON.stringify(row).toLowerCase().includes(q));},[datasets,tab,query]);
 const columns=fields[tab];
 return <section className={'grid gap-5'}>
  <header className={'rounded-[24px] border border-emerald-100 bg-white p-6'}>
   <p className={'text-xs font-black uppercase tracking-[.18em] text-leaf'}>NutVitaGlobalis · HGSF</p>
   <h1 className={'mt-2 text-2xl font-black text-forest'}>{en?'HGSF operations register':'Registre de pilotage HGSF'}</h1>
   <p className={'mt-2 text-sm text-slate-500'}>{en?'Trace needs, stocks, services, receipts, supervision and corrective actions by operation and school.':'Suivez les besoins, stocks, services, receptions, supervisions et actions correctives par operation et par ecole.'}</p>
  </header>
  <nav className={'flex flex-wrap gap-2'}>{sections.map((label,index)=><button type={'button'} key={label[0]} onClick={()=>setTab(index)} className={`rounded-xl px-3 py-2 text-xs font-bold ${tab===index?'bg-forest text-white':'bg-white text-slate-600'}`}>{label[en?1:0]}</button>)}</nav>
  <div className={'rounded-[24px] border border-emerald-100 bg-white p-5'}>
   <div className={'mb-4 flex flex-wrap items-center justify-between gap-3'}><div><h2 className={'font-black text-forest'}>{sections[tab][en?1:0]}</h2><p className={'text-xs text-slate-400'}>{rows.length} {en?'record(s)':'enregistrement(s)'}</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={en?'Search...':'Rechercher...'} className={'admin-input max-w-xs'}/></div>
   <div className={'overflow-x-auto'}><table className={'min-w-full text-left text-sm'}><thead className={'bg-slate-50 text-xs uppercase text-slate-500'}><tr>{columns.map(col=><th key={col} className={'p-3'}>{col.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={String(row.id||index)} className={'border-t'}>{columns.map(col=><td key={col} className={'p-3'}>{String(row[col]??'—')}</td>)}</tr>)}</tbody></table></div>
   {!rows.length&&<p className={'p-8 text-center text-sm text-slate-400'}>{en?'No matching records.':'Aucun enregistrement correspondant.'}</p>}
  </div>
 </section>;
}
