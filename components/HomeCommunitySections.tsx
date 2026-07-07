"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRightIcon, ChatBubbleLeftRightIcon, MegaphoneIcon, PhotoIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

type Locale = "fr" | "en";
type Announcement = { id: string; title_fr: string; title_en: string; summary_fr: string; summary_en: string; link_url?: string | null; published_at: string };
type GalleryItem = { id: string; title_fr: string; title_en: string; caption_fr?: string | null; caption_en?: string | null; image_url: string };
type Topic = { id: string; title_fr: string; title_en: string; description_fr: string; description_en: string; status: string };
type Message = { id: string; topic_id: string; author_name: string; message: string; created_at: string };

export default function HomeCommunitySections({ locale, announcements, gallery, topics, messages }: {
  locale: Locale; announcements: Announcement[]; gallery: GalleryItem[]; topics: Topic[]; messages: Message[];
}) {
  const english = locale === "en";
  const [topicId, setTopicId] = useState(topics.find((topic) => topic.status === "open")?.id || topics[0]?.id || "");
  const [form, setForm] = useState({ author_name: "", author_email: "", message: "" });
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const visibleMessages = useMemo(() => messages.filter((message) => message.topic_id === topicId).slice(0, 4), [messages, topicId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!topicId || selectedTopic?.status !== "open") return;
    setSending(true); setFeedback("");
    const { error } = await createClient().from("homepage_discussion_messages").insert({
      topic_id: topicId, author_name: form.author_name.trim(), author_email: form.author_email.trim(),
      message: form.message.trim(), status: "pending",
    });
    setSending(false);
    if (error) return setFeedback(english ? "Your contribution could not be sent. Please try again." : "Votre contribution n’a pas pu être envoyée. Veuillez réessayer.");
    setForm({ author_name: "", author_email: "", message: "" });
    setFeedback(english ? "Thank you. Your contribution will appear after moderation." : "Merci. Votre contribution apparaîtra après modération.");
  }

  return <>
    <section className="section bg-[#f3f1eb]">
      <div className="container-site grid gap-10 bg-white px-6 py-10 shadow-soft lg:grid-cols-[.65fr_1.35fr] lg:px-14 lg:py-14">
        <div className="self-center">
          <span className="eyebrow"><PhotoIcon className="mr-2 h-4" />{english ? "In pictures" : "En images"}</span>
          <h2 className="text-4xl font-black lg:text-5xl">{english ? "Our Gallery" : "Notre galerie"}</h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">{english ? "Discover our projects, field activities, events and the communities we are proud to serve." : "Découvrez nos projets, nos activités de terrain, nos événements et les communautés que nous sommes fiers d’accompagner."}</p>
        </div>
        {gallery.length ? <div className="grid min-h-[420px] auto-rows-[200px] gap-3 sm:grid-cols-2">
          {gallery.slice(0, 5).map((item, index) => <figure key={item.id} className={`group relative overflow-hidden bg-mint ${index === 0 ? "sm:row-span-2" : ""}`}>
            <img src={item.image_url} alt={english ? item.title_en : item.title_fr} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-forest/90 p-4 text-white"><p className="font-black">{english ? item.title_en : item.title_fr}</p>{(english ? item.caption_en : item.caption_fr) && <p className="mt-1 text-sm text-white/70">{english ? item.caption_en : item.caption_fr}</p>}</figcaption>
          </figure>)}
        </div> : <div className="grid min-h-[360px] place-items-center bg-mint px-8 text-center"><div><PhotoIcon className="mx-auto h-12 text-leaf" /><p className="mt-5 text-xl font-black text-forest">{english ? "New images coming soon" : "De nouvelles images arrivent bientôt"}</p><p className="mx-auto mt-2 max-w-md leading-7 text-slate-600">{english ? "Our teams are preparing a visual selection of NutVitaGlobalis activities." : "Nos équipes préparent une sélection visuelle des activités de NutVitaGlobalis."}</p></div></div>}
      </div>
    </section>

    <section className="section">
      <div className="container-site grid gap-10 bg-white px-6 py-10 shadow-soft lg:grid-cols-[.65fr_1.35fr] lg:px-14 lg:py-14">
        <div>
          <span className="eyebrow"><MegaphoneIcon className="mr-2 h-4" />{english ? "News" : "Actualités"}</span>
          <h2 className="text-4xl font-black lg:text-5xl">{english ? "Latest Announcements" : "Dernières annonces"}</h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">{english ? "Follow NutVitaGlobalis news, new programmes and important dates." : "Suivez les actualités de NutVitaGlobalis, les nouveaux programmes et les dates importantes."}</p>
        </div>
        {announcements.length ? <div className="grid gap-3">{announcements.slice(0, 5).map((item) => <article key={item.id} className="grid gap-3 bg-mint px-5 py-5 md:grid-cols-[135px_1fr_auto] md:items-center">
          <time className="text-xs font-black uppercase leading-5 text-leaf">{new Date(item.published_at).toLocaleDateString(english ? "en-GB" : "fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</time>
          <div><h3 className="text-lg font-black text-forest">{english ? item.title_en : item.title_fr}</h3><p className="mt-1 leading-6 text-slate-600">{english ? item.summary_en : item.summary_fr}</p></div>
          {item.link_url && <Link href={item.link_url} className="inline-flex items-center gap-2 font-black text-leaf">{english ? "Read" : "Lire"}<ArrowRightIcon className="h-4" /></Link>}
        </article>)}</div> : <div className="grid min-h-[280px] place-items-center bg-mint px-8 text-center"><div><MegaphoneIcon className="mx-auto h-12 text-leaf" /><p className="mt-5 text-xl font-black text-forest">{english ? "No announcements at this time" : "Aucune annonce pour le moment"}</p><p className="mt-2 text-slate-600">{english ? "Published news will appear here." : "Les actualités publiées apparaîtront ici."}</p></div></div>}
      </div>
    </section>

    <section className="section bg-mint/45">
      <div className="container-site">
        <div className="mb-10 max-w-3xl">
          <span className="eyebrow bg-white"><ChatBubbleLeftRightIcon className="mr-2 h-4" />{english ? "Community" : "Communauté"}</span>
          <h2 className="text-4xl font-black lg:text-5xl">{english ? "Join the Conversation" : "Rejoignez la conversation"}</h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">{english ? "Share your experience and ideas on the issues that shape nutrition, health and community action." : "Partagez votre expérience et vos idées sur les sujets qui façonnent la nutrition, la santé et l’action communautaire."}</p>
        </div>
        {!topics.length ? <div className="grid min-h-[220px] place-items-center bg-white px-8 text-center shadow-soft"><div><ChatBubbleLeftRightIcon className="mx-auto h-12 text-leaf" /><p className="mt-4 text-xl font-black">{english ? "The next discussion will open soon" : "La prochaine discussion ouvrira bientôt"}</p></div></div> :
        <div className="grid overflow-hidden bg-white shadow-soft lg:grid-cols-[.8fr_1.2fr]">
          <div className="bg-forest p-7 text-white lg:p-10">
            <label className="text-sm font-bold" htmlFor="community-topic">{english ? "Discussion topic" : "Sujet de discussion"}</label>
            <select id="community-topic" value={topicId} onChange={(event) => { setTopicId(event.target.value); setFeedback(""); }} className="mt-3 w-full border-0 bg-white p-4 font-bold text-forest">
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{english ? topic.title_en : topic.title_fr}{topic.status === "closed" ? ` (${english ? "closed" : "fermé"})` : ""}</option>)}
            </select>
            {selectedTopic && <><h3 className="mt-7 text-2xl font-black text-white">{english ? selectedTopic.title_en : selectedTopic.title_fr}</h3><p className="mt-3 leading-7 text-white/75">{english ? selectedTopic.description_en : selectedTopic.description_fr}</p></>}
            {visibleMessages.length > 0 && <div className="mt-8 space-y-5 border-t border-white/15 pt-6">{visibleMessages.map((message) => <blockquote key={message.id} className="border-l-2 border-orange pl-4"><p className="leading-7 text-white/85">“{message.message}”</p><footer className="mt-2 text-sm font-bold text-orange">{message.author_name}</footer></blockquote>)}</div>}
          </div>
          {selectedTopic?.status === "open" ? <form onSubmit={submit} className="grid gap-5 p-7 text-forest sm:grid-cols-2 lg:p-10">
            <div className="sm:col-span-2"><h3 className="text-2xl font-black">{english ? "Add your voice" : "Ajoutez votre voix"}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{english ? "Your contribution will be reviewed before publication." : "Votre contribution sera vérifiée avant publication."}</p></div>
            <label className="grid gap-2 text-sm font-bold">{english ? "Name" : "Nom"}<input required maxLength={100} className="admin-input" value={form.author_name} onChange={(event) => setForm({ ...form, author_name: event.target.value })} /></label>
            <label className="grid gap-2 text-sm font-bold">{english ? "Email" : "Adresse e-mail"}<input required type="email" className="admin-input" value={form.author_email} onChange={(event) => setForm({ ...form, author_email: event.target.value })} /></label>
            <label className="grid gap-2 text-sm font-bold sm:col-span-2">{english ? "Your contribution" : "Votre contribution"}<textarea required minLength={10} maxLength={2000} rows={6} className="admin-input" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2">{english ? "Your email is used for moderation only and is never displayed." : "Votre adresse e-mail sert uniquement à la modération et n’est jamais affichée."}</p>
            {feedback && <p className="text-sm font-bold text-leaf sm:col-span-2" aria-live="polite">{feedback}</p>}
            <button disabled={sending} className="btn-primary justify-self-start sm:col-span-2">{sending ? (english ? "Sending..." : "Envoi...") : (english ? "Submit contribution" : "Envoyer ma contribution")}</button>
          </form> : <div className="grid min-h-[360px] place-items-center p-8 text-center"><div><p className="text-2xl font-black">{english ? "This discussion is closed" : "Cette discussion est clôturée"}</p><p className="mt-3 text-slate-500">{english ? "You can still read the approved contributions." : "Vous pouvez toujours consulter les contributions approuvées."}</p></div></div>}
        </div>}
      </div>
    </section>
  </>;
}
