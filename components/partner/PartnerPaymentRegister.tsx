"use client";

import {useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Row=Record<string,any>;

export default function PartnerPaymentRegister({initial,userId}:{initial:Row[];userId:string}){
  const [rows,setRows]=useState(initial),[query,setQuery]=useState(""),[status,setStatus]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState(""),[commenting,setCommenting]=useState<Row|null>(null),[comment,setComment]=useState(""),[message,setMessage]=useState("");
  const filtered=useMemo(()=>rows.filter(row=>{
    const haystack=[row.payment_reference,row.source_reference,row.finance_comment,row.status].join(" ").toLowerCase();
    const date=String(row.payment_date||row.created_at||"").slice(0,10);
    return haystack.includes(query.toLowerCase())&&(!status||row.status===status)&&(!from||date>=from)&&(!to||date<=to);
  }),[rows,query,status,from,to]);
  async function addComment(){
    if(!commenting||!comment.trim())return;
    const client=createClient();
    const {data,error}=await client.from("partner_payment_comments").insert({payment_id:commenting.id,author_id:userId,comment:comment.trim()}).select("*").single();
    if(error){setMessage(error.message);return}
    setRows(current=>current.map(row=>row.id===commenting.id?{...row,partner_payment_comments:[...(row.partner_payment_comments||[]),data]}:row));
    setComment("");setCommenting(null);setMessage("Commentaire ajouté au suivi du paiement.");
  }
  return <div className="grid gap-5">
    <div className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4">
      <input className="admin-input" placeholder="Référence, statut, commentaire…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <select className="admin-input" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tous les statuts</option>{["draft","pending","approved","paid","cancelled"].map(value=><option key={value}>{value}</option>)}</select>
      <input className="admin-input" type="date" value={from} onChange={e=>setFrom(e.target.value)}/>
      <input className="admin-input" type="date" value={to} onChange={e=>setTo(e.target.value)}/>
    </div>
    {message&&<p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Référence</th><th className="p-4">Période</th><th className="p-4">Revenu brut</th><th className="p-4">Montant dû</th><th className="p-4">Montant payé</th><th className="p-4">Reliquat</th><th className="p-4">Statut</th><th className="p-4">Preuves</th><th className="p-4">Commentaire Finance</th><th className="p-4">Action</th></tr></thead>
        <tbody>{filtered.map(row=><tr key={row.id} className="border-t align-top"><td className="p-4 font-bold text-forest">{row.payment_reference}</td><td className="p-4">{[row.period_start,row.period_end].filter(Boolean).join(" – ")||"—"}</td><td className="p-4">{money(row.gross_revenue,row.currency)}</td><td className="p-4">{money(row.amount_due,row.currency)}</td><td className="p-4">{money(row.amount_paid,row.currency)}</td><td className="p-4 font-bold">{money(Math.max(0,Number(row.amount_due||0)-Number(row.amount_paid||0)),row.currency)}</td><td className="p-4"><span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{row.status}</span></td><td className="p-4">{(row.proofs||[]).map((proof:any)=><span key={proof.path} className="mr-2 text-xs font-bold text-leaf">{proof.name}</span>)}</td><td className="p-4"><p>{row.finance_comment||"—"}</p>{(row.partner_payment_comments||[]).map((item:any)=><p key={item.id} className="mt-2 rounded-lg bg-slate-50 p-2 text-xs">{item.comment}</p>)}</td><td className="p-4"><button onClick={()=>setCommenting(row)} className="btn-secondary px-3 py-2">Ajouter un commentaire</button></td></tr>)}{!filtered.length&&<tr><td colSpan={10} className="p-10 text-center text-slate-400">Aucun paiement correspondant.</td></tr>}</tbody>
      </table>
    </div>
    {commenting&&<div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/60 p-4"><div className="w-full max-w-xl rounded-[2rem] bg-forest p-4 shadow-2xl"><div className="rounded-[1.4rem] bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-black text-forest">Commenter le paiement</h2><button onClick={()=>setCommenting(null)} className="text-2xl">×</button></div><p className="mt-2 text-sm text-slate-500">{commenting.payment_reference}</p><textarea rows={6} className="admin-input mt-5" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Votre commentaire…"/><div className="mt-5 flex justify-end"><button onClick={addComment} className="btn-primary">Enregistrer le commentaire</button></div></div></div></div>}
  </div>;
}

function money(value:unknown,currency="XAF"){return `${Number(value||0).toLocaleString("fr-FR")} ${currency}`}
