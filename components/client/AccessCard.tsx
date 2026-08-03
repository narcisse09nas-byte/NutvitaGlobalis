"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
export default function AccessCard({email,name}:{email:string;name:string}){
 const[src,setSrc]=useState("");
 useEffect(()=>{if(!email)return;const target=`${location.origin}/connexion?identifiant=${encodeURIComponent(email)}&redirect=${encodeURIComponent("/espace-client")}`;QRCode.toDataURL(target,{width:260,margin:2,color:{dark:"#123c2f",light:"#ffffff"}}).then(setSrc)},[email]);
 if(!email)return null;
 return <section className="rounded-[2rem] border border-leaf/20 bg-white p-6 shadow-soft"><div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-black uppercase tracking-widest text-orange">Carte d'accès NutVitaGlobalis / Access card</p><h2 className="mt-2 text-2xl font-black">{name}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Scannez le QR code pour ouvrir le portail avec votre adresse préremplie. Votre mot de passe reste obligatoire; tous vos services actifs seront ensuite proposés.</p><p className="mt-3 break-all text-sm font-bold text-forest">{email}</p></div>{src&&<a href={src} download="carte-acces-nutvita.png" className="rounded-2xl bg-mint p-3 text-center"><img src={src} alt="QR code d'accès NutVitaGlobalis" className="mx-auto h-36 w-36"/><span className="mt-2 block text-xs font-black text-leaf">Télécharger / Download</span></a>}</div></section>
}
