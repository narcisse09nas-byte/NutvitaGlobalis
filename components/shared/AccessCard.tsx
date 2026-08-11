import { AcademicCapIcon, ArrowTrendingUpIcon, EnvelopeIcon, GlobeAltIcon, MapPinIcon, PhoneIcon, PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export type AccessCardData = { name:string; title:string; subtitle?:string; matricule?:string; email:string; phone?:string; qrDataUrl:string };
const categories = [
  { label:'Nutrition', emoji:'🍎' },
  { label:'Santé', Icon:PlusIcon },
  { label:'Sécurité alimentaire', Icon:ShieldCheckIcon },
  { label:'Suivi de croissance', Icon:ArrowTrendingUpIcon },
  { label:'Formation et renforcement des capacités', Icon:AcademicCapIcon },
];

export default function AccessCard({ name,title,subtitle,matricule,email,phone,qrDataUrl }:AccessCardData) {
  return <div className='grid gap-6 overflow-hidden'>
    <section className='min-w-0 overflow-hidden rounded-3xl border bg-white shadow-2xl print:break-inside-avoid print:shadow-none'>
      <div className='grid min-w-0 gap-6 p-5 sm:p-7 md:grid-cols-[160px_minmax(0,1fr)] md:items-center'>
        <img src='/brand/nutvita-logo-full.png' alt='NutVitaGlobalis' className='mx-auto h-auto max-h-28 w-full max-w-40 object-contain'/>
        <div className='min-w-0 border-t pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0'>
          <div className='flex min-w-0 flex-wrap items-center gap-2'><h2 className='min-w-0 max-w-full break-words text-xl font-black leading-tight text-forest sm:text-2xl'>{name}</h2>{matricule&&<span className='shrink-0 rounded-full bg-mint px-3 py-1 text-xs font-black text-leaf'>{matricule}</span>}</div>
          <p className='mt-2 break-words font-bold text-slate-600'>{title}</p>{subtitle&&<p className='break-words font-bold text-orange'>{subtitle}</p>}
          <div className='mt-4 grid min-w-0 gap-2 text-sm text-slate-600'>{phone&&<Line Icon={PhoneIcon}>{phone}</Line>}<Line Icon={EnvelopeIcon}>{email}</Line><Line Icon={GlobeAltIcon}>www.nutvitaglobalis.com</Line><Line Icon={MapPinIcon}>Douala, Cameroun</Line></div>
        </div>
      </div>
      <div className='grid min-w-0 gap-5 bg-forest p-5 text-white sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-6'>
        <img src={qrDataUrl} alt='QR code d’accès' className='mx-auto h-28 w-28 shrink-0 rounded-lg bg-white p-2'/><div className='min-w-0'><p className='break-words text-sm font-bold uppercase tracking-widest text-orange'>Carte d’accès personnelle</p><p className='mt-2 break-words text-sm leading-6 text-white/85'>Scannez ce QR code pour ouvrir votre espace NutVitaGlobalis. Votre identifiant <span className='font-bold text-white'>({email})</span> est déjà renseigné : il ne vous reste qu’à saisir votre mot de passe.</p></div>
      </div>
    </section>
    <section className='overflow-hidden rounded-3xl bg-forest p-6 text-white shadow-2xl print:break-inside-avoid print:shadow-none'><div className='grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5'>{categories.map(({emoji,Icon,label})=><div key={label} className='text-center text-xs font-bold'>{emoji?<span className='text-3xl'>{emoji}</span>:Icon?<Icon className='mx-auto h-8 w-8'/>:null}<p className='mt-2 leading-4'>{label}</p></div>)}</div><div className='my-6 h-px bg-white/20'/><p className='text-center text-lg italic text-orange'>Nourish life, <span className='text-white'>build the future</span> 🍃</p><div className='mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-white/70'><span>www.nutvitaglobalis.com</span><span className='break-all'>contact@nutvitaglobalis.com</span><span>Douala, Cameroun</span></div></section>
  </div>;
}
function Line({Icon,children}:{Icon:any;children:React.ReactNode}) { return <p className='flex min-w-0 items-start gap-2'><Icon className='mt-0.5 h-4 w-4 shrink-0 text-leaf'/><span className='min-w-0 break-all'>{children}</span></p>; }
