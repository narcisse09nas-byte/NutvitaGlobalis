import type { Metadata } from "next";
import ResearchPremium from "@/components/ResearchPremium";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getResearchSettings } from "@/lib/research-innovation";
export async function generateMetadata():Promise<Metadata>{const[d,locale]=await Promise.all([getResearchSettings(),getCurrentLocale()]),en=locale==="en";return{title:en?d.seo_title_en:d.seo_title,description:en?d.seo_description_en:d.seo_description,openGraph:{title:en?d.seo_title_en:d.seo_title,description:en?d.seo_description_en:d.seo_description,images:d.og_image_url?[d.og_image_url]:[]},twitter:{card:d.twitter_card==="summary"?"summary":"summary_large_image",title:en?d.seo_title_en:d.seo_title,description:en?d.seo_description_en:d.seo_description,images:d.og_image_url?[d.og_image_url]:[]}}}
export default async function Page(){const[data,locale]=await Promise.all([getResearchSettings(),getCurrentLocale()]);return <ResearchPremium data={data} english={locale==="en"}/>}
