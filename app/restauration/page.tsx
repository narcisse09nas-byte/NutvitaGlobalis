import Image from "next/image";
import Link from "next/link";
import { BuildingStorefrontIcon, BuildingOffice2Icon, HeartIcon, MapPinIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";

export const metadata = { title: "Restauration NutVitaGlobalis" };
export const revalidate = 60;

export default async function CateringPage() {
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: menus }, { data: locations }, { data: { user } }] = await Promise.all([
    supabase.from("catering_menus").select("*").eq("published", true).gte("available_date", today).order("available_date").order("city"),
    supabase.from("catering_locations").select("*").eq("active", true).order("city").order("name_fr"),
    supabase.auth.getUser(),
  ]);
  const groups = [
    { key: "central_kitchen", fr: "Cuisines centrales", en: "Central kitchens", icon: BuildingOffice2Icon },
    { key: "sale_point", fr: "Points de vente", en: "Sales outlets", icon: BuildingStorefrontIcon },
    { key: "partner_hospital", fr: "Hôpitaux partenaires", en: "Partner hospitals", icon: HeartIcon },
  ] as const;

  return <main>
    <section className="bg-forest py-16 text-white"><div className="container-site">
      <p className="text-sm font-black uppercase tracking-[.2em] text-orange">{en ? "Healthy catering" : "Restauration saine"}</p>
      <h1 className="mt-4 max-w-4xl text-5xl font-black text-white">{en ? "Today’s menus, prepared with care" : "Les menus du jour, préparés avec soin"}</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-white/75">{en ? "Browse menus available in your city, then sign in to request delivery." : "Découvrez les menus disponibles dans votre ville, puis connectez-vous pour demander une livraison."}</p>
    </div></section>

    <section className="section"><div className="container-site">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow">{en ? "Photo menu" : "Album des plats"}</span><h2 className="mt-3 text-4xl font-black">{en ? "Available menus" : "Menus disponibles"}</h2></div>
        <Link href={user ? "/restauration/commander" : "/connexion?redirect=%2Frestauration%2Fcommander"} className="btn-primary">{en ? "Place an order" : "Passer une commande"}</Link>
      </div>
      {menus?.length ? <div className="mt-9 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{menus.map((menu:any) => <article key={menu.id} className="card overflow-hidden">
        <div className="relative aspect-[4/3] bg-mint">{menu.image_url ? <Image src={menu.image_url} alt={en ? menu.name_en || menu.name_fr : menu.name_fr} fill className="object-cover"/> : <div className="grid h-full place-items-center text-6xl">🍲</div>}</div>
        <div className="p-6"><div className="flex items-center justify-between gap-3"><h3 className="text-2xl font-black">{en ? menu.name_en || menu.name_fr : menu.name_fr}</h3><span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-forest">{menu.city}</span></div>
          <p className="mt-3 leading-7 text-slate-600">{en ? menu.description_en || menu.description_fr : menu.description_fr}</p>
          <p className="mt-4 flex items-center gap-2 text-sm font-bold text-leaf"><MapPinIcon className="h-5"/>{menu.city} · {new Date(`${menu.available_date}T12:00:00`).toLocaleDateString(en ? "en-GB" : "fr-FR")}</p>
        </div></article>)}</div> : <div className="mt-8 rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500">{en ? "No menu has been published for today yet." : "Aucun menu n’a encore été publié pour aujourd’hui."}</div>}
    </div></section>

    <section className="section bg-[#f3eee5]"><div className="container-site grid gap-8">
      {groups.map(group => { const Icon=group.icon; const rows=(locations||[]).filter((item:any)=>item.kind===group.key); return <div key={group.key}><h2 className="flex items-center gap-3 text-3xl font-black"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-leaf"><Icon className="h-6"/></span>{en ? group.en : group.fr}</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{rows.length ? rows.map((item:any)=><article key={item.id} className="rounded-3xl bg-white p-6 shadow-soft"><h3 className="text-xl font-black">{en ? item.name_en || item.name_fr : item.name_fr}</h3><p className="mt-3 flex gap-2 text-sm text-slate-600"><MapPinIcon className="h-5 shrink-0 text-orange"/>{[item.city,item.address].filter(Boolean).join(" · ")}</p>{item.phone&&<a href={`tel:${item.phone}`} className="mt-3 flex gap-2 text-sm font-black text-leaf"><PhoneIcon className="h-5"/>{item.phone}</a>}</article>) : <p className="text-slate-500">{en ? "Information coming soon." : "Informations bientôt disponibles."}</p>}</div>
      </div>})}
    </div></section>
  </main>;
}
