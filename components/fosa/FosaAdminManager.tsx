"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;
const roles = [["organization_admin","Administrateur FOSA"],["creator","Createur"],["verifier","Verificateur"],["validator","Validateur"]];

export default function FosaAdminManager({ organizationId, initialFacilities, initialMembers, assignments }: { organizationId: string; initialFacilities: Row[]; initialMembers: Row[]; assignments: Row[] }) {
  const [facilities,setFacilities]=useState(initialFacilities),[members,setMembers]=useState(initialMembers),[message,setMessage]=useState("");
  async function createFacility(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget,body=Object.fromEntries(new FormData(form));
    const {data,error}=await createClient().from("fosa_facilities").insert({...body,organization_id:organizationId}).select().single();
    if(error)setMessage(error.message);else{setFacilities([...facilities,data]);form.reset();setMessage("Formation sanitaire ajoutee.");}
  }
  async function createStaff(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget,fd=new FormData(form),body={...Object.fromEntries(fd),facility_ids:fd.getAll("facility_ids")};
    const response=await fetch("/api/fosa/staff",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),result=await response.json();
    if(!response.ok)setMessage(result.message);else{setMembers([...members,result.member]);form.reset();setMessage("Compte cree. Un lien de definition du mot de passe a ete envoye par email.");}
  }
  return <div className="grid gap-8">
    <form onSubmit={createFacility} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><h2 className="text-xl font-black md:col-span-2">Ajouter une formation sanitaire</h2><label className="grid gap-2 text-sm font-bold">Nom<input name="name" required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Code unique<input name="code" required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Pays<input name="country" defaultValue="Cameroun" className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Region<input name="region" className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">District de sante<input name="health_district" className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Aire de sante<input name="health_area" className="admin-input"/></label><button className="btn-primary justify-self-start md:col-span-2">Ajouter la FOSA</button></form>
    <form onSubmit={createStaff} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><h2 className="text-xl font-black md:col-span-2">Creer un compte staff</h2><label className="grid gap-2 text-sm font-bold">Nom complet<input name="full_name" required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Mot de passe initial<input name="temporary_password" type="password" minLength={8} required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Role<select name="role" className="admin-input">{roles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><fieldset className="md:col-span-2"><legend className="mb-3 text-sm font-bold">FOSA autorisees</legend><div className="grid gap-2 sm:grid-cols-2">{facilities.map(facility=><label key={facility.id} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" name="facility_ids" value={facility.id}/>{facility.name}</label>)}</div></fieldset><button className="btn-primary justify-self-start md:col-span-2">Creer et envoyer le lien</button></form>
    {message&&<p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    <section><h2 className="mb-4 text-2xl font-black">Comptes et acces</h2><div className="grid gap-3">{members.map(member=><article key={member.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-4"><div><b>{member.full_name}</b><p className="text-sm text-slate-500">{member.email}</p><p className="mt-1 text-xs uppercase text-leaf">{member.role.replaceAll("_"," ")} - {member.status}</p></div><div className="text-right text-xs text-slate-500">{member.role==="organization_admin"?"Toutes les FOSA":assignments.filter(item=>item.member_id===member.id).map(item=>facilities.find(f=>f.id===item.facility_id)?.name).filter(Boolean).join(", ")||"Aucune FOSA affectee"}</div></div></article>)}</div></section>
  </div>;
}
