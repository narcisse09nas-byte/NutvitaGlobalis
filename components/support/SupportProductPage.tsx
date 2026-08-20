import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BarChart3, CheckCircle2, Clock3, Database, FileCheck2,
  Globe2, ListChecks, Map, MessageSquare, Puzzle, ShieldCheck, Sparkles, TrendingUp, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ManagedSection, SitePageContent } from "@/data/site-pages";

// Each section's `badge` field is reused as a layout hint (not a literal small badge on this
// page), so the same admin-editable ManagedSection shape can drive very different visual blocks
// without any schema change: "hero-checklist" | "chips" | "steps" | "features" | "list" | "closing".
// Any item whose text contains "|||" is rendered as a title + description pair, everywhere.
// "chips" items also support a "Value — Label" convention, rendered as a colored stat card.
const featureIcons: LucideIcon[] = [Sparkles, ListChecks, BadgeCheck, Database, Puzzle, BarChart3, Map, MessageSquare];
const statIcons: LucideIcon[] = [Users, Clock3, ShieldCheck, TrendingUp, Database, Globe2];
const stepIcons: LucideIcon[] = [FileCheck2, Sparkles, Database, TrendingUp, CheckCircle2, ShieldCheck];
const palette = [
  { soft: "bg-rose-50", strong: "bg-rose-500", text: "text-rose-600" },
  { soft: "bg-sky-50", strong: "bg-sky-500", text: "text-sky-600" },
  { soft: "bg-emerald-50", strong: "bg-emerald-500", text: "text-emerald-600" },
  { soft: "bg-amber-50", strong: "bg-amber-500", text: "text-amber-600" },
  { soft: "bg-violet-50", strong: "bg-violet-500", text: "text-violet-600" },
  { soft: "bg-cyan-50", strong: "bg-cyan-500", text: "text-cyan-600" },
];

function splitItem(item: string) {
  const [title, ...rest] = item.split("|||");
  return { title, description: rest.join("|||") || null };
}

export default function SupportProductPage({ page, appHref }: { page: SitePageContent; appHref: string }) {
  const sections = page.sections || [];
  const hero = sections.find(s => s.badge === "hero-checklist");
  const closing = [...sections].reverse().find(s => s.badge === "closing");
  const middle = sections.filter(s => s !== hero && s !== closing);
  const primaryLabel = page.cta_label || "Accéder à l'application";

  // Consecutive "list" sections (e.g. "Pour qui ?" + "Intégrations") are paired side by side.
  const rows: ManagedSection[][] = [];
  for (const section of middle) {
    const last = rows[rows.length - 1];
    if (section.badge === "list" && last?.length === 1 && last[0].badge === "list") last.push(section);
    else rows.push([section]);
  }

  return <main className="bg-[#fbfcfb]">
    <section className="container-site grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_.95fr]">
      <div>
        {page.eyebrow && <span className="inline-flex rounded-full bg-mint px-4 py-2 text-xs font-black uppercase tracking-widest text-leaf">{page.eyebrow}</span>}
        <h1 className="mt-5 whitespace-pre-line text-5xl font-black leading-[1.03] md:text-6xl">{page.title}</h1>
        {hero?.text && <p className="mt-3 text-xl font-black text-orange">{hero.text}</p>}
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">{page.description}</p>
        {hero?.items && hero.items.length > 0 && <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {hero.items.map(raw => { const { title, description } = splitItem(raw); return <div className="flex gap-3" key={title}><CheckCircle2 className="h-6 shrink-0 text-leaf" /><div><b className="font-bold">{title}</b>{description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}</div></div>; })}
        </div>}
        <div className="mt-9"><Link href={appHref} className="btn-primary min-w-56">{primaryLabel}<ArrowRight className="ml-2 h-4" /></Link></div>
      </div>
      {page.hero_image_url && <div className="relative min-h-[420px] overflow-hidden rounded-[42px] shadow-soft"><img src={page.hero_image_url} alt={page.title} className="h-full min-h-[420px] w-full object-cover" /></div>}
    </section>

    {rows.map((group, index) => group.length === 2
      ? <section key={index} className="py-6"><div className="container-site grid gap-5 md:grid-cols-2">{group.map(section => <ListBlock key={section.title} section={section} />)}</div></section>
      : <MiddleSection key={index} section={group[0]} />)}

    {closing && <section className="pb-20"><div className="container-site"><div className="grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-forest text-white lg:grid-cols-[1.2fr_.8fr]"><div className="p-10 md:p-14"><h2 className="text-3xl font-black leading-tight md:text-4xl">{closing.title}</h2>{closing.text && <p className="mt-4 max-w-xl leading-7 text-white/75">{closing.text}</p>}<Link href={appHref} className="btn-primary mt-8 min-w-56 bg-orange hover:bg-orange">{primaryLabel}<ArrowRight className="ml-2 h-4" /></Link></div>{closing.image_url && <div className="relative min-h-[280px] self-stretch lg:min-h-[360px]"><img src={closing.image_url} alt={closing.title} className="h-full w-full object-cover" /></div>}</div></div></section>}
  </main>;
}

