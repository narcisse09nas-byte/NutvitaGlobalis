import Link from "next/link";
import {cookies} from "next/headers";
import {NewspaperIcon,AcademicCapIcon,ChatBubbleLeftRightIcon,EnvelopeIcon,PlusIcon,UserPlusIcon} from "@heroicons/react/24/outline";
import AdminShell from "@/components/admin/AdminShell";
import LoginForm from "@/components/admin/LoginForm";
import {hasLocalAdminMode,hasSupabaseConfig} from "@/lib/supabase/config";
import {createLocalClient,localAdmin} from "@/lib/supabase/local";
import {createClient} from "@/lib/supabase/server";

export default async function AdminPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const params=await searchParams;
  if(hasLocalAdminMode()&&!hasSupabaseConfig()){
    const cookieStore=await cookies();
    if(cookieStore.get('nutvita_local_admin')?.value!=='1')return <LoginScreen local/>;
    const admin={...localAdmin,email:cookieStore.get('nutvita_local_admin_email')?.value||localAdmin.email,full_name:process.env.LOCAL_ADMIN_NAME||localAdmin.full_name};
    return <Dashboard supabase={createLocalClient()} admin={admin} local/>;
  }
  if(!hasSupabaseConfig())return <LoginScreen setup/>;
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)return <LoginScreen unauthorized={params.unauthorized==='1'}/>;
  const {data:admin}=await supabase.from('admin_users').select('full_name,email').eq('id',user.id).eq('active',true).maybeSingle();
  if(!admin)return <LoginScreen unauthorized/>;
  return <Dashboard supabase={supabase} admin={admin}/>;
}

async function Dashboard({supabase,admin,local=false}:{supabase:any;admin:Record<string,any>;local?:boolean}){
  const [published,drafts,formations,requests,subscribers,candidates]=await Promise.all([
    supabase.from('articles').select('*',{count:'exact',head:true}).eq('status','published'),
    supabase.from('articles').select('*',{count:'exact',head:true}).eq('status','draft'),
    supabase.from('formations').select('*',{count:'exact',head:true}),
    supabase.from('teleconseil_requests').select('*',{count:'exact',head:true}),
    supabase.from('newsletter_subscribers').select('*',{count:'exact',head:true}).eq('active',true),
    supabase.from('recruitment_applications').select('*',{count:'exact',head:true}),
  ]);
  const stats=[["Articles publies",published.count||0,NewspaperIcon],["Brouillons",drafts.count||0,NewspaperIcon],["Formations",formations.count||0,AcademicCapIcon],["Demandes teleconseil",requests.count||0,ChatBubbleLeftRightIcon],["Abonnes newsletter",subscribers.count||0,EnvelopeIcon],["Candidatures",candidates.count||0,UserPlusIcon]] as const;
  return <AdminShell name={admin.full_name||admin.email}><div className="mb-8"><h1 className="text-3xl font-black">Tableau de bord</h1><p className="mt-2 text-slate-500">Vue d ensemble des contenus NutVitaGlobalis.</p>{local&&<p className="mt-4 rounded-xl bg-orange/10 p-4 text-sm font-bold text-orange">Mode local actif : les contenus de test sont conserves dans ce navigateur. Supabase pourra etre connecte plus tard.</p>}</div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">{stats.map(([label,value,Icon])=><div key={label} className="rounded-2xl border bg-white p-5"><Icon className="h-7 text-leaf"/><p className="mt-5 text-3xl font-black text-forest">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>)}</div><div className="mt-8 rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Actions rapides</h2><div className="mt-5 flex flex-wrap gap-3">{[["/admin/articles","Ajouter un article"],["/admin/formations","Ajouter une formation"],["/admin/ressources-premium","Ajouter une ressource premium"],["/admin/accueil","Modifier la page d accueil"]].map(([href,label])=><Link key={href} href={href} className="btn-secondary"><PlusIcon className="mr-2 h-4"/>{label}</Link>)}</div></div></AdminShell>;
}

function LoginScreen({setup=false,unauthorized=false,local=false}:{setup?:boolean;unauthorized?:boolean;local?:boolean}){return <main className="grid min-h-screen place-items-center bg-forest p-5"><div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"><Link href="/" className="text-xl font-black text-forest">NutVita<span className="text-orange">Globalis</span></Link><h1 className="mt-8 text-3xl font-black">Administration</h1><p className="mt-2 text-slate-500">Connectez-vous avec votre compte autorise.</p>{local&&<div className="mt-5 rounded-xl bg-mint p-4 text-sm"><b>Mode local actif</b><p className="mt-2">Emails : {(process.env.LOCAL_ADMIN_EMAILS||'pauln.zebaze@gmail.com,contact@nutvitaglobalis.com').split(',').join(' ou ')}</p><p>Mot de passe : defini dans <code>.env.local</code></p></div>}{setup&&<p className="mt-5 rounded-xl bg-orange/10 p-4 text-sm text-orange">Supabase n est pas configure et le mode local est desactive.</p>}{unauthorized&&<p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">Ce compte n est pas autorise.</p>}{!setup&&<LoginForm/>}</div></main>}
