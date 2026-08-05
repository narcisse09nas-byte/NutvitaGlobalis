import Link from "next/link";
import { CheckCircle2, Gift, UserPlus, Users, Video } from "lucide-react";

export const metadata = { title: "Devenir promoteur NutVitaGlobalis" };

const steps = [
  { icon: UserPlus, title: "Manifestez votre intérêt", text: "Créez votre compte candidat et déposez votre dossier de promoteur." },
  { icon: Video, title: "Passez un entretien", text: "Notre équipe échange avec vous pour valider votre motivation et votre réseau." },
  { icon: Gift, title: "Recevez votre code promoteur", text: "Une fois retenu, un code personnel vous est attribué (ex. NVG001P)." },
  { icon: Users, title: "Partagez et gagnez", text: "Vos filleuls indiquent votre code à l'achat. Vous recevez 3% de chacun de leurs paiements dans votre cagnote." },
];

export default function BecomePromoterPage() {
  return <div>
    <section className="bg-forest py-16 text-white">
      <div className="container-site">
        <p className="text-sm font-black uppercase tracking-widest text-orange">Programme promoteurs</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">Devenez promoteur NutVitaGlobalis</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">Recommandez nos services à votre réseau et recevez une commission sur chaque paiement de vos filleuls.</p>
        <Link href="/candidat?type=promoter" className="btn-primary mt-8 inline-flex">Manifester mon intérêt</Link>
      </div>
    </section>
    <section className="container-site py-14">
      <h2 className="text-3xl font-black text-forest">Comment ça marche</h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => <article key={step.title} className="rounded-2xl border bg-white p-6 shadow-soft">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-mint font-black text-forest">{index + 1}</span>
          <step.icon className="mt-4 h-7 text-leaf" />
          <h3 className="mt-3 font-black">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
        </article>)}
      </div>
    </section>
    <section className="container-site pb-16">
      <div className="rounded-3xl border bg-mint p-8">
        <h2 className="text-2xl font-black text-forest">Bon à savoir</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            "Le code promoteur est communiqué manuellement par vos filleuls lors de leur achat.",
            "Votre commission de 3% est créditée automatiquement dans votre cagnote après chaque paiement réussi.",
            "Le processus de recrutement (entretien, validation) est identique pour tous les promoteurs.",
            "Les versements de votre cagnote sont enregistrés par l'équipe NutVitaGlobalis avec preuve de paiement.",
          ].map(text => <p key={text} className="flex items-start gap-2 text-sm font-bold text-forest"><CheckCircle2 className="mt-0.5 h-5 shrink-0 text-leaf" />{text}</p>)}
        </div>
      </div>
    </section>
  </div>;
}
