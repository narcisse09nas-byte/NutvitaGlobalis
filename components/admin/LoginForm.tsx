"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasLocalAdminMode } from "@/lib/supabase/config";

export default function LoginForm() {
  const router=useRouter(); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setError("");const data=new FormData(e.currentTarget);try{if(hasLocalAdminMode()){const response=await fetch('/api/admin/local-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:String(data.get('email')),password:String(data.get('password'))})}),result=await response.json();if(!response.ok)throw new Error(result.message);localStorage.setItem('nutvita-local-admin','1');localStorage.setItem('nutvita-local-admin-email',result.email);router.push('/admin');router.refresh();return}const supabase=createClient();const {error}=await supabase.auth.signInWithPassword({email:String(data.get("email")),password:String(data.get("password"))});if(error)throw error;const logged=await fetch('/api/admin/login',{method:'POST'});if(!logged.ok){await supabase.auth.signOut();throw new Error('Ce compte ne dispose pas d un acces administrateur actif.')}router.refresh();}catch(err){setError(err instanceof Error?err.message:"Connexion impossible");setLoading(false)}}
  return <form onSubmit={submit} className="mt-8 grid gap-5"><label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input" placeholder="admin@nutvitaglobalis.com"/></label><label className="grid gap-2 text-sm font-bold">Mot de passe<input name="password" type="password" required minLength={6} className="admin-input"/></label>{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="btn-primary">{loading?"Connexion…":"Se connecter"}</button></form>;
}
