"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

type Locale = "fr" | "en";
type Announcement = {
  id: string; title_fr: string; title_en: string; summary_fr: string; summary_en: string;
  link_url?: string | null; published_at: string;
};
type GalleryItem = {
  id: string; title_fr: string; title_en: string; caption_fr?: string | null;
  caption_en?: string | null; image_url: string;
};
type Topic = {
  id: string; title_fr: string; title_en: string; description_fr: string;
  description_en: string; status: string;
};
type Message = {
  id: string; topic_id: string; author_name: string; message: string; created_at: string;
};

export default function HomeCommunitySections({
  locale, announcements, gallery, topics, messages,
}: {
  locale: Locale; announcements: Announcement[]; gallery: GalleryItem[];
  topics: Topic[]; messages: Message[];
}) {
  const english = locale === "en";
  const [topicId, setTopicId] = useState(topics.find((topic) => topic.status === "open")?.id || "");
  const [form, setForm] = useState({ author_name: "", author_email: "", message: "" });
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const visibleMessages = useMemo(
    () => messages.filter((message) => message.topic_id === topicId).slice(0, 6),
    [messages, topicId],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!topicId) return;
    setSending(true);
    setFeedback("");
    const { error } = await createClient().from("homepage_discussion_messages").insert({
      topic_id: topicId,
      author_name: form.author_name.trim(),
      author_email: form.author_email.trim(),
      message: form.message.trim(),
      status: "pending",
    });
    setSending(false);
    if (error) {
      setFeedback(english ? "Your contribution could not be sent. Please try again." : "Votre contribution n’a pas pu être envoyée. Veuillez réessayer.");
      return;
    }
    setForm({ author_name: "", author_email: "", message: "" });
    setFeedback(english ? "Thank you. Your contribution will appear after moderation." : "Merci. Votre contribution apparaîtra après modération.");
  }

  return (
    <>
      <section className="section bg-mint/35">
        <div className="container-site">
          <div className="mb-9 flex items-end justify-between gap-6">
            <div>
              <span className="eyebrow bg-white"><MegaphoneIcon className="mr-2 h-4" />{english ? "News" : "Actualités"}</span>
              <h2 className="text-3xl font-black sm:text-4xl">{english ? "Latest Announcements" : "Dernières annonces"}</h2>
              <p className="mt-3 text-slate-600">{english ? "Stay informed about NutVitaGlobalis news and activities." : "Restez informé des actualités et activités de NutVitaGlobalis."}</p>
            </div>
          </div>
          {announcements.length ? (
            <div className="divide-y border-y border-forest/15">
              {announcements.slice(0, 5).map((item) => (
                <article key={item.id} className="grid gap-3 py-6 md:grid-cols-[180px_1fr_auto] md:items-center">
                  <time className="text-sm font-bold uppercase text-leaf">{new Date(item.published_at).toLocaleDateString(english ? "en-GB" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</time>
                  <div><h3 className="text-xl font-black">{english ? item.title_en : item.title_fr}</h3><p className="mt-1 leading-7 text-slate-600">{english ? item.summary_en : item.summary_fr}</p></div>
                  {item.link_url && <Link href={item.link_url} className="inline-flex items-center gap-2 font-bold text-forest">{english ? "Read" : "Lire"}<ArrowRightIcon className="h-4" /></Link>}
                </article>
              ))}
            </div>
          ) : <p className="border-y py-8 text-center text-slate-500">{english ? "No announcements yet." : "Aucune annonce pour le moment."}</p>}
        </div>
      </section>

      <section className="section">
        <div className="container-site">
          <span className="eyebrow"><PhotoIcon className="mr-2 h-4" />{english ? "In pictures" : "En images"}</span>
          <h2 className="text-3xl font-black sm:text-4xl">{english ? "Our Gallery" : "Notre galerie"}</h2>
          <p className="mt-3 text-slate-600">{english ? "Projects, events and communities we serve." : "Nos projets, nos événements et les communautés que nous accompagnons."}</p>
          {gallery.length ? (
            <div className="mt-9 grid auto-rows-[220px] gap-4 md:grid-cols-3">
              {gallery.slice(0, 6).map((item, index) => (
                <figure key={item.id} className={`group relative overflow-hidden ${index === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
                  <Image src={item.image_url} alt={english ? item.title_en : item.title_fr} fill className="object-cover transition duration-500 group-hover:scale-105" sizes={index === 0 ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 100vw"} />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-forest/90 p-5 text-white">
                    <p className="font-black">{english ? item.title_en : item.title_fr}</p>
                    {(english ? item.caption_en : item.caption_fr) && <p className="mt-1 text-sm text-white/75">{english ? item.caption_en : item.caption_fr}</p>}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : <p className="mt-8 border-y py-8 text-center text-slate-500">{english ? "The gallery is being prepared." : "La galerie est en cours de préparation."}</p>}
        </div>
      </section>

      <section className="section bg-forest text-white">
        <div className="container-site">
          <span className="eyebrow border-white/15 bg-white/10 text-white"><ChatBubbleLeftRightIcon className="mr-2 h-4" />{english ? "Community" : "Communauté"}</span>
          <h2 className="text-3xl font-black text-white sm:text-4xl">{english ? "Join the Conversation" : "Rejoignez la conversation"}</h2>
          <p className="mt-3 max-w-2xl text-white/70">{english ? "Share your experience and ideas on the topics that matter." : "Partagez votre expérience et vos idées sur les sujets qui comptent."}</p>
          {!topics.length ? <p className="mt-8 border-y border-white/15 py-8 text-white/65">{english ? "No discussion topics are open yet." : "Aucun sujet de discussion n’est encore ouvert."}</p> : (
            <div className="mt-10 grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <label className="text-sm font-bold" htmlFor="community-topic">{english ? "Discussion topic" : "Sujet de discussion"}</label>
                <select id="community-topic" value={topicId} onChange={(event) => setTopicId(event.target.value)} className="mt-2 w-full border border-white/20 bg-white p-4 text-forest">
                  {topics.map((topic) => <option key={topic.id} value={topic.id}>{english ? topic.title_en : topic.title_fr}{topic.status === "closed" ? ` (${english ? "closed" : "fermé"})` : ""}</option>)}
                </select>
                {selectedTopic && <p className="mt-5 leading-7 text-white/75">{english ? selectedTopic.description_en : selectedTopic.description_fr}</p>}
                <div className="mt-7 space-y-4">
                  {visibleMessages.map((message) => <blockquote key={message.id} className="border-l-2 border-orange pl-4"><p className="leading-7 text-white/85">“{message.message}”</p><footer className="mt-2 text-sm font-bold text-orange">{message.author_name}</footer></blockquote>)}
                </div>
              </div>
              {selectedTopic?.status === "open" && (
                <form onSubmit={submit} className="grid gap-4 bg-white p-6 text-forest sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">{english ? "Name" : "Nom"}<input required maxLength={100} className="admin-input" value={form.author_name} onChange={(event) => setForm({ ...form, author_name: event.target.value })} /></label>
                  <label className="grid gap-2 text-sm font-bold">{english ? "Email" : "Adresse e-mail"}<input required type="email" className="admin-input" value={form.author_email} onChange={(event) => setForm({ ...form, author_email: event.target.value })} /></label>
                  <label className="grid gap-2 text-sm font-bold sm:col-span-2">{english ? "Your contribution" : "Votre contribution"}<textarea required minLength={10} maxLength={2000} rows={6} className="admin-input" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
                  <p className="text-xs leading-5 text-slate-500 sm:col-span-2">{english ? "Contributions are moderated before publication. Your email is never displayed." : "Les contributions sont modérées avant publication. Votre adresse e-mail n’est jamais affichée."}</p>
                  {feedback && <p className="text-sm font-bold text-leaf sm:col-span-2" aria-live="polite">{feedback}</p>}
                  <button disabled={sending} className="btn-primary justify-self-start sm:col-span-2">{sending ? (english ? "Sending..." : "Envoi...") : (english ? "Submit contribution" : "Envoyer ma contribution")}</button>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
