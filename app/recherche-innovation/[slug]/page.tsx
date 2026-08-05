import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExpertisePremiumDetail from "@/components/ExpertisePremiumDetail";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getResearchSettings } from "@/lib/research-innovation";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const [{slug},data,locale]=await Promise.all([params,getResearchSettings(),getCurrentLocale()]);
 const item=data.expertises.find(x=>x.slug===slug&&x.status==="published"),english=locale==="en";
 return item?{title:english?item.seo_title_en:item.seo_title,description:english?item.seo_description_en:item.seo_description,openGraph:{images:[item.image_url]}}:{};
}
export default async function ExpertiseDetail({params}:{params:Promise<{slug:string}>}){
 const [{slug},data,locale]=await Promise.all([params,getResearchSettings(),getCurrentLocale()]);
 const item=data.expertises.find(x=>x.slug===slug&&x.status==="published");
 if(!item)notFound();
 return <ExpertisePremiumDetail item={item} data={data} english={locale==="en"}/>;
}