import Link from "next/link";
import GeoFields from "./GeoFields";
export default function SignupFields(){return <>
  <label className="grid gap-2 text-sm font-bold">Nom complet<input name="full_name" required minLength={2} className="admin-input"/></label>
  <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input"/></label>
  <label className="grid gap-2 text-sm font-bold">Telephone WhatsApp<input name="whatsapp_phone" type="tel" required className="admin-input" placeholder="+229..."/></label>
  <GeoFields/>
  <label className="grid gap-2 text-sm font-bold">Mot de passe<input name="password" type="password" minLength={8} required className="admin-input"/></label>
  <label className="grid gap-2 text-sm font-bold">Confirmation du mot de passe<input name="password_confirmation" type="password" minLength={8} required className="admin-input"/></label>
  <label className="flex gap-3 text-sm"><input name="terms" type="checkbox" required className="mt-1 h-4 w-4"/>J'accepte les conditions generales.</label>
  <label className="flex gap-3 text-sm"><input name="privacy" type="checkbox" required className="mt-1 h-4 w-4"/>J'accepte la <Link href="/confidentialite" target="_blank" className="font-bold text-leaf">politique de confidentialite</Link>.</label>
</>}

