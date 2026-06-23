import Link from "next/link";
import type { Article } from "@/data/content";

const fallbackImage = "/images/hero-nutvita.png";

export default function ArticleCard({ article }: { article: Article }) {
  const image = article.image || fallbackImage;
  return (
    <article className="card group">
      <div className="relative h-52 overflow-hidden bg-mint">
        <img src={image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <div className="p-6">
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-leaf">
          <span>{article.category}</span>
          <span className="text-slate-400">{article.readTime}</span>
        </div>
        <h3 className="mb-3 text-xl font-bold">{article.title}</h3>
        <p className="mb-5 text-sm leading-6 text-slate-500">{article.excerpt}</p>
        <Link className="font-bold text-orange" href={`/ressources/${article.slug}`}>Lire l'article -&gt;</Link>
      </div>
    </article>
  );
}
