'use client';
import {FormEvent,useState} from 'react';
import {Pencil,Save,X} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';
const conditions=[['diabetes','Diabète','Diabetes'],['hypertension','Hypertension','Hypertension'],['obesity','Obésité','Obesity'],['dyslipidemia','Dyslipidémie','Dyslipidemia'],['kidney_disease','Maladie rénale','Kidney disease']] as const;
export default function ClientProfileForm({userId,email,initial,locale='fr'}:{userId:string;email:string;initial:Record<string,any>;locale?:'fr'|'en'}){
 const en=locale==='en',t=(fr:string,enText:string)=>en?enText:fr,[editing,setEditing]=useState(false),[message,setMessage]=useState('');
 const initialData={...initial,id:userId,email:initial.email||email,medical_history:initial.medical_history||{}};
 const[data,setData]=useState<Record<string,any>>(initialData);
 const update=(key:string,value:unknown)=>setData(current=>({...current,[key]:value}));
 async function save(event:FormEvent){event.preventDefault();const{error}=await createClient().from('client_profiles').upsert(data);setMessage(error?error.message:t('Profil enregistré.','Profile saved.'));if(!error)setEditing(false)}
 function cancel(){setData(initialData);setEditing(false);setMessage('')}
 return <form onSubmit={save} className='grid gap-6 rounded-2xl border bg-white p-6 md:grid-cols-2'>
  <div className='flex items-center justify-between md:col-span-2'><div><h2 className='text-xl font-black text-forest'>{t('Informations du profil','Profile information')}</h2><p className='mt-1 text-sm text-slate-500'>{editing?t('Modifiez uniquement les informations nécessaires.','Update only the required information.'):t('Le profil est verrouillé pour éviter les modifications accidentelles.','The profile is locked to prevent accidental changes.')}</p></div>{!editing&&<button type='button' onClick={()=>setEditing(true)} className='btn-secondary'><Pencil className='mr-2 h-4'/>{t('Éditer le profil','Edit profile')}</button>}</div>
  <Text disabled={!editing} label={t('Nom complet','Full name')} value={data.full_name} set={value=>update('full_name',value)}/>
  <label className='grid gap-2 text-sm font-bold'>{t('Sexe','Sex')}<select disabled={!editing} className='admin-input disabled:bg-slate-100' value={data.sex||''} onChange={event=>update('sex',event.target.value)}><option value=''>{t('Non renseigné','Not provided')}</option><option value='Femme'>{t('Femme','Female')}</option><option value='Homme'>{t('Homme','Male')}</option><option value='Autre'>{t('Autre','Other')}</option></select></label>
  {([['birth_date',t('Date de naissance','Date of birth'),'date'],['profession',t('Profession','Occupation'),'text'],['city',t('Ville','City'),'text'],['phone',t('Téléphone','Phone'),'text'],['email','Email','email'],['address',t('Adresse','Address'),'text']] as const).map(([key,label,type])=><Text key={key} disabled={!editing} label={label} type={type} value={data[key]} set={value=>update(key,value)}/>)}
  <div className='md:col-span-2'><h3 className='font-black'>{t('Antécédents médicaux','Medical history')}</h3><div className='mt-3 flex flex-wrap gap-3'>{conditions.map(([key,fr,enText])=><label key={key} className='flex gap-2 rounded-full border px-4 py-2 text-sm'><input disabled={!editing} type='checkbox' checked={Boolean(data.medical_history[key])} onChange={event=>update('medical_history',{...data.medical_history,[key]:event.target.checked})}/>{en?enText:fr}</label>)}</div></div>
  <Area disabled={!editing} label={t('Allergies','Allergies')} value={data.allergies} set={value=>update('allergies',value)}/><Area disabled={!editing} label={t('Autres pathologies','Other conditions')} value={data.other_conditions} set={value=>update('other_conditions',value)}/>
  {message&&<p className='rounded-xl bg-mint p-4 font-bold text-forest md:col-span-2'>{message}</p>}
  {editing&&<div className='flex gap-3 md:col-span-2'><button className='btn-primary'><Save className='mr-2 h-4'/>{t('Enregistrer','Save')}</button><button type='button' onClick={cancel} className='btn-secondary'><X className='mr-2 h-4'/>{t('Annuler','Cancel')}</button></div>}
 </form>;
}
function Text({label,value,set,type='text',disabled}:{label:string;value:unknown;set:(value:string)=>void;type?:string;disabled:boolean}){return <label className='grid gap-2 text-sm font-bold'>{label}<input disabled={disabled} type={type} className='admin-input disabled:bg-slate-100' value={String(value||'')} onChange={event=>set(event.target.value)}/></label>}
function Area({label,value,set,disabled}:{label:string;value:unknown;set:(value:string)=>void;disabled:boolean}){return <label className='grid gap-2 text-sm font-bold'>{label}<textarea disabled={disabled} className='admin-input disabled:bg-slate-100' value={String(value||'')} onChange={event=>set(event.target.value)}/></label>}
