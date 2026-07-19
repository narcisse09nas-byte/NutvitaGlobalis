"use client";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { loadUserCertificates, saveCertificate } from "@/lib/certificate-storage";
import type { CertificateRecord } from "@/types/certification";

type CertificateContextValue = { certificates: CertificateRecord[]; isLoading: boolean; issueCertificate:(certificate:CertificateRecord)=>CertificateRecord; getCertificateById:(certificateId:string)=>CertificateRecord|null; refreshCertificates:()=>void };
export const CertificateContext=createContext<CertificateContextValue|null>(null);
export function CertificateProvider({children}:{children:React.ReactNode}){
 const{user}=useLocalAuth();const[certificates,setCertificates]=useState<CertificateRecord[]>([]),[isLoading,setIsLoading]=useState(true);
 const refreshCertificates=useCallback(()=>{
  if(!user){setCertificates([]);setIsLoading(false);return;}
  const local=loadUserCertificates(user.id);setCertificates(local);setIsLoading(false);
  void fetch("/api/certificates/me",{cache:"no-store"}).then(async response=>response.ok?response.json():{items:[]}).then((payload:{items?:CertificateRecord[]})=>{
   const server=payload.items??[];server.forEach(saveCertificate);setCertificates(Array.from(new Map([...server,...local].map(item=>[item.certificateNumber,item])).values()));
  }).catch(()=>undefined);
 },[user]);
 useEffect(()=>refreshCertificates(),[refreshCertificates]);
 const issueCertificate=useCallback((certificate:CertificateRecord)=>{const saved=saveCertificate(certificate);refreshCertificates();return saved},[refreshCertificates]);
 const getCertificateById=useCallback((certificateId:string)=>certificates.find(c=>c.id===certificateId||c.certificateNumber===certificateId)??null,[certificates]);
 const value=useMemo(()=>({certificates,isLoading,issueCertificate,getCertificateById,refreshCertificates}),[certificates,isLoading,issueCertificate,getCertificateById,refreshCertificates]);
 return <CertificateContext.Provider value={value}>{children}</CertificateContext.Provider>;
}