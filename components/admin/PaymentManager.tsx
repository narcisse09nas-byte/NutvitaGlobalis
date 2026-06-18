"use client";

import {FormEvent,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Row=Record<string,any>;

const emptyAccount={
  label:"",
  method:"mobile_money",
  provider_name:"MTN MoMo",
  account_name:"NutVitaGlobalis",
  account_number:"",
  bank_name:"",
  iban:"",
  swift_bic:"",
  country_code:"CM",
  currency:"XAF",
  instructions:"",
  active:true,
  sort_order:100,
};

export default function PaymentManager({initial,accounts:initialAccounts}:{initial:Row[];accounts:Row[]}){
  const [items,setItems]=useState(initial);
  const [accounts,setAccounts]=useState(initialAccounts);
  const [accountDraft,setAccountDraft]=useState<Row>(emptyAccount);
  const [editingAccount,setEditingAccount]=useState<Row|null>(null);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("");
  const [service,setService]=useState("");
  const [message,setMessage]=useState("");
  const rows=useMemo(()=>items.filter(row=>{
    const client=`${row.client_profiles?.full_name||""} ${row.client_profiles?.email||""}`.toLowerCase();
    return(!query||client.includes(query.toLowerCase()))&&(!status||row.status===status)&&(!service||row.purchase_type===service);
  }),[items,query,status,service]);
  const draft=editingAccount||accountDraft;
  const isMobile=draft.method==="mobile_money";

  function updateDraft(name:string,value:unknown){
    const next={...draft,[name]:value};
    if(name==="method"&&value==="mobile_money"){
      next.bank_name="";
      next.iban="";
      next.swift_bic="";
      if(!next.provider_name)next.provider_name="MTN MoMo";
    }
    if(editingAccount)setEditingAccount(next);
    else setAccountDraft(next);
  }

  function resetForm(){
    setEditingAccount(null);
    setAccountDraft(emptyAccount);
  }

  function exportCsv(){
    const csv=["Client,Email,Service,Produit,HT,Taxe,TTC,Moyen,Statut,Date",...rows.map(row=>[row.client_profiles?.full_name,row.client_profiles?.email,row.purchase_type,row.product_name,row.price_excluding_tax,row.tax_amount,row.total_including_tax,row.provider,row.status,new Date(row.created_at).toISOString()].map(value=>`"${String(value??"").replaceAll('"','""')}"`).join(","))].join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;
    a.download="paiements-nutvita.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveAccount(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const payload={
      label:String(draft.label||"").trim(),
      method:String(draft.method),
      provider_name:String(draft.provider_name||"").trim(),
      account_name:String(draft.account_name||"").trim(),
      account_number:String(draft.account_number||"").trim(),
      bank_name:isMobile?"":String(draft.bank_name||"").trim(),
      iban:isMobile?"":String(draft.iban||"").trim(),
      swift_bic:isMobile?"":String(draft.swift_bic||"").trim(),
      country_code:String(draft.country_code||"CM").trim().toUpperCase(),
      currency:String(draft.currency||"XAF").trim().toUpperCase(),
      instructions:String(draft.instructions||"").trim(),
      active:Boolean(draft.active),
      sort_order:Number(draft.sort_order||100),
    };
    if(!payload.label||!payload.provider_name||!payload.account_name||!payload.account_number){
      setMessage("Veuillez renseigner le libelle, le fournisseur, le titulaire et le numero.");
      return;
    }
    const client=createClient();
    const query=editingAccount
      ? client.from("payment_accounts").update(payload).eq("id",editingAccount.id).select().single()
      : client.from("payment_accounts").insert(payload).select().single();
    const {data,error}=await query;
    if(error){
      setMessage(error.message);
      return;
    }
    setAccounts(editingAccount?accounts.map(item=>item.id===data.id?data:item):[...accounts,data]);
    setMessage(editingAccount?"Compte de paiement modifie.":"Compte de paiement ajoute.");
    resetForm();
  }

  async function toggleAccount(row:Row){
    const {data,error}=await createClient().from("payment_accounts").update({active:!row.active}).eq("id",row.id).select().single();
    if(error)setMessage(error.message);
    else setAccounts(accounts.map(item=>item.id===row.id?data:item));
  }

  async function deleteAccount(row:Row){
    if(!confirm(`Supprimer le compte "${row.label}" ?`))return;
    const {error}=await createClient().from("payment_accounts").delete().eq("id",row.id);
    if(error)setMessage(error.message);
    else{
      setAccounts(accounts.filter(item=>item.id!==row.id));
      if(editingAccount?.id===row.id)resetForm();
      setMessage("Compte de paiement supprime.");
    }
  }

  async function openProof(path:string){
    const {data,error}=await createClient().storage.from("document-vault").createSignedUrl(path,180);
    if(error)setMessage(error.message);
    else window.open(data.signedUrl,"_blank");
  }

  async function review(row:Row,action:"approve"|"reject"){
    const notes=prompt(action==="approve"?"Note de validation":"Motif du rejet")||"";
    const response=await fetch("/api/admin/payments/manual-review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payment_id:row.id,action,notes})});
    const result=await response.json();
    if(!response.ok){
      setMessage(result.message);
      return;
    }
    setItems(items.map(item=>item.id===row.id?{...item,status:action==="approve"?"succeeded":"failed",manual_review_notes:notes}:item));
    setMessage(action==="approve"?"Paiement valide et acces active.":"Paiement rejete.");
  }

  return <div className="grid gap-7">
    {message&&<p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    <section className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Comptes de paiement manuel</h2>
          <p className="mt-1 text-sm text-slate-500">Les champs changent selon le mode choisi. "CM" est le code pays Cameroun; "ordre d'affichage" controle la position du compte dans la liste client.</p>
        </div>
        {editingAccount&&<button onClick={resetForm} className="btn-secondary px-4 py-2">Annuler la modification</button>}
      </div>
      <form onSubmit={saveAccount} className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">Mode de paiement
          <select className="admin-input" value={draft.method} onChange={e=>updateDraft("method",e.target.value)}>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Virement bancaire</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">Libelle public
          <input required className="admin-input" value={draft.label} onChange={e=>updateDraft("label",e.target.value)} placeholder={isMobile?"Ex. MTN MoMo":"Ex. Compte bancaire Afriland"}/>
        </label>
        <label className="grid gap-2 text-sm font-bold">{isMobile?"Operateur":"Nom de la banque ou fournisseur"}
          <input required className="admin-input" value={draft.provider_name} onChange={e=>updateDraft("provider_name",e.target.value)} placeholder={isMobile?"MTN MoMo, Orange Money":"Banque, microfinance..."}/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Titulaire du compte
          <input required className="admin-input" value={draft.account_name} onChange={e=>updateDraft("account_name",e.target.value)} placeholder="NutVitaGlobalis"/>
        </label>
        <label className="grid gap-2 text-sm font-bold">{isMobile?"Numero Mobile Money":"Numero de compte"}
          <input required className="admin-input" value={draft.account_number} onChange={e=>updateDraft("account_number",e.target.value)} placeholder={isMobile?"Ex. +237 6XX XXX XXX":"Numero de compte bancaire"}/>
        </label>
        {!isMobile&&<>
          <label className="grid gap-2 text-sm font-bold">Banque
            <input className="admin-input" value={draft.bank_name||""} onChange={e=>updateDraft("bank_name",e.target.value)} placeholder="Nom officiel de la banque"/>
          </label>
          <label className="grid gap-2 text-sm font-bold">IBAN / RIB
            <input className="admin-input" value={draft.iban||""} onChange={e=>updateDraft("iban",e.target.value)} placeholder="RIB ou IBAN si disponible"/>
          </label>
          <label className="grid gap-2 text-sm font-bold">SWIFT / BIC
            <input className="admin-input" value={draft.swift_bic||""} onChange={e=>updateDraft("swift_bic",e.target.value)} placeholder="Code banque international"/>
          </label>
        </>}
        <label className="grid gap-2 text-sm font-bold">Devise
          <input className="admin-input" value={draft.currency} onChange={e=>updateDraft("currency",e.target.value)} placeholder="XAF"/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Pays du compte
          <input className="admin-input" value={draft.country_code} onChange={e=>updateDraft("country_code",e.target.value)} placeholder="CM"/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Ordre d'affichage
          <input type="number" className="admin-input" value={draft.sort_order} onChange={e=>updateDraft("sort_order",Number(e.target.value))}/>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={Boolean(draft.active)} onChange={e=>updateDraft("active",e.target.checked)}/>Actif</label>
        <textarea className="admin-input md:col-span-3" value={draft.instructions||""} onChange={e=>updateDraft("instructions",e.target.value)} placeholder="Instructions visibles uniquement aux clients connectes apres creation du paiement."/>
        <button className="btn-primary md:col-span-3 md:w-fit">{editingAccount?"Modifier le compte":"Ajouter le compte"}</button>
      </form>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{accounts.map(account=><div key={account.id} className="rounded-xl border p-4">
        <div className="flex justify-between gap-3"><b>{account.label}</b><span className={`rounded-full px-2 py-1 text-xs font-bold ${account.active?"bg-mint text-leaf":"bg-slate-100 text-slate-500"}`}>{account.active?"Actif":"Inactif"}</span></div>
        <p className="mt-1 text-sm text-slate-500">{account.provider_name} - {account.account_number}</p>
        <p className="text-xs text-slate-400">{account.method} - {account.currency} - ordre {account.sort_order}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
          <button onClick={()=>setEditingAccount(account)} className="text-leaf">Modifier</button>
          <button onClick={()=>toggleAccount(account)} className="text-orange">{account.active?"Desactiver":"Activer"}</button>
          <button onClick={()=>deleteAccount(account)} className="text-red-600">Supprimer</button>
        </div>
      </div>)}</div>
    </section>

    <div>
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
        <input className="admin-input" placeholder="Rechercher un client..." value={query} onChange={e=>setQuery(e.target.value)}/>
        <select className="admin-input" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tous les statuts</option>{["pending","succeeded","failed","cancelled","refunded"].map(value=><option key={value}>{value}</option>)}</select>
        <select className="admin-input" value={service} onChange={e=>setService(e.target.value)}><option value="">Tous les services</option><option value="formation">Formation</option><option value="consultation">Consultation</option><option value="subscription">Abonnement</option></select>
        <button onClick={exportCsv} className="btn-primary">Exporter CSV</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1250px] text-left text-sm"><thead><tr className="border-b bg-slate-50"><th className="p-4">Client</th><th className="p-4">Service</th><th className="p-4">TTC</th><th className="p-4">Moyen</th><th className="p-4">Reference</th><th className="p-4">Preuve</th><th className="p-4">Statut</th><th className="p-4">Date</th><th className="p-4">Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-b"><td className="p-4"><b>{row.client_profiles?.full_name||"Client"}</b><p className="text-xs text-slate-400">{row.client_profiles?.email}</p></td><td className="p-4">{row.product_name||row.purchase_type}</td><td className="p-4 font-bold">{Number(row.total_including_tax||row.amount).toLocaleString("fr-FR")} {row.currency}</td><td className="p-4">{row.provider}{row.manual_method?` / ${row.manual_method}`:""}</td><td className="p-4"><b>{row.checkout_reference}</b><p className="text-xs text-slate-400">{row.proof_reference}</p></td><td className="p-4">{row.proof_path?<button onClick={()=>openProof(row.proof_path)} className="font-bold text-leaf">Voir recu</button>:<span className="text-slate-400">Aucune</span>}</td><td className="p-4"><span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{row.status}</span></td><td className="p-4">{new Date(row.created_at).toLocaleString("fr-FR")}</td><td className="p-4">{row.provider==="manual"&&row.status==="pending"?<div className="flex gap-2"><button onClick={()=>review(row,"approve")} className="btn-secondary px-3 py-2">Valider</button><button onClick={()=>review(row,"reject")} className="btn-secondary px-3 py-2">Rejeter</button></div>:<span className="text-slate-400">-</span>}</td></tr>)}{!rows.length&&<tr><td colSpan={9} className="p-8 text-center text-slate-400">Aucun paiement.</td></tr>}</tbody></table></div>
    </div>
  </div>;
}
