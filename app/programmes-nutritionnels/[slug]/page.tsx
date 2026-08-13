import { notFound } from "next/navigation";
import NutritionProgramPage from "@/components/NutritionProgramPage";
import { nutritionPrograms } from "@/data/nutrition-programs";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getSitePage } from "@/lib/site-pages";

export function generateStaticParams(){return nutritionPrograms.map(program=>({slug:program.slug}));}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params,program=nutritionPrograms.find(item=>item.slug===slug);if(!program)notFound();const [locale,managed]=await Promise.all([getCurrentLocale(),getSitePage(`programme-${slug}`)]);return <NutritionProgramPage program={program} en={locale==="en"} managed={managed}/>;}