function MiddleSection({ section }: { section: ManagedSection }) {
  const items = section.items || [];

  if (section.badge === "chips") return <section className="py-4"><div className="container-site"><div className="rounded-[2rem] border bg-white p-7 shadow-soft md:p-9">
    {section.title && <h2 className="text-xl font-black">{section.title}</h2>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map((raw, index) => {
      const { title, description } = splitItem(raw);
      const [value, ...labelParts] = title.split(" — ");
      const label = labelParts.join(" — ") || description || "";
      const Icon = statIcons[index % statIcons.length];
      const color = palette[index % palette.length];
      return <div key={title} className={`rounded-2xl ${color.soft} p-5 text-center`}>
        <span className={`mx-auto grid h-12 w-12 place-items-center rounded-full bg-white ${color.text} shadow-sm`}><Icon className="h-6" /></span>
        <b className={`mt-3 block text-2xl font-black ${color.text}`}>{value}</b>
        <span className="mt-1 block text-xs font-bold leading-5 text-slate-600">{label}</span>
      </div>;
    })}</div>
  </div></div></section>;

  if (section.badge === "steps") return <section className="py-10"><div className="container-site">
    {section.title && <h2 className="text-center text-3xl font-black">{section.title}</h2>}
    <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">{items.map((raw, index) => {
      const { title, description } = splitItem(raw);
      const Icon = stepIcons[index % stepIcons.length];
      const color = palette[index % palette.length];
      return <div key={title} className="relative text-center">
        <span className={`relative mx-auto grid h-14 w-14 place-items-center rounded-full ${color.soft} ${color.text}`}><Icon className="h-6" /><span className={`absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full ${color.strong} text-xs font-black text-white`}>{index + 1}</span></span>
        <b className="mt-4 block">{title}</b>
        {description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}
      </div>;
    })}</div>
  </div></section>;

  if (section.badge === "features") return <section className="py-10"><div className="container-site">
    {section.title && <h2 className="text-center text-3xl font-black">{section.title}</h2>}
    <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((raw, index) => {
      const { title, description } = splitItem(raw);
      const Icon = featureIcons[index % featureIcons.length];
      const color = palette[index % palette.length];
      return <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-xl ${color.soft} ${color.text}`}><Icon className="h-5" /></span><b className="mt-4 block">{title}</b>{description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}</div>;
    })}</div>
  </div></section>;

  if (section.badge === "list") return <section className="py-6"><div className="container-site"><ListBlock section={section} /></div></section>;

  return <section className="py-6"><div className="container-site"><div className="rounded-[2rem] border bg-white p-7 shadow-soft md:p-9">{section.title && <h2 className="text-xl font-black">{section.title}</h2>}{section.text && <p className="mt-3 text-slate-600">{section.text}</p>}{items.length > 0 && <ul className="mt-4 grid gap-2 text-sm">{items.map(item => <li key={item} className="flex gap-3"><CheckCircle2 className="h-5 shrink-0 text-leaf" />{item}</li>)}</ul>}</div></div></section>;
}

function ListBlock({ section }: { section: ManagedSection }) {
  const items = section.items || [];
  return <div className="rounded-[2rem] border bg-white p-7 shadow-soft md:p-9">
    {section.title && <h2 className="text-xl font-black">{section.title}</h2>}
    <div className="mt-5 grid gap-3">{items.map((raw, index) => { const { title } = splitItem(raw); const color = palette[index % palette.length]; return <div key={title} className="flex items-center gap-3 text-sm font-bold"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${color.soft} ${color.text}`}><CheckCircle2 className="h-4" /></span>{title}</div>; })}</div>
  </div>;
}
