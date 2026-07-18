import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/content";
import { getArticle } from "@/lib/public-content";
import { getCurrentLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";

export const revalidate = 60;
export function generateStaticParams() { return articles.map(article => ({ slug: article.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const article = await getArticle(slug);
  return { title: article?.seoTitle || article?.title || "Article", description: article?.seoDescription || article?.excerpt };
}
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getCurrentLocale()]);
  const article = await getArticle(slug); if (!article) notFound(); const english = locale === "en";
  return <article><div className="container-site py-12">
    <Link href={localizedPath(locale, "/ressources")} className="font-bold text-leaf">← {english ? "Back to resources" : "Retour aux ressources"}</Link>
    <div className="mx-auto mt-10 max-w-4xl text-center"><span className="eyebrow">{article.category}</span><h1 className="text-4xl font-black md:text-6xl">{article.title}</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8">{article.excerpt}</p><p className="mt-4 text-sm text-slate-400">{english ? "Reading time" : "Lecture"} : {article.readTime} · {article.author || (english ? "NutVitaGlobalis team" : "Equipe NutVitaGlobalis")}</p></div>
    <div className="relative mx-auto mt-12 h-[300px] max-w-5xl overflow-hidden rounded-[2rem] md:h-[520px]"><Image src={article.image} alt={article.title} fill priority className="object-cover" /></div>
    {article.content ? <div className="article-content mx-auto max-w-3xl py-14 leading-8" dangerouslySetInnerHTML={{ __html: article.content }} /> : <div className="mx-auto max-w-3xl py-14 leading-8"><p>{english ? "Healthy eating is built on informed, consistent choices adapted to your daily reality." : "Une bonne alimentation repose sur des choix eclaires, reguliers et adaptes a votre realite."}</p><h2 className="mt-10 text-3xl font-black">{english ? "Essential guidance" : "Les reperes essentiels"}</h2><p className="mt-4">{english ? "Choose a varied diet rich in vegetables, legumes and minimally processed foods." : "Privilegiez une alimentation variee, riche en legumes, legumineuses et aliments peu transformes."}</p></div>}
  </div></article>;
}