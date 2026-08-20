import Link from "next/link";
import { ArrowRight, BadgeCheck, CheckCircle2, ListChecks, Puzzle, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ManagedSection, SitePageContent } from "@/data/site-pages";

// Each section's `badge` field is reused as a layout hint (not a literal small badge on this
// page), so the same admin-editable ManagedSection shape can drive very different visual blocks
// without any schema change: "hero-checklist" | "chips" | "steps" | "features" | "list" | "closing".
// Any item whose text contains "|||" is rendered as a title + description pair, everywhere.
const featureIcons: LucideIcon[] = [Sparkles, ListChecks, BadgeCheck, Puzzle, CheckCircle2, ArrowRight];

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

  return <main className="bg-[#fbfcfb]">
    <section className="container-site grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_.95fr]">
      <div>
        {page.eyebrow && <span className="inline-flex rounded-full bg-mint px-4 py-2 text-xs font-black uppercase tracking-widest text-leaf">{page.eyebrow}</span>}
        <h1 className="mt-5 whitespace-pre-line text-5xl font-black leading-[1.03] md:text-6xl">{page.title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{page.description}</p>
        {hero?.items && hero.items.length > 0 && <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {hero.items.map(raw => { const { title, description } = splitItem(raw); return <div className="flex gap-3" key={title}><CheckCircle2 className="h-6 shrink-0 text-leaf" /><div><b className="font-bold">{title}</b>{description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}</div></div>; })}
        </div>}
        <div className="mt-9"><Link href={appHref} className="btn-primary min-w-56">{primaryLabel}<ArrowRight className="ml-2 h-4" /></Link></div>
      </div>
      {page.hero_image_url && <div className="relative min-h-[420px] overflow-hidden rounded-[42px] shadow-soft"><img src={page.hero_image_url} alt={page.title} className="h-full min-h-[420px] w-full object-cover" /></div>}
    </section>

    {middle.map((section, index) => <MiddleSection key={section.title || index} section={section} />)}

    {closing && <section className="pb-20"><div className="container-site"><div className="grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-forest text-white lg:grid-cols-[1.2fr_.8fr]"><div className="p-10 md:p-14"><h2 className="text-3xl font-black leading-tight md:text-4xl">{closing.title}</h2>{closing.text && <p className="mt-4 max-w-xl leading-7 text-white/75">{closing.text}</p>}<Link href={appHref} className="btn-primary mt-8 min-w-56 bg-orange hover:bg-orange">{primaryLabel}<ArrowRight className="ml-2 h-4" /></Link></div>{closing.image_url && <div className="relative min-h-[280px] self-stretch lg:min-h-[360px]"><img src={closing.image_url} alt={closing.title} className="h-full w-full object-cover" /></div>}</div></div></section>}
  </main>;
}

function MiddleSection({ section }: { section: ManagedSection }) {
  const items = section.items || [];
  if (section.badge === "chips") return <section className="py-4"><div className="container-site"><div className="rounded-[2rem] border bg-white p-7 shadow-soft md:p-9">{section.title && <h2 className="text-xl font-black">{section.title}</h2>}<div className="mt-5 flex flex-wrap gap-3">{items.map(raw => { const { title, description } = splitItem(raw); return <span key={title} className="rounded-full bg-mint px-4 py-2 text-sm font-bold text-leaf">{title}{description && <span className="ml-1 font-medium text-leaf/80">— {description}</span>}</span>; })}</div></div></div></section>;

  if (section.badge === "steps") return <section className="py-10"><div className="container-site">{section.title && <h2 className="text-center text-3xl font-black">{section.title}</h2>}<div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">{items.map((raw, index) => { const { title, description } = splitItem(raw); return <div key={title} className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint text-lg font-black text-leaf">{index + 1}</span><b className="mt-4 block">{title}</b>{description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}</div>; })}</div></div></section>;

  if (section.badge === "features") return <section className="py-10"><div className="container-site">{section.title && <h2 className="text-center text-3xl font-black">{section.title}</h2>}<div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((raw, index) => { const { title, description } = splitItem(raw); const Icon = featureIcons[index % featureIcons.length]; return <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf5eb] text-leaf"><Icon className="h-5" /></span><b className="mt-4 block">{title}</b>{description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}</div>; })}</div></div></section>;

  if (section.badge === "list") return <section className="py-6"><div className="container-site"><div className="rounded-[2rem] border bg-white p-7 shadow-soft md:p-9">{section.title && <h2 className="text-xl font-black">{section.title}</h2>}<div className="mt-5 grid gap-3 sm:grid-cols-2">{items.map(raw => { const { title } = splitItem(raw); return <div key={title} className="flex gap-3 text-sm font-bold"><CheckCircle2 className="h-5 shrink-0 text-leaf" />{title}</div>; })}</div></div></div></section>;

  return <section className="py-6"><div className="container-site"><div className="rounded-[2rem] border bg-white p-7 shadow-soft md:p-9">{section.title && <h2 className="text-xl font-black">{section.title}</h2>}{section.text && <p className="mt-3 text-slate-600">{section.text}</p>}{items.length > 0 && <ul className="mt-4 grid gap-2 text-sm">{items.map(item => <li key={item} className="flex gap-3"><CheckCircle2 className="h-5 shrink-0 text-leaf" />{item}</li>)}</ul>}</div></div></section>;
}
