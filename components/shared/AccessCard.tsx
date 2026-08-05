import { AcademicCapIcon, ArrowTrendingUpIcon, EnvelopeIcon, GlobeAltIcon, MapPinIcon, PhoneIcon, PlusIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export type AccessCardData = {
  name: string;
  title: string;
  subtitle?: string;
  matricule?: string;
  email: string;
  phone?: string;
  qrDataUrl: string;
};

const backCategories: { emoji?: string; Icon?: typeof PlusIcon; label: string }[] = [
  { emoji: "🍎", label: "Nutrition" },
  { Icon: PlusIcon, label: "Santé" },
  { Icon: ShieldCheckIcon, label: "Sécurité Alimentaire" },
  { Icon: ArrowTrendingUpIcon, label: "Suivi de Croissance" },
  { Icon: AcademicCapIcon, label: "Formation & Renforcement des Capacités" },
];

export default function AccessCard({ name, title, subtitle, matricule, email, phone, qrDataUrl }: AccessCardData) {
  return <div className="grid gap-6">
    <section className="overflow-hidden rounded-3xl border bg-white shadow-2xl print:break-inside-avoid print:shadow-none">
      <div className="grid gap-6 p-7 sm:grid-cols-[auto_1fr] sm:items-center">
        <img src="/brand/nutvita-logo-full.png" alt="NutVitaGlobalis" className="h-16 w-auto" />
        <div className="border-t pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black text-forest">{name}</h2>
            {matricule && <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-leaf">{matricule}</span>}
          </div>
          <p className="mt-1 font-bold text-slate-600">{title}</p>
          {subtitle && <p className="font-bold text-orange">{subtitle}</p>}
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            {phone && <p className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-leaf" />{phone}</p>}
            <p className="flex items-center gap-2"><EnvelopeIcon className="h-4 w-4 text-leaf" />{email}</p>
            <p className="flex items-center gap-2"><GlobeAltIcon className="h-4 w-4 text-leaf" />www.nutvitaglobalis.com</p>
            <p className="flex items-center gap-2"><MapPinIcon className="h-4 w-4 text-leaf" />Douala, Cameroun</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-5 bg-forest p-6 text-white">
        <img src={qrDataUrl} alt="QR code d'accès" className="h-28 w-28 rounded-lg bg-white p-2" />
        <div className="max-w-xs">
          <p className="text-sm font-bold uppercase tracking-widest text-orange">Carte d&apos;accès personnelle</p>
          <p className="mt-1 text-sm leading-6 text-white/80">Scannez ce QR code pour ouvrir votre espace NutVitaGlobalis. Votre identifiant ({email}) est déjà renseigné : il ne vous reste qu&apos;à saisir votre mot de passe.</p>
        </div>
      </div>
    </section>

    <section className="overflow-hidden rounded-3xl bg-forest p-7 text-white shadow-2xl print:break-inside-avoid print:shadow-none">
      <div className="grid grid-cols-3 gap-5 sm:grid-cols-5">
        {backCategories.map(({ emoji, Icon, label }) => <div key={label} className="text-center text-xs font-bold">
          {emoji ? <span className="text-3xl leading-none">{emoji}</span> : Icon ? <Icon className="mx-auto h-8 w-8" /> : null}
          <p className="mt-2 leading-4">{label}</p>
        </div>)}
      </div>
      <div className="my-6 h-px bg-white/20" />
      <p className="text-center text-lg italic text-orange">Nourish life, <span className="text-white">build the future</span> 🍃</p>
      <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-white/70">
        <span>www.nutvitaglobalis.com</span>
        <span>contact@nutvitaglobalis.com</span>
        <span>Douala, Cameroun</span>
      </div>
    </section>
  </div>;
}
