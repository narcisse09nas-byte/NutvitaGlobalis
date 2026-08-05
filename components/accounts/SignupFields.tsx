import Link from "next/link";
import GeoFields from "./GeoFields";
export default function SignupFields({locale="fr"}:{locale?:"fr"|"en"}){const en=locale==="en";return <>
  <label className="grid gap-2 text-sm font-bold">{en?"Full name":"Nom complet"}<input name="full_name" required minLength={2} className="admin-input"/></label>
  <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input"/></label>
  <label className="grid gap-2 text-sm font-bold">{en?"WhatsApp phone":"Telephone WhatsApp"}<input name="whatsapp_phone" type="tel" required className="admin-input" placeholder="+229..."/></label>
  <GeoFields locale={locale}/>
  <label className="grid gap-2 text-sm font-bold">{en?"Referral code (optional)":"Code promoteur (facultatif)"}<input name="promo_code" className="admin-input" placeholder="NVG001P"/><span className="text-xs font-normal text-slate-400">{en?"If a promoter referred you, enter their code here.":"Si vous avez été référé par un promoteur, indiquez son code ici."}</span></label>
  <label className="grid gap-2 text-sm font-bold">{en?"Password":"Mot de passe"}<input name="password" type="password" minLength={8} required className="admin-input"/></label>
  <label className="grid gap-2 text-sm font-bold">{en?"Confirm password":"Confirmation du mot de passe"}<input name="password_confirmation" type="password" minLength={8} required className="admin-input"/></label>
  <label className="flex gap-3 text-sm"><input name="terms" type="checkbox" required className="mt-1 h-4 w-4"/>{en?"I accept the ":"J'accepte les "}<Link href="/cgu" target="_blank" className="font-bold text-leaf">{en?"terms and conditions":"conditions generales"}</Link>.</label>
  <label className="flex gap-3 text-sm"><input name="privacy" type="checkbox" required className="mt-1 h-4 w-4"/>{en?"I accept the ":"J'accepte la "}<Link href="/confidentialite" target="_blank" className="font-bold text-leaf">{en?"privacy policy":"politique de confidentialite"}</Link>.</label>
</>}
