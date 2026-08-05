import ClientShell from "@/components/client/ClientShell";
import NutVitaAssistantWidget from "@/components/shared/NutVitaAssistantWidget";
import { requireClient } from "@/lib/client";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function NutVitaAiPage() {
  const { user } = await requireClient();
  const english = (await getCurrentLocale()) === "en";
  const suggestions = english
    ? ["Summarize my latest health results", "What progress can you see?", "What should I discuss with my nutritionist?"]
    : ["Résume mes derniers résultats de santé", "Quels progrès observes-tu ?", "De quoi devrais-je parler avec mon nutritionniste ?"];

  return <ClientShell email={user.email || ""}>
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <span className="text-xs font-black uppercase tracking-[.2em] text-orange">NutVitaGlobalis</span>
        <h1 className="mt-2 text-3xl font-black text-forest sm:text-4xl">{english ? "Talk with NutVita AI" : "Discuter avec NutVita IA"}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">{english ? "Ask questions about your measurements, progress and nutrition follow-up in a comfortable, dedicated space." : "Posez vos questions sur vos mesures, vos progrès et votre suivi nutritionnel dans un espace de discussion confortable et dédié."}</p>
      </header>
      <NutVitaAssistantWidget standalone title="NutVita IA" subtitle={english ? "Your personal health and nutrition assistant" : "Votre assistant personnel de santé et de nutrition"} suggestions={suggestions} />
      <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{english ? "NutVita AI provides educational guidance and does not replace a healthcare professional or urgent medical care." : "NutVita IA fournit des informations éducatives et ne remplace ni un professionnel de santé ni des soins médicaux urgents."}</p>
    </div>
  </ClientShell>;
}
