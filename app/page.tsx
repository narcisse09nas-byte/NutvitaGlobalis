import Image from "next/image";
import Link from "next/link";
import { CheckBadgeIcon, ClockIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import FeaturedArticlesCarousel from "@/components/FeaturedArticlesCarousel";
import HomeCommunitySections from "@/components/HomeCommunitySections";
import Newsletter from "@/components/Newsletter";
import { getArticles, getFormations, getHomepage, getHomepageCommunity, getTestimonials } from "@/lib/public-content";

import { localizedPath } from "@/lib/i18n";
import { repairMojibake } from "@/lib/text-encoding";
const welcome = {
  fr: `Nous croyons qu’une alimentation de qualité peut transformer des vies, renforcer les communautés et bâtir un futur plus sain pour tous.

Chaque jour, nous accompagnons :
- les formations sanitaires, avec des repas thérapeutiques équilibrés conçus pour soutenir la guérison, ainsi qu’avec des programmes et applications dédiés à la prise en charge de la malnutrition infantile ;
- les entreprises, grâce à des solutions de restauration premium qui favorisent le bien-être et la productivité ;
- le grand public, en proposant des menus variés, savoureux et accessibles ;
- les familles, grâce à nos outils digitaux pour le suivi de la croissance et de la santé nutritionnelle des enfants ;
- les individus, via des consultations diététiques personnalisées adaptées à chaque profil de santé ;
- les institutions, en leur offrant un appui technique dans la planification, la gestion et la conduite d’enquêtes nutritionnelles ;
- les professionnels, étudiants et communautés, à travers nos formations certifiantes en nutrition et diététique, conçues pour renforcer les compétences, améliorer les pratiques et développer des experts capables d’impacter durablement la santé publique.

Chez NutVitaGlobalis, nous ne servons pas seulement des repas : nous créons des solutions nutritionnelles qui soignent, protègent, éduquent et transforment.

*Nourish Life. Build the Future.*
**Ensemble, construisons un avenir où chacun a accès à une alimentation saine, durable et porteuse d’espoir.**`,
  en: `We believe that quality nutrition can transform lives, strengthen communities and build a healthier future for all.

Every day, we support:
- health facilities, with balanced therapeutic meals designed to support recovery, as well as programmes and applications dedicated to the management of childhood malnutrition;
- businesses, through premium catering solutions that promote well-being and productivity;
- the general public, by offering varied, tasty and accessible menus;
- families, through our digital tools for monitoring children’s growth and nutritional health;
- individuals, through personalized dietary consultations tailored to each health profile;
- institutions, by providing technical assistance in the planning, management and implementation of nutrition surveys;
- professionals, students and communities, through certified nutrition and dietetics training designed to strengthen skills, improve practices and develop experts capable of making a lasting impact on public health.

At NutVitaGlobalis, we do more than serve meals: we create nutritional solutions that heal, protect, educate and transform.

*Nourish Life. Build the Future.*
**Together, let us build a future where everyone has access to healthy, sustainable and hopeful nutrition.**`,
};

function WelcomeMessage({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return <div className="space-y-5 text-base leading-8 text-slate-700">
    {blocks.map((block, index) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const bulletStart = lines.findIndex((line) => line.startsWith("- "));
      if (bulletStart >= 0 && lines.slice(bulletStart).every((line) => line.startsWith("- "))) return <div key={index} className="space-y-1">{lines.slice(0, bulletStart).map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}<ul className="list-disc space-y-1 pl-6">{lines.slice(bulletStart).map((line, itemIndex) => <li key={itemIndex} className="pl-1">{line.slice(2)}</li>)}</ul></div>;
      return <div key={index} className="space-y-1">{lines.map((line, lineIndex) => {
        if (line.startsWith("**") && line.endsWith("**")) return <p key={lineIndex} className="font-black text-forest">{line.slice(2, -2)}</p>;
        if (line.startsWith("*") && line.endsWith("*")) return <p key={lineIndex} className="italic">{line.slice(1, -1)}</p>;
        return <p key={lineIndex}>{line}</p>;
      })}</div>;
    })}
  </div>;
}

export const revalidate = 60;

export default async function Home() {
  const [settings, articles, formations, testimonials, community] = await Promise.all([
    getHomepage(), getArticles(true), getFormations(true), getTestimonials(), getHomepageCommunity(),
  ]);
  const english = community.locale === "en";
  const welcomeMessage = repairMojibake(english ? settings?.welcome_message_en || welcome.en : settings?.welcome_message_fr || welcome.fr);

  return <>
    <section className="relative min-h-[680px] overflow-hidden bg-forest">
      <Image src={settings?.hero_image_url || "/images/hero-nutvita.png"} alt={english ? "Nutrition consultation" : "Consultation nutritionnelle"} fill priority className="object-cover object-center opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/90 to-forest/10" />
      <div className="container-site relative flex min-h-[680px] items-center py-20">
        <div className="max-w-2xl text-white">
          <span className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em]">{settings?.slogan || (english ? "Health begins on the plate" : "La santé commence dans l’assiette")}</span>
          <h1 className="text-5xl font-black leading-[1.05] text-white md:text-7xl">{settings?.hero_title || (english ? "Nutrition, health and well-being for all" : "Nutrition, santé et bien-être pour tous")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">{settings?.presentation || (english ? "Reliable expertise and practical solutions for families, professionals and communities." : "Une expertise fiable et des solutions concrètes pour les familles, les professionnels et les communautés.")}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary" href={localizedPath(community.locale, settings?.primary_button_url || "/formations")}>{settings?.primary_button_label || (english ? "Explore our courses" : "Découvrir nos formations")}</Link>
            <Link className="btn-secondary border-white/30 bg-white/10 text-white" href={localizedPath(community.locale, settings?.secondary_button_url || "/teleconseils")}>{settings?.secondary_button_label || (english ? "Book a consultation" : "Réserver un téléconseil")}</Link>
          </div>
        </div>
      </div>
    </section>

    <section className="border-b bg-[#f7faf8] py-12 md:py-16">
      <div className="container-site">
        <div className="mx-auto max-w-5xl border-l-4 border-leaf bg-white px-6 py-8 shadow-sm md:px-10">
          <WelcomeMessage text={welcomeMessage} />
        </div>
      </div>
    </section>

    {(settings?.services?.length || 0) > 0 && <section className="section bg-white">
      <div className="container-site">
        <div className="max-w-3xl"><span className="eyebrow">{english ? "Our solutions" : "Nos solutions"}</span>
          <h2 className="text-4xl font-black lg:text-5xl">{english ? "Support for every stage of your nutrition journey" : "Un accompagnement pour chaque etape de votre parcours nutritionnel"}</h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">{english ? "Explore practical services designed for individuals, families, professionals and organizations." : "Decouvrez des services concrets concus pour les particuliers, les familles, les professionnels et les organisations."}</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {settings.services.map((service: { title: string; text: string }, index: number) => <article key={`${service.title}-${index}`} className="card border-t-4 border-t-leaf p-7">
            <span className="text-xs font-black uppercase tracking-[.18em] text-orange">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-4 text-2xl font-black text-forest">{service.title}</h3><p className="mt-3 leading-7 text-slate-600">{service.text}</p><Link href={localizedPath(community.locale, ["/formations","/teleconseils","/nutritrack","/surveys","/op-management","/suivi-sante"][index] || "/services")} className="mt-5 inline-flex font-black text-leaf">{english ? "Discover the solution" : "Decouvrir la solution"} &rarr;</Link>
          </article>)}
        </div>
      </div>
    </section>}
    {articles.length > 0 && <section className="section">
      <div className="container-site">
        <span className="eyebrow">{english ? "Insights" : "À lire"}</span>
        <h2 className="mb-10 text-4xl font-black">{english ? "Featured Articles" : "Articles mis en avant"}</h2>
        <FeaturedArticlesCarousel articles={articles} locale={community.locale} />
      </div>
    </section>}

    {formations.length > 0 && <section className="section bg-[#f3eee5]">
      <div className="container-site">
        <span className="eyebrow bg-white">{english ? "Learn" : "Se former"}</span>
        <h2 className="mb-10 text-4xl font-black">{english ? "Featured Courses" : "Formations mises en avant"}</h2>
        <div className="grid gap-6 md:grid-cols-2">{formations.map((course) => <div className="card flex flex-col gap-5 p-7 sm:flex-row" key={course.title}><div className="relative h-40 w-full shrink-0 overflow-hidden sm:w-48"><Image src={course.image} alt={course.title} fill className="object-cover" /></div><div><h3 className="text-2xl font-black">{course.title}</h3><p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><ClockIcon className="h-5 text-orange" />{course.duration} · {course.level}</p><Link href={localizedPath(community.locale, "/formations")} className="mt-5 inline-block font-bold text-leaf">{english ? "Discover" : "Découvrir"} →</Link></div></div>)}</div>
      </div>
    </section>}

    <section className="section">
      <div className="container-site grid items-center gap-10 bg-white px-6 py-10 shadow-soft lg:grid-cols-2 lg:px-14">
        <div><span className="eyebrow"><LockClosedIcon className="mr-2 h-4" />{english ? "Premium resources" : "Ressources premium"}</span><h2 className="text-4xl font-black">{english ? "Go further in your practice." : "Allez plus loin dans votre pratique."}</h2><Link className="btn-primary mt-7" href={localizedPath(community.locale, "/ressources")}>{english ? "Explore resources" : "Explorer les ressources"}</Link></div>
        <div className="grid gap-3">{(english ? ["Evidence-based guides","Immediately applicable tools","Regular updates"] : ["Guides fondés sur les données scientifiques","Outils immédiatement applicables","Mises à jour régulières"]).map((text) => <div key={text} className="flex items-center gap-3 bg-mint p-5 font-bold text-forest"><CheckBadgeIcon className="h-6 text-leaf" />{text}</div>)}</div>
      </div>
    </section>

    <HomeCommunitySections locale={community.locale} announcements={community.announcements} gallery={community.gallery} topics={community.topics} messages={community.messages} />

    {(testimonials?.length || 0) > 0 && <section className="section">
      <div className="container-site text-center">
        <span className="eyebrow">{english ? "Testimonials" : "Témoignages"}</span>
        <h2 className="text-4xl font-black">{english ? "They trust us" : "Ils nous font confiance"}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">{testimonials!.slice(0, 3).map((item) => <blockquote key={item.name} className="card p-8 text-left"><div className="mb-4 text-orange">{"★".repeat(item.rating || 5)}</div><p className="text-lg leading-8">“{item.testimony}”</p><footer className="mt-6 font-bold text-forest">{item.name}</footer></blockquote>)}</div>
      </div>
    </section>}
    <Newsletter />
  </>;
}
