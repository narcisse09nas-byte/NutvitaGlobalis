import Link from "next/link";
import LegalSignatureBox from "@/components/legal/LegalSignatureBox";
import { siteConfig } from "@/data/site";
import { getCurrentLocale } from "@/lib/i18n-server";
import { legalTemplateMap, type LegalSection } from "@/lib/legal-documents";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
function mergePublishedSections(required: LegalSection[], published: LegalSection[]) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ");
  const known = new Set(published.map(section => normalize(section.title)));
  return [
    ...published,
    ...required.filter(section => !known.has(normalize(section.title))),
  ];
}


export default async function LegalPage({ type }: { type: string }) {
  const locale = await getCurrentLocale();
  const template = legalTemplateMap[type] || legalTemplateMap.cgu;
  let doc = template[locale] || template.fr;
  let version = "1.0";
  let documentId: string | null = null;
  let requiresSignature = Boolean(template.requiresSignature);

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data: legal } = await supabase.from("legal_documents").select("*").eq("document_key", template.key).maybeSingle();
    documentId = legal?.id || null;
    requiresSignature = Boolean(legal?.requires_signature ?? requiresSignature);
    version = legal?.current_version || legal?.version || version;
    if (legal?.id) {
      const { data: translation } = await supabase.from("legal_translations").select("*").eq("document_id", legal.id).eq("locale", locale).maybeSingle();
      if (translation?.content?.sections) {
        const publishedSections = translation.content.sections as LegalSection[];
        doc = {
          title: translation.title, intro: translation.content.intro || doc.intro,
          sections: mergePublishedSections(doc.sections, publishedSections),
        };
      }
    }
  }

  return <main>
    <section className="section bg-mint">
      <div className="container-site max-w-4xl text-center">
        <p className="eyebrow">{locale === "en" ? "Legal framework" : "Cadre legal"}</p>
        <h1 className="text-4xl font-black md:text-6xl">{doc.title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">{doc.intro}</p>
        <p className="mt-4 text-sm font-bold text-slate-500">Version {version}</p>
      </div>
    </section>
    <section className="section">
      <div className="container-site max-w-4xl space-y-6">
        {doc.sections.map(section => <article key={section.title} className="rounded-2xl border bg-white p-6"><h2 className="text-2xl font-black">{section.title}</h2><p className="mt-3 whitespace-pre-line leading-8 text-slate-600">{section.body}</p></article>)}
        {requiresSignature && documentId && <LegalSignatureBox documentId={documentId} documentKey={template.key} version={version} signatureType={template.signatureType || "client_contract"} />}
        <div className="rounded-2xl bg-forest p-6 text-white">
          <h2 className="text-xl font-black text-white">{locale === "en" ? "Legal contact" : "Contact legal"}</h2>
          <p className="mt-2 text-white/70">{locale === "en" ? "For any legal question or data request, contact " : "Pour toute question juridique ou demande relative aux donnees, contactez "}<Link href={`mailto:${siteConfig.email}`} className="font-bold text-orange">{siteConfig.email}</Link>.</p>
        </div>
      </div>
    </section>
  </main>;
}
