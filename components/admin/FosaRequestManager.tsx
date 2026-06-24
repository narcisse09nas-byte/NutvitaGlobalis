"use client";

import { useState } from "react";

type Row=Record<string,any>;
export default function FosaRequestManager({initial}:{initial:Row[]}){
  const [rows,setRows]=useState(initial),[message,setMessage]=useState("");
  async function decide(row:Row,action:"approve"|"reject"){
    const notes=action==="reject"?prompt("Motif ou precision a communiquer au demandeur")||"":prompt("Note administrative facultative")||"";
    const response=await fetch("/api/admin/fosa",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:row.id,action,notes})}),result=await response.json();
    if(!response.ok){setMessage(result.message);return}
    setRows(rows.map(item=>item.id===row.id?{...item,status:action==="approve"?"approved":"rejected",admin_notes:notes}:item));
    setMessage(action==="approve"?"Acces FOSA approuve.":"Demande rejetee.");
  }
  return <div className="grid gap-5">{message&&<p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}{rows.map(row=><article key={row.id} className="rounded-2xl border bg-white p-6"><div className="flex flex-wrap justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-widest text-leaf">{row.status}</p><h2 className="mt-2 text-xl font-black">{row.name}</h2><p className="mt-1 text-sm text-slate-500">{row.contact_name} - {row.contact_email} - {row.contact_phone||"sans telephone"}</p><p className="mt-3 text-sm"><b>{row.requested_facility_count}</b> formation(s) sanitaire(s) et <b>{row.requested_staff_count}</b> compte(s) staff demandes.</p>{row.admin_notes&&<p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">{row.admin_notes}</p>}</div>{row.status==="pending"&&<div className="flex gap-2"><button onClick={()=>decide(row,"approve")} className="btn-primary px-4 py-2">Valider</button><button onClick={()=>decide(row,"reject")} className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">Rejeter</button></div>}</div></article>)}{!rows.length&&<p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucune demande FOSA.</p>}</div>;
}
